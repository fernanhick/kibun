import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // --- Auth: extract user from JWT ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const jwt = authHeader.replace("Bearer ", "");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: { user }, error: authError } = await adminClient.auth.getUser(jwt);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userId = user.id;

    // --- Parse request body ---
    const body = await req.json();
    const { report_type, profile } = body;

    if (!report_type || !["weekly", "monthly"].includes(report_type)) {
      return new Response(
        JSON.stringify({ error: "missing_fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // --- Duplicate report prevention ---
    const periodDays = report_type === "weekly" ? 7 : 30;
    const periodCutoff = new Date();
    periodCutoff.setDate(periodCutoff.getDate() - periodDays);

    const { data: existingReport } = await adminClient
      .from("ai_reports")
      .select("*")
      .eq("user_id", userId)
      .eq("report_type", report_type)
      .gte("created_at", periodCutoff.toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingReport) {
      return new Response(
        JSON.stringify(existingReport),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // --- Query mood entries for the period ---
    const entryCutoff = new Date();
    entryCutoff.setDate(entryCutoff.getDate() - periodDays);

    const { data: entries, error: entriesError } = await adminClient
      .from("mood_entries")
      .select("mood, note, check_in_slot, logged_at")
      .eq("user_id", userId)
      .gte("logged_at", entryCutoff.toISOString())
      .order("logged_at", { ascending: true });

    if (entriesError) {
      console.error("[generate-report] mood_entries query failed:", entriesError.message);
      return new Response(
        JSON.stringify({ error: "storage_failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!entries || entries.length === 0) {
      return new Response(
        JSON.stringify({ report: null, reason: "no_entries" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // --- Build OpenAI prompt ---
    const moodLines = entries.map((e: { mood: string; check_in_slot: string; logged_at: string; note: string | null }) => {
      const date = e.logged_at.split("T")[0];
      const note = e.note ? ` (note: ${e.note})` : "";
      return `${date} ${e.check_in_slot}: ${e.mood}${note}`;
    });

    const profileContext = profile
      ? [
          profile.name ? `Name: ${profile.name}` : null,
          profile.ageRange ? `Age range: ${profile.ageRange}` : null,
          profile.employment ? `Employment: ${profile.employment}` : null,
          profile.workSetting ? `Work setting: ${profile.workSetting}` : null,
          profile.sleepHours ? `Sleep: ${profile.sleepHours}` : null,
          profile.exercise ? `Exercise: ${profile.exercise}` : null,
          profile.socialFrequency ? `Social frequency: ${profile.socialFrequency}` : null,
          profile.stressLevel ? `Stress level: ${profile.stressLevel}` : null,
          profile.goals?.length ? `Goals: ${profile.goals.join(", ")}` : null,
        ]
          .filter(Boolean)
          .join("\n")
      : "";

    const periodStart = entries[0].logged_at.split("T")[0];
    const periodEnd = entries[entries.length - 1].logged_at.split("T")[0];
    const userName = profile?.name || "this user";

    const systemMessage =
      "You are a warm, insightful mood analyst for the kibun app. " +
      "Generate a personalized mood report. Be supportive, specific, and actionable. " +
      "Use the user's name if provided. Keep the report concise (200-300 words). " +
      "Structure as: 1) Summary of mood patterns, 2) Notable observations, " +
      "3) One gentle, actionable suggestion.";

    const userMessage = [
      `Report type: ${report_type}`,
      `Period: ${periodStart} to ${periodEnd}`,
      `\nMood check-ins (${entries.length} entries):`,
      moodLines.join("\n"),
      profileContext ? `\nUser profile:\n${profileContext}` : "",
      `\nGenerate a ${report_type} mood report for ${userName}.`,
    ].join("\n");

    // --- Call OpenAI API ---
    let reportContent: string;
    try {
      const openaiResponse = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
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
            temperature: 0.7,
            max_tokens: 500,
          }),
        },
      );

      if (!openaiResponse.ok) {
        console.error("[generate-report] OpenAI API error:", openaiResponse.status);
        return new Response(
          JSON.stringify({ error: "ai_unavailable" }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const openaiData = await openaiResponse.json();
      reportContent = openaiData.choices?.[0]?.message?.content ?? "";

      if (!reportContent) {
        console.error("[generate-report] OpenAI returned empty content");
        return new Response(
          JSON.stringify({ error: "ai_unavailable" }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    } catch (err) {
      console.error("[generate-report] OpenAI fetch failed:", err);
      return new Response(
        JSON.stringify({ error: "ai_unavailable" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // --- Build mood summary ---
    const moodCounts: Record<string, number> = {};
    for (const e of entries) {
      moodCounts[e.mood] = (moodCounts[e.mood] ?? 0) + 1;
    }
    const topMoods = Object.entries(moodCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([moodId, count]) => ({ moodId, count }));

    const uniqueDays = new Set(entries.map((e: { logged_at: string }) => e.logged_at.split("T")[0]));
    const avgEntriesPerDay =
      uniqueDays.size > 0
        ? Math.round((entries.length / uniqueDays.size) * 10) / 10
        : 0;

    const moodSummary = {
      totalEntries: entries.length,
      topMoods,
      avgEntriesPerDay,
    };

    // --- Insert report ---
    const { data: insertedReport, error: insertError } = await adminClient
      .from("ai_reports")
      .insert({
        user_id: userId,
        report_type,
        period_start: periodStart,
        period_end: periodEnd,
        content: reportContent,
        mood_summary: moodSummary,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[generate-report] Insert failed:", insertError.message);
      return new Response(
        JSON.stringify({ error: "storage_failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // --- Send push notification (fire-and-forget) ---
    // Only notify on NEW reports — not on the duplicate-report early-return path above.
    const pushToken = user.user_metadata?.expo_push_token as string | undefined;
    if (pushToken && typeof pushToken === "string" && pushToken.startsWith("ExponentPushToken")) {
      try {
        const pushResponse = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Accept-Encoding": "gzip, deflate",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: pushToken,
            title: "Your kibun report is ready",
            body: `Your ${report_type} mood analysis is waiting for you`,
            data: { type: "ai_report", report_type },
          }),
        });
        if (!pushResponse.ok) {
          console.error("[generate-report] Push API returned non-2xx:", pushResponse.status);
        }
      } catch (pushErr) {
        // Non-blocking: push failure does not fail report generation
        console.error("[generate-report] Push notification failed:", pushErr);
      }
    }

    return new Response(
      JSON.stringify(insertedReport),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[generate-report] Unhandled error:", err);
    return new Response(
      JSON.stringify({ error: "internal_error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
