import { AppState, Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import * as StoreReview from 'expo-store-review';
import type { MoodGroup } from '@constants/moods';
import { useReviewPromptStore } from '@store/reviewPromptStore';
import { useOnboardingGateStore } from '@store/onboardingGateStore';
import { useMoodEntryStore } from '@store/moodEntryStore';
import { useCustomMoodsStore } from '@store/customMoodsStore';
import { getMoodDef } from '@lib/moodUtils';
import { trackEvent } from '@lib/analytics';
import { SUPPORT_EMAIL, APP_STORE_ID, PLAY_STORE_PACKAGE } from '@constants/legal';

/**
 * Ratings, per both stores' rules.
 *
 * There is deliberately NO custom pre-prompt here. Asking "how's kibun going?"
 * and routing the unhappy answers to email instead of the store is review
 * gating, and it is the specific pattern both platforms name:
 *
 *   - Google Play (In-App Review API): don't ask the user any question before
 *     or while presenting the review flow, including opinion questions such as
 *     "do you like the app?", and don't trigger the flow from a button.
 *   - Apple (App Store Review Guideline 1.1.7): use the provided API; custom
 *     review prompts are disallowed. The API is likewise not to be wired to a
 *     control whose purpose is to summon it.
 *
 * So the automatic path calls the OS review flow directly at a delight moment,
 * and the explicit "Rate kibun" row in Settings deep-links to the store's
 * write-review page instead of invoking the in-app API.
 *
 * Targeting still happens — it just happens on our side, using signals we
 * already hold rather than by interrogating the user. `checkReviewEligibility`
 * only lets an ask through when the most recent check-in was a positive mood,
 * which is a choice of moment, not a satisfaction filter.
 */

/**
 * Where an ask originated. Everything except `settings` is a "delight moment"
 * — a point where the user has just been handed something — and goes through
 * the eligibility gate. `settings` is the user asking us, so it bypasses it.
 */
export type ReviewPromptSource =
  | 'achievement_unlock'
  | 'streak_milestone'
  | 'entry_milestone'
  | 'ai_report_ready'
  | 'exercise_complete'
  | 'settings';

const DAY = 24 * 60 * 60 * 1000;

// Someone has to have actually used the app before their opinion of it means
// anything. These sit on top of the platform's own throttling, not instead of it.
const MIN_DAYS_SINCE_FIRST_SEEN = 3;
const MIN_MOOD_ENTRIES = 5;

// Store-ask budget, mirroring the platform's own rule rather than inventing a
// stricter one. iOS caps SKStoreReviewController at 3 displays per 365 days;
// there is no reason for us to be permanently silent after 3 asks ever, which
// is what the old lifetime cap did.
const MAX_STORE_ASKS_PER_YEAR = 3;
const MIN_DAYS_BETWEEN_STORE_ASKS = 120;

// Someone who has just written in with feedback is not someone to ask for a
// rating. Timed from the feedback itself — the old cooldown keyed off
// `lastAskedAt`, which the Settings feedback row never set, so it did nothing.
const MIN_DAYS_AFTER_NEGATIVE_FEEDBACK = 90;

// Delight moments that fire off a saved entry — at most one ask per entry, see
// `notifyEntryLogged`. `5` matches MIN_MOOD_ENTRIES so the earliest possible
// ask lands on the very entry that first clears the gate.
//
// Before these existed the ONLY automatic trigger was an achievement unlock,
// and the earliest achievement needs a 7-day unbroken streak — so the prompt
// was unreachable before day 7 for all but a few percent of installs.
const ENTRY_MILESTONES = new Set([5, 12, 25, 50]);
const STREAK_MILESTONES = new Set([3, 7, 14, 30]);

// Mood groups we treat as a good moment to ask. `neutral` (Tired, Bored) and
// both negative groups are excluded deliberately: in a mood tracker, putting a
// rating sheet in front of someone moments after they log Angry is how you buy
// a one-star review. Custom moods carry the same `group`, so they resolve too.
const POSITIVE_MOOD_GROUPS = new Set<MoodGroup>(['green']);

// Setting this to true while developing skips the time-based gates so the flow
// can be exercised on a fresh install. Always commit as `false`.
const DEV_BYPASS_TIME_GATES = false;

type EligibilityResult =
  | { eligible: true }
  | { eligible: false; reason: string };

/** Group of the most recently logged mood, or null when there is none. */
function latestMoodGroup(): MoodGroup | null {
  // Both mutation paths keep `entries` newest-first (addEntry prepends,
  // mergeRemoteEntries sorts descending), so index 0 is the latest check-in.
  const latest = useMoodEntryStore.getState().entries[0];
  if (!latest) return null;
  return getMoodDef(latest.moodId, useCustomMoodsStore.getState().moods)?.group ?? null;
}

/**
 * Segmentation attached to every review event. Without it the funnel is
 * unreadable — you can see that asks are rare but not which gate starves them.
 */
function reviewContext(): Record<string, unknown> {
  const mood = useMoodEntryStore.getState();
  const { firstSeenAt, storeAsksAt } = useReviewPromptStore.getState();
  return {
    entryCount: mood.entries.length,
    streakDays: mood.getStreak(),
    daysSinceInstall: firstSeenAt ? Math.floor((Date.now() - firstSeenAt) / DAY) : null,
    moodGroup: latestMoodGroup(),
    storeAskCount: storeAsksAt.length,
  };
}

export function checkReviewEligibility(): EligibilityResult {
  // Timers and awaited chains resolve whether or not anyone is looking. Without
  // this the prompt gets "shown" (and counted) against a backgrounded app, then
  // appears cold on the next resume, detached from the moment that earned it.
  if (AppState.currentState !== 'active') return { eligible: false, reason: 'app_not_active' };

  const onboarding = useOnboardingGateStore.getState();
  if (!onboarding._hasHydrated) return { eligible: false, reason: 'onboarding_not_hydrated' };
  if (!onboarding.complete) return { eligible: false, reason: 'onboarding_incomplete' };

  const review = useReviewPromptStore.getState();
  if (!review._hasHydrated) return { eligible: false, reason: 'review_not_hydrated' };
  if (review.hasReachedStore) return { eligible: false, reason: 'already_rated' };

  const now = Date.now();
  const lastStoreAsk = review.storeAsksAt[review.storeAsksAt.length - 1] ?? null;
  const asksThisYear = review.storeAsksAt.filter((t) => now - t < 365 * DAY).length;

  if (asksThisYear >= MAX_STORE_ASKS_PER_YEAR) {
    return { eligible: false, reason: 'yearly_cap_reached' };
  }

  if (!DEV_BYPASS_TIME_GATES) {
    if (review.firstSeenAt && now - review.firstSeenAt < MIN_DAYS_SINCE_FIRST_SEEN * DAY) {
      return { eligible: false, reason: 'too_new' };
    }
    if (lastStoreAsk && now - lastStoreAsk < MIN_DAYS_BETWEEN_STORE_ASKS * DAY) {
      return { eligible: false, reason: 'too_recent' };
    }
    if (review.lastFeedbackAt && now - review.lastFeedbackAt < MIN_DAYS_AFTER_NEGATIVE_FEEDBACK * DAY) {
      return { eligible: false, reason: 'feedback_cooldown' };
    }
  }

  const mood = useMoodEntryStore.getState();
  if (!mood._hasHydrated) return { eligible: false, reason: 'entries_not_hydrated' };
  if (mood.entries.length < MIN_MOOD_ENTRIES) {
    return { eligible: false, reason: 'not_enough_entries' };
  }

  const group = latestMoodGroup();
  if (!group || !POSITIVE_MOOD_GROUPS.has(group)) {
    return { eligible: false, reason: 'mood_not_positive' };
  }

  return { eligible: true };
}

// ─── Event bus ────────────────────────────────────────────────────────────────
// Lightweight pub/sub so non-UI code (stores, lib functions) can request the
// modal without dragging a navigation/render dependency in. The modal mounted
// at the root layout subscribes once. The modal — not the emitter — owns
// presentation timing, so callers fire the instant the moment happens.
type Listener = (source: ReviewPromptSource) => void;
const listeners = new Set<Listener>();

export const reviewPromptEvents = {
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  emit(source: ReviewPromptSource): void {
    for (const l of listeners) l(source);
  },
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Checks eligibility and, if passing, asks the mounted modal to appear.
 * Safe to call from anywhere — never throws, always returns void.
 */
export function maybePromptReview(source: ReviewPromptSource): void {
  const result = checkReviewEligibility();
  trackEvent('review_prompt_eligible_check', {
    source,
    eligible: result.eligible,
    reason: result.eligible ? undefined : result.reason,
    ...reviewContext(),
  });
  if (!result.eligible) return;
  reviewPromptEvents.emit(source);
}

/**
 * Called once per saved mood entry that unlocked nothing. Entries that DID
 * unlock an achievement go to the celebration instead, which raises the ask
 * itself once the user has dismissed the badge.
 *
 * At most one ask per entry, the rarer milestone first.
 */
export function notifyEntryLogged(params: {
  entryCount: number;
  streakDays: number;
}): void {
  const { entryCount, streakDays } = params;

  let source: ReviewPromptSource | null = null;
  if (STREAK_MILESTONES.has(streakDays)) source = 'streak_milestone';
  else if (ENTRY_MILESTONES.has(entryCount)) source = 'entry_milestone';

  if (source) maybePromptReview(source);
}

export type StoreReviewOutcome = 'sheet' | 'fallback' | 'unavailable';

/**
 * Requests the OS review flow, falling back to the store's write-review page
 * when the native API is unavailable so the ask is never simply swallowed.
 *
 * The `sheet` outcome is unverifiable by design: iOS gives no callback and
 * silently no-ops past its own 3-per-365-days cap, in TestFlight, and when the
 * user has turned In-App Ratings & Reviews off. Only `fallback` is observable.
 */
export async function openStoreReview(source: ReviewPromptSource): Promise<StoreReviewOutcome> {
  trackEvent('review_store_requested', { source, ...reviewContext() });

  try {
    const isAvailable = await StoreReview.isAvailableAsync();
    if (isAvailable) {
      await StoreReview.requestReview();
      return 'sheet';
    }
  } catch (error) {
    if (__DEV__) console.warn('[kibun:review] StoreReview.requestReview failed:', error);
  }

  const fallbackUrl = getStoreFallbackUrl();
  if (fallbackUrl) {
    try {
      await Linking.openURL(fallbackUrl);
      trackEvent('review_store_fallback_opened', { source });
      return 'fallback';
    } catch (error) {
      if (__DEV__) console.warn('[kibun:review] store fallback link failed:', error);
    }
  }
  return 'unavailable';
}

/**
 * The automatic path, driven by ReviewPromptGate once the user is back on a
 * safe route. Deliberately not invoked from the tap that finished whatever
 * earned it — the gate's delay is what keeps this a moment rather than a
 * response to a button.
 */
export async function presentReviewRequest(source: ReviewPromptSource): Promise<void> {
  const { recordStoreAsk, markReachedStore } = useReviewPromptStore.getState();
  recordStoreAsk();
  if ((await openStoreReview(source)) === 'fallback') markReachedStore();
}

/**
 * The explicit "Rate kibun" entry in Settings. Opens the store's write-review
 * page rather than the in-app review flow: both platforms are clear that the
 * in-app API must not be triggered by a button, and a deep link is the
 * sanctioned way to honour a deliberate request to go and rate.
 *
 * It is also the only path where we learn anything for certain — the user
 * really did land somewhere a review can be written — so this is where
 * `markReachedStore` belongs.
 */
export async function openWriteReviewPage(source: ReviewPromptSource): Promise<boolean> {
  const url = getStoreFallbackUrl();
  if (!url) return false;

  const { recordStoreAsk, markReachedStore } = useReviewPromptStore.getState();
  trackEvent('review_write_page_opened', { source, ...reviewContext() });

  try {
    await Linking.openURL(url);
    recordStoreAsk();
    markReachedStore();
    return true;
  } catch (error) {
    if (__DEV__) console.warn('[kibun:review] write-review link failed:', error);
    return false;
  }
}

/**
 * Opens the system mail composer to the support address with subject and body
 * prefilled. Marks the negative-feedback flag so we don't re-prompt for 90d.
 */
export async function openSupportFeedback(source: ReviewPromptSource): Promise<void> {
  useReviewPromptStore.getState().recordFeedback();
  trackEvent('review_feedback_opened', { source });

  const appVersion = Constants.expoConfig?.version ?? 'unknown';
  const subject = encodeURIComponent('kibun feedback');
  const body = encodeURIComponent(
    `\n\n\n— — —\nApp: kibun ${appVersion}\nPlatform: ${Platform.OS} ${Platform.Version}\nSource: ${source}`
  );
  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;

  try {
    const canOpen = await Linking.canOpenURL(mailto);
    if (canOpen) {
      await Linking.openURL(mailto);
      return;
    }
  } catch (error) {
    if (__DEV__) console.warn('[kibun:review] mailto open failed:', error);
  }
  // No mail client: fall back to copying the address to the URL bar will not
  // help. The Settings screen still shows the address as text in this case.
}

function getStoreFallbackUrl(): string | null {
  if (Platform.OS === 'ios') {
    if (!APP_STORE_ID) return null;
    return `itms-apps://itunes.apple.com/app/id${APP_STORE_ID}?action=write-review`;
  }
  return `market://details?id=${PLAY_STORE_PACKAGE}`;
}
