import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type AppLanguage = "en" | "es";

function toSupportedLanguage(value: unknown): AppLanguage {
  if (typeof value !== "string") return "en";
  const normalized = value.toLowerCase();
  if (normalized.startsWith("es")) return "es";
  return "en";
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
    const jwt = authHeader.replace("Bearer ", "");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

    if (!openaiApiKey) {
      console.error("[generate-annual-report] OPENAI_API_KEY secret is not set");
      return new Response(
        JSON.stringify({ error: "ai_unavailable" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: { user }, error: authError } = await adminClient.auth.getUser(jwt);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userId = user.id;

    // Subscription gate
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

    const today = new Date().toISOString().split('T')[0];
    const yearStart = `${today.split('-')[0]}-01-01`;

    // Cache check: one annual report per year
    const { data: cached } = await adminClient
      .from('ai_reports')
      .select('id, content')
      .eq('user_id', userId)
      .eq('report_type', 'annual')
      .eq('period_start', yearStart)
      .maybeSingle();

    if (cached) {
      return new Response(
        JSON.stringify({ narrative: cached.content }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Parse client-computed stats from request body
    const body = await req.json();
    const {
      totalCheckIns,
      topMoods,
      emotionalRange,
      longestStreak,
      bestMonth,
      worstMonth,
    }: {
      totalCheckIns: number;
      topMoods: { label: string; count: number }[];
      emotionalRange: number;
      longestStreak: number;
      bestMonth: string;
      worstMonth: string;
    } = body;
    const language = toSupportedLanguage(body?.language);

    if (!totalCheckIns || totalCheckIns < 10) {
      return new Response(
        JSON.stringify({ error: 'insufficient_data' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const statsContext = [
      `Total check-ins this year: ${totalCheckIns}`,
      `Most logged moods: ${topMoods.slice(0, 3).map((m) => `${m.label} (${m.count}x)`).join(', ')}`,
      `Emotional range: used ${emotionalRange} distinct moods`,
      `Longest streak: ${longestStreak} days`,
      `Best month: ${bestMonth}`,
      `Hardest month: ${worstMonth}`,
    ].join('\n');

    const prompt = language === "es"
      ? `Eres un acompanante de bienestar calido y reflexivo que resume el ano de seguimiento emocional de una persona.
  Con estas estadisticas, escribe una narrativa personalizada de 3 frases con tono reflexivo y alentador.
  Enfocate en crecimiento, patrones y resiliencia. No uses vietas. Maximo 80 palabras.

  Estadisticas:
  ${statsContext}`
      : `You are a warm, thoughtful wellness companion summarising a user's year of mood tracking.
  Based on the following stats, write a personalised 3-sentence narrative that feels reflective and encouraging.
  Focus on growth, patterns, and resilience. Do not use bullet points. Keep it under 80 words.

  Stats:
  ${statsContext}`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 120,
        temperature: 0.8,
      }),
    });

    if (!openaiResponse.ok) {
      console.error(`[generate-annual-report] OpenAI API error: ${openaiResponse.status}`);
      return new Response(
        JSON.stringify({ error: "ai_unavailable" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const openaiData = await openaiResponse.json();
    const narrative = openaiData.choices?.[0]?.message?.content?.trim() ?? '';

    const { error: insertError } = await adminClient.from('ai_reports').insert({
      user_id: userId,
      report_type: 'annual',
      period_start: yearStart,
      period_end: today,
      content: narrative,
      mood_summary: { totalEntries: totalCheckIns, topMoods, avgEntriesPerDay: 0 },
    });

    if (insertError) {
      console.error('[generate-annual-report] cache insert failed:', insertError);
    }

    return new Response(
      JSON.stringify({ narrative }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
