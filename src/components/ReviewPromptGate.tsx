import { useDeferredPresentation } from '@hooks/useDeferredPresentation';
import {
  reviewPromptEvents,
  presentReviewRequest,
  type ReviewPromptSource,
} from '@lib/reviewPrompt';
import { trackEvent } from '@lib/analytics';

// Long enough that the review flow reads as its own moment rather than a
// response to the button that finished whatever earned it — which is the
// distinction both stores draw. Also lets the navigation transition settle, so
// the OS sheet isn't animating in over a screen still animating out.
const PRESENT_DELAY_MS = 1500;

// A queued ask that never found a safe moment goes stale. Better to drop it
// than to surface it minutes later with no connection to what earned it.
const PENDING_TTL_MS = 3 * 60 * 1000;

function reportExpired(source: ReviewPromptSource): void {
  trackEvent('review_prompt_expired', { source });
}

/**
 * Headless. Owns *when* the OS review flow is asked for — never whether the
 * user deserves to be asked (that is `checkReviewEligibility`) and never any
 * UI of its own (see the compliance note at the top of `@lib/reviewPrompt`).
 *
 * Mounted once at the root layout.
 */
export function ReviewPromptGate() {
  useDeferredPresentation<ReviewPromptSource>({
    subscribe: reviewPromptEvents.subscribe,
    onPresent: presentReviewRequest,
    onExpire: reportExpired,
    delayMs: PRESENT_DELAY_MS,
    ttlMs: PENDING_TTL_MS,
  });

  return null;
}
