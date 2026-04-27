// Seed a demo account with 180 days of realistic data for App Store screenshots.
//
// Usage (PowerShell or bash, from repo root):
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//   DEMO_EMAIL=fernanhick+demo@gmail.com DEMO_PASSWORD=... \
//   node scripts/seed-screenshot-user.mjs
//
// Idempotent: if a user already exists for DEMO_EMAIL, all their data is wiped
// and the user is recreated, so re-running gives a clean reseed.

import { createClient } from '@supabase/supabase-js';

// ─── Env validation ───────────────────────────────────────────────────────────
const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMAIL = process.env.DEMO_EMAIL;
const PASSWORD = process.env.DEMO_PASSWORD;

if (!SUPABASE_URL || !SERVICE_KEY || !EMAIL || !PASSWORD) {
  console.error(
    'Missing env. Required: SUPABASE_URL (or EXPO_PUBLIC_SUPABASE_URL), ' +
      'SUPABASE_SERVICE_ROLE_KEY, DEMO_EMAIL, DEMO_PASSWORD',
  );
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Constants matching src/constants/moods.ts ────────────────────────────────
const MOODS = {
  // green
  happy:     { color: '#66BB6A', group: 'green',       sentiment: 'positive', score: 0.85 },
  excited:   { color: '#C6E82B', group: 'green',       sentiment: 'positive', score: 0.92 },
  grateful:  { color: '#81C784', group: 'green',       sentiment: 'positive', score: 0.88 },
  calm:      { color: '#80DEEA', group: 'green',       sentiment: 'positive', score: 0.70 },
  // neutral
  meh:       { color: '#BDBDBD', group: 'neutral',     sentiment: 'neutral',  score: 0.0  },
  tired:     { color: '#BCAAA4', group: 'neutral',     sentiment: 'neutral',  score: -0.1 },
  bored:     { color: '#B0BEC5', group: 'neutral',     sentiment: 'neutral',  score: -0.15 },
  confused:  { color: '#FFD54F', group: 'neutral',     sentiment: 'neutral',  score: 0.05 },
  // red-orange
  sad:        { color: '#F48FB1', group: 'red-orange', sentiment: 'negative', score: -0.7 },
  anxious:    { color: '#FFAB40', group: 'red-orange', sentiment: 'negative', score: -0.6 },
  frustrated: { color: '#FF8A65', group: 'red-orange', sentiment: 'negative', score: -0.65 },
  angry:      { color: '#EF5350', group: 'red-orange', sentiment: 'negative', score: -0.8 },
  // blue
  melancholy: { color: '#90CAF9', group: 'blue',       sentiment: 'negative', score: -0.5 },
  lonely:     { color: '#B39DDB', group: 'blue',       sentiment: 'negative', score: -0.55 },
};

const MOOD_IDS = Object.keys(MOODS);

const NOTE_BANK = {
  green: [
    'Great morning walk in the park.',
    'Feeling really centered after meditation.',
    'Coffee with a friend lifted my spirits.',
    'Productive day, made progress on the project.',
    'Beautiful sunset tonight.',
    'Workout felt amazing today.',
    'Reading before bed — so peaceful.',
    'Cooked a nice dinner from scratch.',
    'Quality time with family.',
    'Got a compliment at work today.',
  ],
  neutral: [
    'Pretty average day, nothing special.',
    'A bit foggy but okay.',
    'Long day, not much energy left.',
    'Just going through the motions.',
    'Need more sleep.',
    'Stuck in meetings most of the day.',
  ],
  'red-orange': [
    'Stressful deadline at work.',
    'Argument with a coworker, still ruminating.',
    'Couldn’t shake the anxiety today.',
    'Frustrated with how slow this is moving.',
    'Bad traffic, late, snowballed from there.',
    'Worried about the upcoming meeting.',
  ],
  blue: [
    'Missing my friends back home.',
    'Quiet kind of sadness today.',
    'Feeling distant from people.',
    'Reflective mood, lots on my mind.',
  ],
};

const PROMPT_BANK = [
  { prompt: 'What’s one thing that lifted your mood today?',
    response: 'A long walk after work cleared my head and reminded me to slow down.' },
  { prompt: 'What’s weighing on you right now?',
    response: 'The deadline next week is making me anxious. Trying to break it into smaller pieces.' },
  { prompt: 'What are you grateful for today?',
    response: 'My partner cooked dinner without being asked. Small things really do add up.' },
  { prompt: 'When did you feel most yourself today?',
    response: 'During my morning meditation — it felt like everything else quieted down.' },
  { prompt: 'What’s a small win from today?',
    response: 'Finally hit inbox zero. Took two hours but it feels great.' },
  { prompt: 'What boundary do you wish you had held today?',
    response: 'I said yes to another late meeting when I really needed the evening to myself.' },
  { prompt: 'What’s one kind thing you can do for yourself this week?',
    response: 'Block off Saturday morning for absolutely nothing. No plans, no obligations.' },
  { prompt: 'What pattern have you noticed in your moods lately?',
    response: 'Mondays are consistently rough. Maybe Sunday evenings need more wind-down time.' },
  { prompt: 'What did your body need today?',
    response: 'Sleep. I powered through on caffeine but I can feel the deficit.' },
  { prompt: 'What’s something you can let go of?',
    response: 'The argument from yesterday. It’s not worth carrying into a new week.' },
  { prompt: 'Who made you feel seen today?',
    response: 'My therapist. The session reminded me I’ve been making real progress.' },
  { prompt: 'What’s one thing you’d tell yourself a year ago?',
    response: 'You’re going to be okay. The thing you’re afraid of isn’t the disaster you think it is.' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function rand(min, max) { return Math.random() * (max - min) + min; }
function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
function pick(arr) { return arr[randInt(0, arr.length - 1)]; }
function chance(p) { return Math.random() < p; }

function isoAt(year, month, day, hour, minute) {
  // month is 1-based here
  return new Date(Date.UTC(year, month - 1, day, hour, minute, 0)).toISOString();
}

function dateString(year, month, day) {
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

// ─── Mood selection logic ─────────────────────────────────────────────────────
// Realistic distribution with weekly rhythm and occasional rough patches.
function pickMoodForDay(dayIndex, dayOfWeek) {
  // Roughness pulses: a 5-day stressful stretch every ~30 days
  const inRoughPatch = (dayIndex % 30) >= 22 && (dayIndex % 30) <= 26;

  // Weekly rhythm bias
  let weights;
  if (inRoughPatch) {
    weights = { green: 0.20, neutral: 0.25, 'red-orange': 0.40, blue: 0.15 };
  } else if (dayOfWeek === 1) {
    // Monday: tireder
    weights = { green: 0.40, neutral: 0.40, 'red-orange': 0.15, blue: 0.05 };
  } else if (dayOfWeek === 5 || dayOfWeek === 6) {
    // Fri/Sat: best
    weights = { green: 0.70, neutral: 0.15, 'red-orange': 0.10, blue: 0.05 };
  } else if (dayOfWeek === 0) {
    // Sunday: calm but slight blue tint
    weights = { green: 0.55, neutral: 0.20, 'red-orange': 0.10, blue: 0.15 };
  } else {
    weights = { green: 0.55, neutral: 0.20, 'red-orange': 0.15, blue: 0.10 };
  }

  const r = Math.random();
  let acc = 0;
  let chosenGroup = 'green';
  for (const [g, w] of Object.entries(weights)) {
    acc += w;
    if (r <= acc) { chosenGroup = g; break; }
  }
  const candidates = MOOD_IDS.filter((id) => MOODS[id].group === chosenGroup);
  return pick(candidates);
}

function energyFocusForMood(mood) {
  const g = MOODS[mood].group;
  if (g === 'green') return { energy: randInt(3, 5), focus: randInt(3, 5) };
  if (g === 'neutral') return { energy: randInt(2, 4), focus: randInt(2, 4) };
  if (g === 'red-orange') return { energy: randInt(1, 3), focus: randInt(1, 3) };
  return { energy: randInt(1, 3), focus: randInt(2, 3) }; // blue
}

const SLOTS = [
  { name: 'morning',   hour: 8,  jitter: 90 },
  { name: 'afternoon', hour: 14, jitter: 120 },
  { name: 'night',     hour: 20, jitter: 60 },
  { name: 'pre_sleep', hour: 23, jitter: 40 },
];

// ─── Step 0: Find or recreate user ────────────────────────────────────────────
async function ensureUser() {
  console.log(`[seed] Looking up existing user ${EMAIL}...`);
  // Paginate through users to find existing one (no direct getByEmail in admin)
  let userId = null;
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === EMAIL.toLowerCase());
    if (found) { userId = found.id; break; }
    if (data.users.length < 200) break;
    page += 1;
  }

  if (userId) {
    console.log(`[seed] Found existing user ${userId} — deleting for clean reseed.`);
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) throw error;
  }

  console.log('[seed] Creating user...');
  const { data, error } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { seeded: true, purpose: 'app-store-screenshots' },
  });
  if (error) throw error;
  console.log(`[seed] Created user ${data.user.id}`);
  return data.user.id;
}

// ─── Step 1: Profile ──────────────────────────────────────────────────────────
async function seedProfile(userId) {
  console.log('[seed] Seeding profile...');
  const { error } = await admin.from('profiles').upsert({
    user_id: userId,
    name: 'Riley',
    age_range: '25-34',
    gender: 'prefer_not_to_say',
    employment: 'full_time',
    work_setting: 'hybrid',
    work_hours: 'standard',
    sleep_hours: '6-7',
    exercise: 'few_times_week',
    social_frequency: 'weekly',
    stress_level: 'moderate',
    goals: ['reduce_stress', 'better_sleep', 'self_awareness', 'emotional_balance'],
    subscription_status: 'active',
  });
  if (error) throw error;
}

// ─── Step 2: Notification preferences ────────────────────────────────────────
async function seedNotificationPrefs(userId) {
  console.log('[seed] Seeding notification preferences...');
  const { error } = await admin.from('notification_preferences').upsert({
    user_id: userId,
    selected_slots: ['morning', 'afternoon', 'night'],
    permission_granted: true,
    streak_nudge_enabled: true,
    custom_times: { morning: '08:00', afternoon: '14:00', night: '20:30' },
  });
  if (error) throw error;
}

// ─── Step 3: Custom moods ─────────────────────────────────────────────────────
async function seedCustomMoods(userId) {
  console.log('[seed] Seeding custom moods...');
  const rows = [
    { id: 'custom_cozy01', user_id: userId, label: 'Cozy', color: '#FFCDD2', mood_group: 'green' },
    { id: 'custom_drnd02', user_id: userId, label: 'Drained', color: '#90A4AE', mood_group: 'blue' },
  ];
  const { error } = await admin.from('custom_moods').insert(rows);
  if (error) throw error;
}

// ─── Step 4: Habits + habit_logs ──────────────────────────────────────────────
async function seedHabitsAndLogs(userId, days) {
  console.log('[seed] Seeding habits...');
  const habits = [
    { name: 'Meditate',   icon: '🧘', tracking_type: 'boolean', display_order: 0, completionRate: 0.78 },
    { name: 'Workout',    icon: '💪', tracking_type: 'boolean', display_order: 1, completionRate: 0.55 },
    { name: 'Read',       icon: '📖', tracking_type: 'scale',   display_order: 2, completionRate: 0.72 },
    { name: 'Drink water', icon: '💧', tracking_type: 'scale',   display_order: 3, completionRate: 0.85 },
    { name: 'Sleep 8h',   icon: '😴', tracking_type: 'boolean', display_order: 4, completionRate: 0.60 },
  ];

  const habitInserts = habits.map((h) => ({
    user_id: userId,
    name: h.name,
    icon: h.icon,
    tracking_type: h.tracking_type,
    display_order: h.display_order,
  }));
  const { data: insertedHabits, error: habitErr } = await admin
    .from('habits')
    .insert(habitInserts)
    .select();
  if (habitErr) throw habitErr;

  // Map back to completionRate
  const habitsById = insertedHabits.map((row, i) => ({ ...row, completionRate: habits[i].completionRate, tracking_type: habits[i].tracking_type }));

  console.log('[seed] Seeding habit logs...');
  const logs = [];
  for (const day of days) {
    const dateStr = dateString(day.year, day.month, day.day);
    for (const h of habitsById) {
      if (!chance(h.completionRate)) continue;
      let value;
      if (h.tracking_type === 'boolean') {
        value = 1;
      } else {
        value = randInt(2, 5); // scale: skip rendering 0, lean positive
      }
      logs.push({ user_id: userId, habit_id: h.id, log_date: dateStr, value });
    }
  }
  // Insert in chunks of 500 to avoid payload limits
  for (let i = 0; i < logs.length; i += 500) {
    const chunk = logs.slice(i, i + 500);
    const { error } = await admin.from('habit_logs').insert(chunk);
    if (error) throw error;
  }
  console.log(`[seed]   inserted ${logs.length} habit logs`);
}

// ─── Step 5: Life events ──────────────────────────────────────────────────────
async function seedLifeEvents(userId, days) {
  console.log('[seed] Seeding life events...');
  const last = days[days.length - 1];
  const totalDays = days.length;

  // Place 12 events relative to today, spread across the window
  const events = [
    { offset: 5,   title: 'Started a new project',    category: 'work',         notes: 'Excited but nervous about the scope.' },
    { offset: 19,  title: 'Sarah\'s birthday party',  category: 'social',       notes: 'Stayed out way too late — worth it.' },
    { offset: 33,  title: 'Weekend in the mountains', category: 'travel',       notes: 'Phone off the whole time. Reset.' },
    { offset: 48,  title: 'Annual physical',          category: 'health',       notes: 'All clear. Doctor said keep walking.' },
    { offset: 63,  title: 'Team holiday dinner',      category: 'work',         notes: null },
    { offset: 80,  title: 'Family Christmas',         category: 'relationship', notes: 'Felt grateful to be all together.' },
    { offset: 95,  title: 'Started therapy',          category: 'personal',     notes: 'First session. Anxious but glad I did it.' },
    { offset: 110, title: 'Got promoted!',            category: 'work',         notes: 'Surreal. Took the team out for drinks.' },
    { offset: 130, title: 'Ran the half marathon',    category: 'personal',     notes: 'Trained for months. Knees hurt for a week.' },
    { offset: 142, title: 'Anniversary dinner',       category: 'relationship', notes: 'Tried that new place downtown. Great night.' },
    { offset: 160, title: 'Coffee with old friend',   category: 'social',       notes: 'Hadn’t seen them in 3 years.' },
    { offset: 175, title: 'Beach weekend',            category: 'travel',       notes: 'Slept 9 hours both nights.' },
  ];

  const rows = events.map((e) => {
    const dayIdx = Math.min(e.offset, totalDays - 1);
    const d = days[dayIdx];
    return {
      user_id: userId,
      title: e.title,
      category: e.category,
      event_date: dateString(d.year, d.month, d.day),
      notes: e.notes,
    };
  });
  const { error } = await admin.from('life_events').insert(rows);
  if (error) throw error;
  console.log(`[seed]   inserted ${rows.length} life events`);
}

// ─── Step 6: Mood entries ─────────────────────────────────────────────────────
async function seedMoodEntries(userId, days) {
  console.log('[seed] Seeding mood entries...');
  const entries = [];
  let journalCount = 0;

  // Track which moods have been logged for "mood explorer" achievement
  const moodsLogged = new Set();

  for (let i = 0; i < days.length; i++) {
    const day = days[i];
    const dow = day.dow;

    // 5% of days: skip entirely (realism)
    if (chance(0.05)) continue;

    // How many slots today?
    const r = Math.random();
    let slotCount;
    if (r < 0.50) slotCount = 3;
    else if (r < 0.78) slotCount = 2;
    else if (r < 0.95) slotCount = 1;
    else slotCount = 4;

    // Always include morning + afternoon + night first; pre_sleep optional
    const slotPool = ['morning', 'afternoon', 'night', 'pre_sleep'];
    const chosen = slotPool.slice(0, slotCount);

    for (const slotName of chosen) {
      const slot = SLOTS.find((s) => s.name === slotName);
      const minute = randInt(0, slot.jitter);
      const loggedAt = isoAt(day.year, day.month, day.day, slot.hour, minute);

      const mood = pickMoodForDay(i, dow);
      moodsLogged.add(mood);
      const meta = MOODS[mood];
      const { energy, focus } = energyFocusForMood(mood);

      const wantNote = chance(0.30);
      const note = wantNote ? pick(NOTE_BANK[meta.group]) : null;

      const wantJournal = chance(0.10);
      let journal_prompt = null;
      let journal_response = null;
      if (wantJournal) {
        const j = pick(PROMPT_BANK);
        journal_prompt = j.prompt;
        journal_response = j.response;
        journalCount += 1;
      }

      // Add a small score jitter
      const score = Math.max(-1, Math.min(1, meta.score + rand(-0.08, 0.08)));

      entries.push({
        user_id: userId,
        mood,
        mood_color: meta.color,
        note,
        check_in_slot: slotName,
        logged_at: loggedAt,
        sentiment_label: meta.sentiment,
        sentiment_score: Number(score.toFixed(3)),
        energy_level: energy,
        focus_level: focus,
        journal_prompt,
        journal_response,
      });
    }
  }

  // If we somehow missed a mood (rare), force-insert one for "Mood Explorer"
  for (const m of MOOD_IDS) {
    if (!moodsLogged.has(m)) {
      const day = days[Math.floor(days.length / 2)];
      const meta = MOODS[m];
      const { energy, focus } = energyFocusForMood(m);
      entries.push({
        user_id: userId,
        mood: m,
        mood_color: meta.color,
        note: null,
        check_in_slot: 'afternoon',
        logged_at: isoAt(day.year, day.month, day.day, 15, 30),
        sentiment_label: meta.sentiment,
        sentiment_score: Number(meta.score.toFixed(3)),
        energy_level: energy,
        focus_level: focus,
        journal_prompt: null,
        journal_response: null,
      });
    }
  }

  // Ensure today and yesterday have at least one entry so streak is "active"
  const todayDay = days[days.length - 1];
  const yesterdayDay = days[days.length - 2];
  for (const d of [yesterdayDay, todayDay]) {
    const dateStr = dateString(d.year, d.month, d.day);
    const has = entries.some((e) => e.logged_at.startsWith(dateStr));
    if (!has) {
      entries.push({
        user_id: userId,
        mood: 'calm',
        mood_color: MOODS.calm.color,
        note: 'Quiet day, took it easy.',
        check_in_slot: 'morning',
        logged_at: isoAt(d.year, d.month, d.day, 8, 30),
        sentiment_label: 'positive',
        sentiment_score: 0.7,
        energy_level: 4,
        focus_level: 4,
        journal_prompt: null,
        journal_response: null,
      });
    }
  }

  // Insert in chunks of 500
  for (let i = 0; i < entries.length; i += 500) {
    const chunk = entries.slice(i, i + 500);
    const { error } = await admin.from('mood_entries').insert(chunk);
    if (error) throw error;
  }
  console.log(`[seed]   inserted ${entries.length} mood entries (${journalCount} with journal)`);
}

// ─── Step 7: Achievements ─────────────────────────────────────────────────────
async function seedAchievements(userId, days) {
  console.log('[seed] Seeding achievements...');
  // Unlock all 7 achievements on plausible historical dates
  const last = days[days.length - 1];
  const lastDate = new Date(Date.UTC(last.year, last.month - 1, last.day, 12, 0, 0));

  const offsets = {
    consistent:    -150, // 30 entries reached early
    first_week:    -170,
    early_bird:    -160,
    night_owl:     -155,
    mood_explorer: -120,
    month_warrior: -140,
    reflector:     -90,
  };
  const rows = Object.entries(offsets).map(([id, off]) => ({
    user_id: userId,
    achievement_id: id,
    unlocked_at: addDays(lastDate, off).toISOString(),
  }));
  const { error } = await admin.from('user_achievements').insert(rows);
  if (error) throw error;
  console.log(`[seed]   inserted ${rows.length} achievements`);
}

// ─── Step 8: Streak freeze ────────────────────────────────────────────────────
async function seedStreakFreeze(userId) {
  console.log('[seed] Seeding streak_freeze row for current month...');
  const now = new Date();
  const monthStart = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`;
  const { error } = await admin.from('streak_freezes').insert({
    user_id: userId,
    month: monthStart,
    freeze_used: false,
  });
  if (error) throw error;
}

// ─── Step 9: AI reports ───────────────────────────────────────────────────────
async function seedAIReports(userId, days) {
  console.log('[seed] Seeding AI reports...');
  const last = days[days.length - 1];
  const lastDate = `${last.year}-${String(last.month).padStart(2, '0')}-${String(last.day).padStart(2, '0')}`;

  const reports = [
    {
      report_type: 'weekly',
      period_start: addDaysStr(lastDate, -7),
      period_end:   addDaysStr(lastDate, -1),
      content: `## Your week at a glance\n\nThis week leaned positive overall, with **calm** and **happy** showing up most often — especially on weekend mornings. Tuesday afternoon stood out as a tougher patch with **anxious** showing twice; the journal entry around your work deadline lines up with that.\n\n### Patterns we noticed\n- Mornings were consistently your best slot (avg sentiment **+0.62**).\n- Energy dipped mid-week but recovered by Friday.\n- Tracked all 5 habits at least once — strongest streak was *Drink water* (6/7 days).\n\n### Gentle nudge\nYour pre-sleep check-ins skipped 3 days this week. Even a 10-second tap can make patterns clearer over time.\n\nKeep going — small consistency compounds.`,
      mood_summary: { dominant: 'calm', avg_score: 0.42, entries: 18 },
    },
    {
      report_type: 'weekly',
      period_start: addDaysStr(lastDate, -14),
      period_end:   addDaysStr(lastDate, -8),
      content: `## A reflective week\n\nA mixed week with more variation than usual — you logged 7 different moods. **Grateful** showed up four times, often in the evenings, suggesting your wind-down routine is doing real work for you.\n\n### What stood out\n- Two **frustrated** entries clustered around Wednesday — your note mentioned a coworker.\n- Sleep habit hit 5/7 nights, your highest in three weeks.\n- A journal entry on Sunday read *"finally feel like myself again"* — worth remembering.\n\n### Try this\nNext time frustration spikes, you might try a 5-minute breathing exercise within the same hour. Your data shows mood lifts when you log a habit alongside a tough check-in.`,
      mood_summary: { dominant: 'grateful', avg_score: 0.31, entries: 17 },
    },
    {
      report_type: 'weekly',
      period_start: addDaysStr(lastDate, -21),
      period_end:   addDaysStr(lastDate, -15),
      content: `## Steady ground\n\nYour mood was the most stable of any recent week — swings between check-ins were the smallest we've seen. **Calm** and **happy** anchored the days, with no entries in the **angry** range.\n\n### Highlights\n- 6 days in a row with at least one positive check-in.\n- Workout habit logged 4 times — each one followed by a higher-energy afternoon entry.\n- Average focus level: **3.8 / 5** (up from 3.2 last week).\n\nYou're building real signal here. Keep showing up.`,
      mood_summary: { dominant: 'calm', avg_score: 0.55, entries: 19 },
    },
    {
      report_type: 'monthly',
      period_start: firstOfMonth(lastDate, -1),
      period_end:   lastOfMonth(lastDate, -1),
      content: `## Your month, summarized\n\nA strong month overall. You logged on **27 of 31 days** (87% — your best month yet) and explored 11 of 14 moods. The standout shift: your *afternoon slump* gradually softened as the month progressed, possibly tied to consistency on the **Drink water** and **Workout** habits.\n\n### The data behind it\n- Most common mood: **calm** (24% of entries).\n- Toughest stretch: a 5-day cluster mid-month with elevated **anxious** — aligned with the work deadline you noted.\n- Strongest correlation: days with a logged workout averaged **+0.4 higher sentiment** than days without.\n- Journal entries written: 8 (your highest monthly count).\n\n### What this might mean\nYour evenings are your secret weapon. Across the whole month, **night** check-ins averaged **+0.51**, materially higher than mornings. Whatever you're doing in your wind-down — keep doing it.\n\n### Suggested focus for next month\nThe gap between your best and worst weeks suggests sleep is the lever. Three of your four lowest-energy days followed nights you didn't track sleep. Maybe try one small experiment: phone out of the bedroom for two weeks.`,
      mood_summary: { dominant: 'calm', avg_score: 0.38, entries: 27, days_logged: 27 },
    },
  ];

  // Stagger created_at so the list ordering looks natural (most recent first)
  const baseDate = new Date(Date.UTC(last.year, last.month - 1, last.day, 6, 0, 0));
  const rows = reports.map((r, i) => ({
    user_id: userId,
    report_type: r.report_type,
    period_start: r.period_start,
    period_end:   r.period_end,
    content:      r.content,
    mood_summary: r.mood_summary,
    created_at:   addDays(baseDate, -i * 3).toISOString(),
  }));
  const { error } = await admin.from('ai_reports').insert(rows);
  if (error) throw error;
  console.log(`[seed]   inserted ${rows.length} AI reports`);
}

function addDaysStr(yyyymmdd, n) {
  const [y, m, d] = yyyymmdd.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + n);
  return date.toISOString().slice(0, 10);
}

function firstOfMonth(yyyymmdd, monthOffset) {
  const [y, m] = yyyymmdd.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1 + monthOffset, 1));
  return date.toISOString().slice(0, 10);
}

function lastOfMonth(yyyymmdd, monthOffset) {
  const [y, m] = yyyymmdd.split('-').map(Number);
  const date = new Date(Date.UTC(y, m + monthOffset, 0));
  return date.toISOString().slice(0, 10);
}

// ─── Build the day index ──────────────────────────────────────────────────────
function buildDays(totalDays) {
  // Use the user's "today" (2026-04-24 per project context). Let the script
  // anchor to the host clock at runtime so it stays current.
  const today = new Date();
  // Anchor to UTC midnight for stable date strings
  const anchor = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const days = [];
  for (let i = totalDays - 1; i >= 0; i--) {
    const d = addDays(anchor, -i);
    days.push({
      year: d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      day: d.getUTCDate(),
      dow: d.getUTCDay(), // 0 = Sunday
    });
  }
  return days;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const TOTAL_DAYS = 180;
  const days = buildDays(TOTAL_DAYS);
  console.log(`[seed] Window: ${dateString(days[0].year, days[0].month, days[0].day)} → ${dateString(days[days.length-1].year, days[days.length-1].month, days[days.length-1].day)} (${TOTAL_DAYS} days)`);

  const userId = await ensureUser();

  await seedProfile(userId);
  await seedNotificationPrefs(userId);
  await seedCustomMoods(userId);
  await seedHabitsAndLogs(userId, days);
  await seedLifeEvents(userId, days);
  await seedMoodEntries(userId, days);
  await seedAchievements(userId, days);
  await seedStreakFreeze(userId);
  await seedAIReports(userId, days);

  console.log('\n[seed] Done.');
  console.log(`[seed] Demo user: ${EMAIL}`);
  console.log(`[seed] User ID:   ${userId}`);
}

main().catch((err) => {
  console.error('[seed] FAILED:', err);
  process.exit(1);
});
