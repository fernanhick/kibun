// Seed habit_logs for the Apple review / screenshot account so the Insights →
// Patterns → "Habits & Mood" section shows real correlations instead of
// "No pattern yet".
//
// Why this exists: the review account has 500+ mood entries but almost no habit
// logs, and src/lib/correlations.ts needs MIN_LOGS_FOR_CORRELATION (5) logs per
// habit before it will report anything. It also derives avgSkip from explicit
// `value: 0` rows — without them it falls back to the global mean and every
// correlation flattens toward zero. So this writes BOTH done and skipped days.
//
// Logs are generated from the account's OWN mood history: a habit is more
// likely to be marked done on days the user actually logged better moods, which
// is what makes the resulting correlation genuine rather than decorative.
//
// Usage (from repo root):
//   node scripts/seed-review-habit-logs.mjs          # write
//   node scripts/seed-review-habit-logs.mjs --dry    # report only

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

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
const EMAIL = process.env.EXPO_PUBLIC_DEV_TESTER_EMAIL;
const PASSWORD = process.env.EXPO_PUBLIC_DEV_TESTER_PASSWORD;
const DRY = process.argv.includes('--dry');

if (!SUPABASE_URL || !ANON_KEY) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

if (!EMAIL || !PASSWORD) {
  console.error(
    'Missing EXPO_PUBLIC_DEV_TESTER_EMAIL / EXPO_PUBLIC_DEV_TESTER_PASSWORD in .env. ' +
      'These used to be hardcoded here; see docs/testing-accounts.md.',
  );
  process.exit(1);
}

// Must match src/constants/moods.ts and src/lib/insights.ts GROUP_SCORES.
const MOOD_GROUP = {
  happy: 'green', excited: 'green', grateful: 'green', bright: 'green',
  cheeky: 'green', loved: 'green', surprised: 'green', calm: 'green',
  tired: 'neutral', bored: 'neutral', confused: 'neutral',
  sad: 'red-orange', worried: 'red-orange', scared: 'red-orange',
  frustrated: 'red-orange', angry: 'red-orange',
  melancholy: 'blue', lonely: 'blue',
};
const GROUP_SCORES = { green: 4, neutral: 3, blue: 2, 'red-orange': 1 };

// How tightly each habit tracks mood. Deliberately varied — a set where every
// habit is a strong positive looks fabricated.
const COUPLING = {
  default: 0.72,
  byName: {
    'Sleep quality': 0.50,
    Exercise: 0.72,
    Meditated: 0.70,
    Socialised: 0.55,
    Alcohol: -0.45,
  },
};

// Day-to-day noise. Without a generous amount of it the scale habit correlates
// at r≈0.9, which no real habit does — it reads as fabricated rather than
// convincing. This keeps the signal visible but human.
const SCALE_NOISE = 2.5;

// Deterministic RNG so re-runs are reproducible.
let seed = 20260909;
function rand() {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}

const supabase = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data: signIn, error: signInErr } = await supabase.auth.signInWithPassword({
    email: EMAIL, password: PASSWORD,
  });
  if (signInErr) {
    console.error(`[seed] sign-in failed: ${signInErr.message}`);
    process.exit(2);
  }
  const userId = signIn.user.id;
  console.log(`[seed] signed in as ${EMAIL} (${userId})`);

  const { data: habits, error: hErr } = await supabase
    .from('habits').select('id, name, tracking_type').eq('user_id', userId);
  if (hErr) throw hErr;
  if (!habits?.length) {
    console.error('[seed] no habits on this account — create some in-app first.');
    process.exit(3);
  }
  console.log(`[seed] habits: ${habits.map((h) => `${h.name} (${h.tracking_type})`).join(', ')}`);

  // Pull every mood entry, paging past PostgREST's default 1000-row cap.
  let entries = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('mood_entries').select('mood, logged_at')
      .eq('user_id', userId).range(from, from + 999);
    if (error) throw error;
    entries = entries.concat(data);
    if (data.length < 1000) break;
  }
  console.log(`[seed] mood entries: ${entries.length}`);

  // Daily average mood score, exactly as correlations.ts computes it.
  const byDate = {};
  for (const e of entries) {
    const date = e.logged_at.split('T')[0];
    const group = MOOD_GROUP[e.mood];
    (byDate[date] ??= []).push(group ? GROUP_SCORES[group] : 3);
  }
  const dailyAvg = {};
  for (const [d, s] of Object.entries(byDate)) {
    dailyAvg[d] = s.reduce((a, b) => a + b, 0) / s.length;
  }
  const dates = Object.keys(dailyAvg).sort();
  const globalMean = Object.values(dailyAvg).reduce((a, b) => a + b, 0) / dates.length;
  console.log(`[seed] ${dates.length} active days, mean daily mood ${globalMean.toFixed(2)} / 4`);

  const rows = [];
  for (const habit of habits) {
    const coupling = COUPLING.byName[habit.name] ?? COUPLING.default;
    for (const date of dates) {
      // Normalised mood for the day: -1 (worst) … +1 (best)
      const norm = (dailyAvg[date] - globalMean) / 1.5;
      if (habit.tracking_type === 'scale') {
        const target = 3 + coupling * norm * 2 + (rand() - 0.5) * SCALE_NOISE;
        rows.push({ user_id: userId, habit_id: habit.id, log_date: date,
                    value: Math.max(1, Math.min(5, Math.round(target))) });
      } else {
        const p = Math.max(0.04, Math.min(0.96, 0.5 + coupling * norm * 0.9));
        rows.push({ user_id: userId, habit_id: habit.id, log_date: date,
                    value: rand() < p ? 1 : 0 });
      }
    }
  }

  // Report the correlation each habit will produce, using correlations.ts maths.
  for (const habit of habits) {
    const mine = rows.filter((r) => r.habit_id === habit.id);
    let r;
    if (habit.tracking_type === 'scale') {
      const xs = mine.map((l) => l.value);
      const ys = mine.map((l) => dailyAvg[l.log_date]);
      const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
      const my = ys.reduce((a, b) => a + b, 0) / ys.length;
      let num = 0, dx = 0, dy = 0;
      for (let i = 0; i < xs.length; i++) {
        num += (xs[i] - mx) * (ys[i] - my);
        dx += (xs[i] - mx) ** 2; dy += (ys[i] - my) ** 2;
      }
      r = num / Math.sqrt(dx * dy);
    } else {
      const done = mine.filter((l) => l.value === 1).map((l) => dailyAvg[l.log_date]);
      const skip = mine.filter((l) => l.value === 0).map((l) => dailyAvg[l.log_date]);
      const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
      r = (avg(done) - (skip.length ? avg(skip) : globalMean)) / 3;
    }
    const abs = Math.abs(r);
    const label = abs >= 0.5 ? 'STRONG' : abs >= 0.3 ? 'moderate' : abs >= 0.1 ? 'weak' : 'NO PATTERN';
    console.log(`[seed]   ${habit.name.padEnd(15)} r=${r.toFixed(3)}  ${label} ${r >= 0 ? 'positive' : 'negative'}  (${mine.length} logs)`);
  }

  if (DRY) {
    console.log(`[seed] --dry: would upsert ${rows.length} rows. Nothing written.`);
    return;
  }

  // There is no unique constraint on (habit_id, log_date), so upsert has no
  // conflict target to use. Replace this user's logs wholesale instead — scoped
  // to user_id so it can never reach another account's rows.
  const { error: delErr } = await supabase
    .from('habit_logs').delete().eq('user_id', userId);
  if (delErr) throw delErr;
  console.log('[seed] cleared existing habit_logs for this user');

  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await supabase.from('habit_logs').insert(rows.slice(i, i + 500));
    if (error) throw error;
  }
  console.log(`[seed] inserted ${rows.length} habit logs.`);
}

main().catch((e) => { console.error('[seed] failed:', e.message ?? e); process.exit(1); });
