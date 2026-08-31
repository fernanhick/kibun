import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

type AppLanguage = "en" | "es" | "pt" | "de";

function toSupportedLanguage(value: unknown): AppLanguage {
  if (typeof value !== "string") return "en";
  const normalized = value.toLowerCase();
  if (normalized.startsWith("es")) return "es";
  if (normalized.startsWith("pt")) return "pt";
  if (normalized.startsWith("de")) return "de";
  return "en";
}

// Human-readable target language. The prompt scaffolding stays in English; the
// model is told to write all user-facing output in this language. Add a locale
// here (+ toSupportedLanguage above) and every AI surface follows automatically.
const LANGUAGE_NAMES: Record<AppLanguage, string> = {
  en: "English",
  es: "Spanish",
  pt: "Brazilian Portuguese",
  de: "German",
};

// Localized "weekly"/"monthly" — used ONLY for the deterministic (non-AI) push body.
const REPORT_TYPE_LABEL: Record<AppLanguage, Record<"weekly" | "monthly", string>> = {
  en: { weekly: "weekly", monthly: "monthly" },
  es: { weekly: "semanal", monthly: "mensual" },
  pt: { weekly: "semanal", monthly: "mensal" },
  de: { weekly: "wöchentliche", monthly: "monatliche" },
};

// Deterministic "report ready" push copy (not model-generated).
function getPushCopy(language: AppLanguage, reportType: "weekly" | "monthly") {
  const label = REPORT_TYPE_LABEL[language][reportType];
  switch (language) {
    case "es":
      return {
        title: "Tu reporte de kibun esta listo",
        body: `Tu analisis emocional ${label} te esta esperando`,
      };
    case "pt":
      return {
        title: "Seu resumo do kibun está pronto",
        body: `Sua análise de humor ${label} está esperando por você`,
      };
    case "de":
      return {
        title: "Dein kibun-Bericht ist fertig",
        body: `Deine ${label} Stimmungsanalyse wartet auf dich`,
      };
    default:
      return {
        title: "Your kibun report is ready",
        body: `Your ${reportType} mood analysis is waiting for you`,
      };
  }
}

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

    // --- Subscription gate ---
    const { data: profileRow } = await adminClient
      .from('profiles')
      .select('subscription_status')
      .eq('user_id', userId)
      .maybeSingle();

    const subStatus = profileRow?.subscription_status ?? 'none';
    if (subStatus !== 'active' && subStatus !== 'trial') {
      return new Response(
        JSON.stringify({ error: 'subscription_required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // --- Parse request body ---
    const body = await req.json();
    const { report_type, profile } = body;
    const language = toSupportedLanguage(body?.language);

    if (!report_type || !["weekly", "monthly"].includes(report_type)) {
      return new Response(
        JSON.stringify({ error: "missing_fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const reportType = report_type as "weekly" | "monthly";

    // --- Duplicate report prevention ---
    const periodDays = reportType === "weekly" ? 7 : 30;
    const periodCutoff = new Date();
    periodCutoff.setDate(periodCutoff.getDate() - periodDays);

    // Language is part of the cache key: a report written in English is not a
    // cache hit for a user now reading Spanish. Legacy rows have language NULL
    // and deliberately match nothing, so they regenerate once.
    const { data: existingReport } = await adminClient
      .from("ai_reports")
      .select("*")
      .eq("user_id", userId)
      .eq("report_type", reportType)
      .eq("language", language)
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
    // Raw user notes are intentionally excluded from the OpenAI payload to
    // honor the privacy commitment that note text never leaves the device.
    // Only mood label, slot, and date are sent.
    const moodLines = entries.map((e: { mood: string; check_in_slot: string; logged_at: string }) => {
      const date = e.logged_at.split("T")[0];
      return `${date} ${e.check_in_slot}: ${e.mood}`;
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

    // --- Habit data: completion rates + mood correlations for the period ---
    const { data: habits } = await adminClient
      .from("habits")
      .select("id, name, tracking_type")
      .eq("user_id", userId)
      .order("display_order", { ascending: true });

    const { data: habitLogs } = await adminClient
      .from("habit_logs")
      .select("habit_id, log_date, value")
      .eq("user_id", userId)
      .gte("log_date", periodStart);

    const habitSummaryLines: string[] = [];
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

      for (const habit of habits as { id: string; name: string; tracking_type: string }[]) {
        const hLogs = (
          habitLogs as { habit_id: string; log_date: string; value: number }[]
        ).filter((l) => l.habit_id === habit.id);
        if (hLogs.length === 0) continue;

        // Completion stat
        let statStr = "";
        if (habit.tracking_type === "boolean") {
          const doneCount = hLogs.filter((l) => l.value === 1).length;
          const uniqueDays = new Set(hLogs.map((l) => l.log_date)).size;
          const pct = Math.round((doneCount / Math.max(uniqueDays, 1)) * 100);
          statStr = `${pct}% done (${doneCount}/${uniqueDays} days)`;
        } else {
          const avg = hLogs.reduce((s, l) => s + l.value, 0) / hLogs.length;
          statStr = `avg ${avg.toFixed(1)}/5 over ${hLogs.length} logs`;
        }

        // Pearson correlation with daily mood score
        const logsWithMood = hLogs.filter((l) => dailyAvg[l.log_date] !== undefined);
        let corrStr = "";
        if (logsWithMood.length >= 5) {
          let r = 0;
          if (habit.tracking_type === "scale") {
            r = pearsonR(
              logsWithMood.map((l) => l.value),
              logsWithMood.map((l) => dailyAvg[l.log_date]),
            );
          } else {
            const done = logsWithMood
              .filter((l) => l.value === 1)
              .map((l) => dailyAvg[l.log_date]);
            const skip = logsWithMood
              .filter((l) => l.value === 0)
              .map((l) => dailyAvg[l.log_date]);
            if (done.length >= 3) {
              const avgDone = done.reduce((a, b) => a + b, 0) / done.length;
              const avgSkip =
                skip.length > 0
                  ? skip.reduce((a, b) => a + b, 0) / skip.length
                  : allDayAvg;
              r = (avgDone - avgSkip) / 3;
            }
          }
          if (Math.abs(r) >= 0.2) {
            corrStr =
              r > 0
                ? `, tends to coincide with better moods (r=${r.toFixed(2)})`
                : `, tends to coincide with lower moods (r=${r.toFixed(2)})`;
          }
        }

        habitSummaryLines.push(`${habit.name}: ${statStr}${corrStr}`);
      }
    }

    const languageName = LANGUAGE_NAMES[language];
    const systemMessage =
      "You are a warm, insightful mood analyst for the kibun app. " +
      "Generate a personalized mood report as a JSON object that the client " +
      "will render into rich UI sections. Be supportive, specific, and actionable. " +
      "Use the user's name when natural. Keep prose concise - the whole report " +
      "should read in under 60 seconds.\n\n" +
      "Return JSON with exactly these fields:\n" +
      '- "headline": string. A short, warm one-line title (max ~70 chars), e.g. "A gentle, mostly-calm week".\n' +
      '- "summary": string. 2-4 sentences of plain prose summarising the period. No markdown.\n' +
      '- "patterns": array of 2-4 strings. Each string is a single observation about timing, mood mix, trend, or notable habit correlations when relevant. No markdown, no leading bullet characters.\n' +
      '- "highlight": object or null. When notable, { "label": short phrase, "detail": one sentence of context }. Use null when nothing stands out.\n' +
      '- "nudge": object. { "title": short imperative phrase, "body": 1-2 sentences with one gentle, actionable suggestion }.\n' +
      '- "tone": one of "positive" | "neutral" | "mixed" | "tough". Best characterisation of the period overall.\n' +
      "Output JSON only - do not wrap in markdown fences.\n\n" +
      `Write every user-facing string value (headline, summary, each entry in patterns, ` +
      `highlight.label, highlight.detail, nudge.title, nudge.body) in ${languageName}. ` +
      `Keep all JSON keys in English, and return the "tone" value as one of the exact ` +
      `English enum words listed above (do not translate it).`;

    const userMessage = [
      `Report type: ${reportType}`,
      `Period: ${periodStart} to ${periodEnd}`,
      `\nMood check-ins (${entries.length} entries):`,
      moodLines.join("\n"),
      profileContext ? `\nUser profile:\n${profileContext}` : "",
      habitSummaryLines.length > 0
        ? `\nHabit tracking (${habitSummaryLines.length} habit${
            habitSummaryLines.length > 1 ? "s" : ""
          }):\n` + habitSummaryLines.join("\n")
        : "",
      `\nGenerate a ${reportType} mood report for ${userName} as the JSON object described.`,
    ].filter((s) => s !== "").join("\n");

    // --- Call OpenAI API ---
    let reportContent: string;
    let structured: Record<string, unknown> | null = null;
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
            max_tokens: 700,
            response_format: { type: "json_object" },
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
      const rawContent: string = openaiData.choices?.[0]?.message?.content ?? "";

      if (!rawContent) {
        console.error("[generate-report] OpenAI returned empty content");
        return new Response(
          JSON.stringify({ error: "ai_unavailable" }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Parse + lightly validate the structured payload. If anything is off,
      // we fall through to a markdown-rendered version of whatever prose
      // fields we can salvage so the client never sees a blank report.
      try {
        const parsed = JSON.parse(rawContent);
        if (parsed && typeof parsed === "object") {
          structured = sanitizeStructured(parsed);
        }
      } catch (parseErr) {
        console.error("[generate-report] JSON parse failed:", parseErr);
      }

      reportContent = structured
        ? renderStructuredAsMarkdown(structured, language)
        : rawContent;
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
        report_type: reportType,
        period_start: periodStart,
        period_end: periodEnd,
        content: reportContent,
        structured,
        mood_summary: moodSummary,
        language,
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
        const pushCopy = getPushCopy(language, reportType);
        const pushResponse = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Accept-Encoding": "gzip, deflate",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: pushToken,
            title: pushCopy.title,
            body: pushCopy.body,
            data: { type: "ai_report", report_type: reportType },
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

// --- Helpers ----------------------------------------------------------------

const ALLOWED_TONES = new Set(["positive", "neutral", "mixed", "tough"]);

function asString(value: unknown, max = 500): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

function sanitizeStructured(raw: Record<string, unknown>): Record<string, unknown> | null {
  const headline = asString(raw.headline, 120);
  const summary = asString(raw.summary, 800);
  const patternsRaw = Array.isArray(raw.patterns) ? raw.patterns : [];
  const patterns = patternsRaw
    .map((p) => asString(p, 240))
    .filter((p): p is string => !!p)
    .slice(0, 6);

  let highlight: { label: string; detail: string } | null = null;
  if (raw.highlight && typeof raw.highlight === "object") {
    const h = raw.highlight as Record<string, unknown>;
    const label = asString(h.label, 60);
    const detail = asString(h.detail, 240);
    if (label && detail) highlight = { label, detail };
  }

  let nudge: { title: string; body: string } | null = null;
  if (raw.nudge && typeof raw.nudge === "object") {
    const n = raw.nudge as Record<string, unknown>;
    const title = asString(n.title, 80);
    const body = asString(n.body, 320);
    if (title && body) nudge = { title, body };
  }

  const toneRaw = asString(raw.tone, 16);
  const tone = toneRaw && ALLOWED_TONES.has(toneRaw) ? toneRaw : "neutral";

  // Need at least summary + nudge for the rich layout to be worth using.
  if (!summary || !nudge) return null;

  return {
    headline,
    summary,
    patterns,
    highlight,
    nudge,
    tone,
    schemaVersion: 1,
  };
}

// Localized header for the markdown fallback copy stored alongside `structured`.
// The model-generated labels (highlight/nudge) are already in-language; only this
// fixed section header needs translating.
const PATTERNS_HEADER: Record<AppLanguage, string> = {
  en: "Patterns we noticed",
  es: "Patrones que notamos",
  pt: "Padrões que percebemos",
  de: "Muster, die uns aufgefallen sind",
};

function renderStructuredAsMarkdown(s: Record<string, unknown>, language: AppLanguage): string {
  const lines: string[] = [];
  if (s.headline) lines.push(`## ${s.headline}`);
  if (s.summary) lines.push("", String(s.summary));
  const patterns = Array.isArray(s.patterns) ? (s.patterns as string[]) : [];
  if (patterns.length) {
    lines.push("", `### ${PATTERNS_HEADER[language]}`);
    for (const p of patterns) lines.push(`- ${p}`);
  }
  if (s.highlight && typeof s.highlight === "object") {
    const h = s.highlight as { label: string; detail: string };
    lines.push("", `### ${h.label}`, h.detail);
  }
  if (s.nudge && typeof s.nudge === "object") {
    const n = s.nudge as { title: string; body: string };
    lines.push("", `### ${n.title}`, n.body);
  }
  return lines.join("\n").trim();
}
