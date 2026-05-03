import { Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import * as StoreReview from 'expo-store-review';
import { useReviewPromptStore } from '@store/reviewPromptStore';
import { useOnboardingGateStore } from '@store/onboardingGateStore';
import { useMoodEntryStore } from '@store/moodEntryStore';
import { trackEvent } from '@lib/analytics';
import { SUPPORT_EMAIL, APP_STORE_ID, PLAY_STORE_PACKAGE } from '@constants/legal';

export type ReviewPromptSource = 'achievement_unlock' | 'settings';

const DAY = 24 * 60 * 60 * 1000;

// Eligibility windows. Tuned conservatively — the OS-level review sheet
// (SKStoreReviewController on iOS) is itself rate-limited to ~3x/year, so
// these gates exist to keep our custom pre-prompt from being annoying.
const MIN_DAYS_SINCE_FIRST_SEEN = 3;
const MIN_DAYS_BETWEEN_ASKS = 60;
const MIN_DAYS_AFTER_NEGATIVE_FEEDBACK = 90;
const MIN_MOOD_ENTRIES = 5;
const LIFETIME_ASK_CAP = 3;

// Setting this to true while developing skips the time-based gates so the
// modal can be exercised on a fresh install. Always commit as `false`.
const DEV_BYPASS_TIME_GATES = false;

type EligibilityResult =
  | { eligible: true }
  | { eligible: false; reason: string };

export function checkReviewEligibility(): EligibilityResult {
  const onboarding = useOnboardingGateStore.getState();
  if (!onboarding._hasHydrated) return { eligible: false, reason: 'onboarding_not_hydrated' };
  if (!onboarding.complete) return { eligible: false, reason: 'onboarding_incomplete' };

  const review = useReviewPromptStore.getState();
  if (!review._hasHydrated) return { eligible: false, reason: 'review_not_hydrated' };
  if (review.hasRatedHint) return { eligible: false, reason: 'already_rated' };
  if (review.askedCount >= LIFETIME_ASK_CAP) return { eligible: false, reason: 'cap_reached' };

  const now = Date.now();

  if (!DEV_BYPASS_TIME_GATES) {
    if (review.firstSeenAt && now - review.firstSeenAt < MIN_DAYS_SINCE_FIRST_SEEN * DAY) {
      return { eligible: false, reason: 'too_new' };
    }
    if (review.lastAskedAt && now - review.lastAskedAt < MIN_DAYS_BETWEEN_ASKS * DAY) {
      return { eligible: false, reason: 'too_recent' };
    }
    if (
      review.hasGivenFeedback &&
      review.lastAskedAt &&
      now - review.lastAskedAt < MIN_DAYS_AFTER_NEGATIVE_FEEDBACK * DAY
    ) {
      return { eligible: false, reason: 'feedback_cooldown' };
    }
  }

  const entryCount = useMoodEntryStore.getState().entries.length;
  if (entryCount < MIN_MOOD_ENTRIES) return { eligible: false, reason: 'not_enough_entries' };

  return { eligible: true };
}

// ─── Event bus ────────────────────────────────────────────────────────────────
// Lightweight pub/sub so non-UI code (stores, lib functions) can request the
// modal without dragging a navigation/render dependency in. The modal mounted
// at the root layout subscribes once.
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
  });
  if (!result.eligible) return;
  reviewPromptEvents.emit(source);
}

/**
 * Bypasses the gate and shows the OS review sheet directly. Used by the
 * always-on Settings entry — the user explicitly asked to rate, no need to
 * pre-filter.
 */
export async function requestStoreReviewDirect(source: ReviewPromptSource): Promise<void> {
  const { recordAsked, markRatedHint } = useReviewPromptStore.getState();
  recordAsked();
  markRatedHint();
  trackEvent('review_store_requested', { source });

  try {
    const isAvailable = await StoreReview.isAvailableAsync();
    if (isAvailable) {
      await StoreReview.requestReview();
      return;
    }
  } catch (error) {
    if (__DEV__) console.warn('[kibun:review] StoreReview.requestReview failed:', error);
  }

  // Fallback: deep-link to the store's write-review page.
  const fallbackUrl = getStoreFallbackUrl();
  if (fallbackUrl) {
    Linking.openURL(fallbackUrl).catch(() => {});
  }
}

/**
 * Opens the system mail composer to the support address with subject and body
 * prefilled. Marks the negative-feedback flag so we don't re-prompt for 90d.
 */
export async function openSupportFeedback(source: ReviewPromptSource): Promise<void> {
  useReviewPromptStore.getState().markFeedbackGiven();
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
