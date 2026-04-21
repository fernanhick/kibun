import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GROUP_SCORES: Record<string, number> = {
  green: 4, neutral: 3, blue: 2, "red-orange": 1,
};

const MOOD_GROUPS: Record<string, string> = {
  happy: "green", excited: "green", grateful: "green", calm: "green",
  meh: "neutral", tired: "neutral", bored: "neutral", confused: "neutral",
  sad: "red-orange", anxious: "red-orange", frustrated: "red-orange", angry: "red-orange",
  melancholy: "blue", lonely: "blue",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: { user }, error: authError } = await adminClient.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userId = user.id;

    // Subscription gate
    const { data: profileRow } = await adminClient
      .from("profiles")
      .select("subscription_status")
      .eq("user_id", userId)
      .maybeSingle();

    const subStatus = profileRow?.subscription_status ?? "none";
    if (subStatus !== "active" && subStatus !== "trial") {
      return new Response(
        JSON.stringify({ error: "subscription_required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Return cached insight if one exists for today
    const today = new Date().toISOString().split("T")[0];
    const { data: cached } = await adminClient
      .from("ai_reports")
      .select("content")
      .eq("user_id", userId)
      .eq("report_type", "daily")
      .eq("period_start", today)
      .maybeSingle();

    if (cached) {
      return new Response(
        JSON.stringify({ insight: cached.content }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fetch last 14 days of mood entries
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 14);

    const { data: entries, error: entriesError } = await adminClient
      .from("mood_entries")
      .select("mood, check_in_slot, logged_at")
      .eq("user_id", userId)
      .gte("logged_at", cutoff.toISOString())
      .order("logged_at", { ascending: true });

    if (entriesError || !entries || entries.length < 3) {
      return new Response(
        JSON.stringify({ insight: null, reason: "insufficient_data" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Top moods summary
    const moodCounts: Record<string, number> = {};
    for (const e of entries) {
      moodCounts[e.mood] = (moodCounts[e.mood] ?? 0) + 1;
    }
    const topMoods = Object.entries(moodCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([mood, count]) => `${mood} (${count}x)`)
      .join(", ");

    // Trend: compare first-half avg score to second-half avg score
    const mid = Math.floor(entries.length / 2);
    const avgScore = (list: typeof entries) =>
      list.reduce((s, e) => s + (GROUP_SCORES[MOOD_GROUPS[e.mood]] ?? 3), 0) / list.length;
    const trendDiff = avgScore(entries.slice(mid)) - avgScore(entries.slice(0, mid));
    const trend = trendDiff > 0.3 ? "improving" : trendDiff < -0.3 ? "declining" : "stable";

    const latestMood = entries[entries.length - 1]?.mood ?? "unknown";

    // Profile context from request body
    const body = await req.json().catch(() => ({}));
    const { profile } = body;
    const profileLines = profile
      ? [
          profile.name ? `Name: ${profile.name}` : null,
          profile.goals?.length ? `Goals: ${profile.goals.join(", ")}` : null,
          profile.stressLevel ? `Stress baseline: ${profile.stressLevel}` : null,
        ].filter(Boolean).join("\n")
      : "";

    const systemMessage =
      "You are a warm, perceptive daily companion for the Kibun mood tracking app. " +
      "Generate exactly 2 short sentences: one specific observation about the user's recent mood pattern, " +
      "and one gentle encouragement or nudge relevant to today. " +
      "Reference actual mood names and time patterns when relevant. " +
      "Be conversational and uplifting, never clinical or generic. " +
      "Do not open with 'I notice' or 'It looks like'. No bullet points or headers.";

    const userMessage = [
      `Top moods (last 14 days): ${topMoods}`,
      `Overall trend: ${trend}`,
      `Most recent mood: ${latestMood}`,
      `Total check-ins: ${entries.length}`,
      profileLines ? `\nProfile:\n${profileLines}` : "",
      "\nGenerate exactly 2 sentences of personalized daily insight.",
    ].filter(Boolean).join("\n");

    let insight: string;
    try {
      const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemMessage },
            { role: "user", content: userMessage },
          ],
          temperature: 0.75,
          max_tokens: 120,
        }),
      });

      if (!openaiRes.ok) {
        console.error("[generate-daily-insight] OpenAI error:", openaiRes.status);
        return new Response(
          JSON.stringify({ error: "ai_unavailable" }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const openaiData = await openaiRes.json();
      insight = (openaiData.choices?.[0]?.message?.content ?? "").trim();
      if (!insight) {
        return new Response(
          JSON.stringify({ error: "ai_unavailable" }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    } catch (err) {
      console.error("[generate-daily-insight] fetch failed:", err);
      return new Response(
        JSON.stringify({ error: "ai_unavailable" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Cache the insight for today
    await adminClient.from("ai_reports").insert({
      user_id: userId,
      report_type: "daily",
      period_start: today,
      period_end: today,
      content: insight,
      mood_summary: null,
    });

    return new Response(
      JSON.stringify({ insight }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[generate-daily-insight] unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "internal_error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
