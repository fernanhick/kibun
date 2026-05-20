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

type AppLanguage = "en" | "es";

function toSupportedLanguage(value: unknown): AppLanguage {
  if (typeof value !== "string") return "en";
  const normalized = value.toLowerCase();
  if (normalized.startsWith("es")) return "es";
  return "en";
}

function pearsonR(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 2) return 0;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, sdX = 0, sdY = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY);
    sdX += (xs[i] - meanX) ** 2;
    sdY += (ys[i] - meanY) ** 2;
  }
  const denom = Math.sqrt(sdX * sdY);
  return denom === 0 ? 0 : num / denom;
}

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
    const language = toSupportedLanguage(body?.language);
    const profileLines = profile
      ? [
          profile.name ? `Name: ${profile.name}` : null,
          profile.goals?.length ? `Goals: ${profile.goals.join(", ")}` : null,
          profile.stressLevel ? `Stress baseline: ${profile.stressLevel}` : null,
        ].filter(Boolean).join("\n")
      : "";

    // --- Habit data: today's completions + mood correlations ---
    const { data: habits } = await adminClient
      .from("habits")
      .select("id, name, tracking_type")
      .eq("user_id", userId)
      .order("display_order", { ascending: true });

    const { data: habitLogs } = await adminClient
      .from("habit_logs")
      .select("habit_id, log_date, value")
      .eq("user_id", userId)
      .gte("log_date", cutoff.toISOString().split("T")[0]);

    let habitContext = "";
    if (habits && habits.length > 0 && habitLogs && habitLogs.length > 0) {
      // Build daily mood avg for correlation computation
      const dailyMoodSum: Record<string, number> = {};
      const dailyMoodCnt: Record<string, number> = {};
      for (const e of entries) {
        const date = e.logged_at.split("T")[0];
        const score = GROUP_SCORES[MOOD_GROUPS[e.mood]] ?? 3;
        dailyMoodSum[date] = (dailyMoodSum[date] ?? 0) + score;
        dailyMoodCnt[date] = (dailyMoodCnt[date] ?? 0) + 1;
      }
      const dailyAvg: Record<string, number> = {};
      for (const date of Object.keys(dailyMoodSum)) {
        dailyAvg[date] = dailyMoodSum[date] / dailyMoodCnt[date];
      }
      const allDayAvg =
        Object.values(dailyAvg).length > 0
          ? Object.values(dailyAvg).reduce((a, b) => a + b, 0) /
            Object.values(dailyAvg).length
          : 3;

      // Today's completed habits
      const todayDoneNames = (
        habitLogs as { habit_id: string; log_date: string; value: number }[]
      )
        .filter((l) => l.log_date === today && l.value > 0)
        .map(
          (l) =>
            (habits as { id: string; name: string }[]).find(
              (h) => h.id === l.habit_id,
            )?.name,
        )
        .filter(Boolean) as string[];

      // Pearson correlation per habit over the 14-day window
      type HabitCorr = { name: string; r: number };
      const correlations: HabitCorr[] = [];
      for (const habit of habits as {
        id: string;
        name: string;
        tracking_type: string;
      }[]) {
        const hLogs = (
          habitLogs as { habit_id: string; log_date: string; value: number }[]
        ).filter(
          (l) => l.habit_id === habit.id && dailyAvg[l.log_date] !== undefined,
        );
        if (hLogs.length < 5) continue;

        let r = 0;
        if (habit.tracking_type === "scale") {
          r = pearsonR(
            hLogs.map((l) => l.value),
            hLogs.map((l) => dailyAvg[l.log_date]),
          );
        } else {
          const done = hLogs
            .filter((l) => l.value === 1)
            .map((l) => dailyAvg[l.log_date]);
          const skip = hLogs
            .filter((l) => l.value === 0)
            .map((l) => dailyAvg[l.log_date]);
          if (done.length < 3) continue;
          const avgDone = done.reduce((a, b) => a + b, 0) / done.length;
          const avgSkip =
            skip.length > 0
              ? skip.reduce((a, b) => a + b, 0) / skip.length
              : allDayAvg;
          r = (avgDone - avgSkip) / 3;
        }
        if (Math.abs(r) >= 0.1) correlations.push({ name: habit.name, r });
      }
      correlations.sort((a, b) => b.r - a.r);

      const topPositive = correlations.filter((c) => c.r >= 0.3).slice(0, 2);
      const topNegative = correlations.filter((c) => c.r <= -0.3).slice(0, 1);

      const habitParts: string[] = [];
      if (todayDoneNames.length > 0) {
        habitParts.push(`Habits completed today: ${todayDoneNames.join(", ")}`);
      }
      if (topPositive.length > 0) {
        habitParts.push(
          `Habits with positive mood correlation: ${topPositive.map((c) => c.name).join(", ")}`,
        );
      }
      if (topNegative.length > 0) {
        habitParts.push(
          `Habits with negative mood correlation: ${topNegative.map((c) => c.name).join(", ")}`,
        );
      }
      if (habitParts.length > 0) {
        habitContext = "\nHabit data:\n" + habitParts.join("\n");
      }
    }

    const systemMessage = language === "es"
      ? "Eres un acompanante diario calido y perspicaz para la app de seguimiento de animo Kibun. " +
        "Genera exactamente 2 frases cortas: una observacion especifica sobre el patron emocional reciente de la persona, " +
        "y un aliento o sugerencia suave para hoy. " +
        "Haz referencia a nombres de animo, patrones de horario o habitos cuando aporte valor. " +
        "Usa un tono cercano y optimista, nunca clinico ni generico. " +
        "No comiences con 'Noto que' ni 'Parece que'. Sin listas ni encabezados."
      : "You are a warm, perceptive daily companion for the Kibun mood tracking app. " +
        "Generate exactly 2 short sentences: one specific observation about the user's recent mood pattern, " +
        "and one gentle encouragement or nudge relevant to today. " +
        "Reference actual mood names, time-of-day patterns, or habits when there is a meaningful connection. " +
        "Be conversational and uplifting, never clinical or generic. " +
        "Do not open with 'I notice' or 'It looks like'. No bullet points or headers.";

    const userMessage = [
      `Top moods (last 14 days): ${topMoods}`,
      `Overall trend: ${trend}`,
      `Most recent mood: ${latestMood}`,
      `Total check-ins: ${entries.length}`,
      profileLines ? `\nProfile:\n${profileLines}` : "",
      habitContext,
      language === "es"
        ? "\nGenera exactamente 2 frases de insight diario personalizado."
        : "\nGenerate exactly 2 sentences of personalized daily insight.",
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
