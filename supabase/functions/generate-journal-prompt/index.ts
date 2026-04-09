import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // --- Auth ---
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

    // --- Parse request body ---
    const body = await req.json();
    const { mood_id, mood_label, mood_group, recent_entries, profile } = body;

    if (!mood_id || !mood_label) {
      return new Response(
        JSON.stringify({ error: "missing_fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // --- Build recent entries context ---
    const recentLines = Array.isArray(recent_entries)
      ? recent_entries
          .slice(0, 5)
          .map((e: { mood: string; slot: string; logged_at: string; note?: string }) => {
            const date = e.logged_at.split("T")[0];
            const note = e.note ? ` (note: ${e.note})` : "";
            return `${date} ${e.slot}: ${e.mood}${note}`;
          })
          .join("\n")
      : "";

    // Count how many times this mood occurred in recent entries
    const sameMoodCount = Array.isArray(recent_entries)
      ? recent_entries.filter((e: { mood: string }) => e.mood === mood_id).length
      : 0;

    const profileContext = profile
      ? [
          profile.name ? `Name: ${profile.name}` : null,
          profile.stressLevel ? `Stress level: ${profile.stressLevel}` : null,
          profile.goals?.length ? `Goals: ${profile.goals.join(", ")}` : null,
          profile.sleepHours ? `Avg sleep: ${profile.sleepHours}h` : null,
        ]
          .filter(Boolean)
          .join("\n")
      : "";

    const systemMessage =
      "You are a warm, empathetic emotional wellness coach for the Kibun mood tracking app. " +
      "Generate exactly ONE open-ended reflection question based on the user's current mood and recent emotional context. " +
      "The question should be thoughtful, specific, non-judgmental, and invite genuine self-reflection. " +
      "Keep it to one sentence. Do not include quotation marks or numbering. " +
      "Do not ask about something the user cannot answer right now. " +
      "Examples of good questions: " +
      "'You have been feeling anxious several times this week — what feels most uncertain right now?' " +
      "'You are feeling calm today — what contributed to that sense of ease?' " +
      "'You logged tired again this afternoon — is there something draining your energy lately?'";

    const userMessage = [
      `Current mood: ${mood_label} (group: ${mood_group})`,
      sameMoodCount > 0
        ? `This mood has appeared ${sameMoodCount} time(s) in recent entries.`
        : "",
      recentLines ? `\nRecent mood history:\n${recentLines}` : "",
      profileContext ? `\nUser profile:\n${profileContext}` : "",
      "\nGenerate one reflection question for this user based on their current mood and context.",
    ]
      .filter(Boolean)
      .join("\n");

    // --- Call OpenAI ---
    let prompt: string;
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
            temperature: 0.8,
            max_tokens: 100,
          }),
        },
      );

      if (!openaiResponse.ok) {
        console.error("[generate-journal-prompt] OpenAI error:", openaiResponse.status);
        return new Response(
          JSON.stringify({ error: "ai_unavailable" }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const openaiData = await openaiResponse.json();
      prompt = (openaiData.choices?.[0]?.message?.content ?? "").trim();

      if (!prompt) {
        return new Response(
          JSON.stringify({ error: "ai_unavailable" }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    } catch (err) {
      console.error("[generate-journal-prompt] fetch failed:", err);
      return new Response(
        JSON.stringify({ error: "ai_unavailable" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ prompt }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[generate-journal-prompt] unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "internal_error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
