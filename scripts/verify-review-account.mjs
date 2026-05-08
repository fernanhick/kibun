// Verify the Apple review account exists and has 6 months of data.
// Read-only: signs in with the anon key and inspects what's there.
//
// Usage (from repo root):
//   node scripts/verify-review-account.mjs

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

// Load .env manually (no dotenv dep in this repo)
function loadEnv() {
  try {
    const text = readFileSync(new URL('../.env', import.meta.url), 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      const [, k, v] = m;
      if (!process.env[k]) process.env[k] = v.trim();
    }
  } catch {}
}
loadEnv();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const EMAIL = 'fernanhick+kibun-review@gmail.com';
const PASSWORD = 'Kibun-Review-2026!Sakura';

if (!SUPABASE_URL || !ANON_KEY) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log(`[verify] Project: ${SUPABASE_URL}`);
  console.log(`[verify] Email:   ${EMAIL}`);
  console.log('');

  const { data: signIn, error: signInErr } = await supabase.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD,
  });

  if (signInErr) {
    console.log(`[verify] SIGN-IN FAILED → ${signInErr.message}`);
    if (/invalid login credentials/i.test(signInErr.message)) {
      console.log('[verify] → Account does NOT exist (or password is wrong).');
    } else if (/email not confirmed/i.test(signInErr.message)) {
      console.log('[verify] → Account exists but email is unconfirmed.');
    }
    process.exit(2);
  }

  const userId = signIn.user.id;
  console.log(`[verify] SIGN-IN OK → user_id = ${userId}`);
  console.log(`[verify] email_confirmed_at = ${signIn.user.email_confirmed_at ?? 'NOT CONFIRMED'}`);
  console.log('');

  // Profile
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  console.log('[verify] profiles row:', profileErr ? `ERROR: ${profileErr.message}` : profile ? 'present' : 'missing');
  if (profile) {
    console.log(`         name=${profile.name}, subscription_status=${profile.subscription_status}, goals=${(profile.goals ?? []).length}`);
  }

  // Mood entries
  const { count: moodCount, error: moodErr } = await supabase
    .from('mood_entries')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  console.log(`[verify] mood_entries count: ${moodErr ? `ERROR ${moodErr.message}` : moodCount}`);

  // Range of mood entries
  const { data: oldest } = await supabase
    .from('mood_entries')
    .select('logged_at')
    .eq('user_id', userId)
    .order('logged_at', { ascending: true })
    .limit(1);
  const { data: newest } = await supabase
    .from('mood_entries')
    .select('logged_at')
    .eq('user_id', userId)
    .order('logged_at', { ascending: false })
    .limit(1);
  if (oldest?.[0] && newest?.[0]) {
    console.log(`[verify] mood_entries range: ${oldest[0].logged_at} → ${newest[0].logged_at}`);
  }

  // Other tables
  for (const table of ['habits', 'habit_logs', 'life_events', 'custom_moods', 'user_achievements', 'ai_reports', 'streak_freezes', 'notification_preferences']) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    console.log(`[verify] ${table.padEnd(28)} count: ${error ? `ERROR ${error.message}` : count}`);
  }

  await supabase.auth.signOut();
}

main().catch((e) => {
  console.error('[verify] FAILED:', e);
  process.exit(1);
});
