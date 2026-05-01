import {
  vexo,
  identifyDevice,
  enableTracking,
  disableTracking,
  customEvent,
} from 'vexo-analytics';

const API_KEY = process.env.EXPO_PUBLIC_VEXO_API_KEY;
// Set EXPO_PUBLIC_VEXO_FORCE_ENABLE=1 in .env to send analytics from dev
// builds (useful for verifying integration on the Vexo dashboard).
const FORCE_ENABLE = process.env.EXPO_PUBLIC_VEXO_FORCE_ENABLE === '1';

// Vexo normally runs only in production builds so the dashboard isn't polluted
// with simulator traffic. The force flag overrides that for verification.
const ANALYTICS_ENABLED = Boolean(API_KEY) && (!__DEV__ || FORCE_ENABLE);

let initialized = false;

export function initAnalytics(): void {
  if (initialized) return;
  if (!API_KEY) {
    if (__DEV__) console.warn('[kibun:analytics] no EXPO_PUBLIC_VEXO_API_KEY set — skipping init');
    return;
  }
  if (!ANALYTICS_ENABLED) {
    if (__DEV__) console.log('[kibun:analytics] dev build — skipping init (set EXPO_PUBLIC_VEXO_FORCE_ENABLE=1 to override)');
    return;
  }
  try {
    vexo(API_KEY);
    initialized = true;
    if (__DEV__) console.log('[kibun:analytics] vexo() initialized (force-enabled)');
  } catch (error) {
    if (__DEV__) {
      console.error('[kibun:analytics] vexo() init failed:', error);
    }
  }
}

// Pass the Supabase user id (anonymous or registered) so funnels can group
// sessions per user in the Vexo dashboard. Vexo treats this as an opaque token
// — no PII (email/name) is ever sent.
export function identifyAnalyticsUser(userId: string | null): void {
  if (!initialized) return;
  identifyDevice(userId).catch((error) => {
    if (__DEV__) {
      console.error('[kibun:analytics] identifyDevice failed:', error);
    }
  });
}

export function trackEvent(name: string, props: Record<string, unknown> = {}): void {
  if (!initialized) return;
  try {
    customEvent(name, props);
  } catch (error) {
    if (__DEV__) {
      console.error('[kibun:analytics] customEvent failed:', error);
    }
  }
}

export function setAnalyticsConsent(enabled: boolean): Promise<void> {
  if (!initialized) return Promise.resolve();
  return enabled ? enableTracking() : disableTracking();
}
