import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';

// ─── RevenueCat SDK Initializer ───────────────────────────────────────────────
// Called once at app startup from _layout.tsx (module level, before React mounts).
// Graceful no-op when API keys are absent — RevenueCat is non-blocking for core
// functionality (unlike Supabase auth which gates the entire session).
//
// Keys required:
//   EXPO_PUBLIC_REVENUECAT_IOS_KEY     — iOS RevenueCat project key
//   EXPO_PUBLIC_REVENUECAT_ANDROID_KEY — Android RevenueCat project key
//
// The 'premium' entitlement identifier used in paywall.tsx must match the
// entitlement ID configured in the RevenueCat dashboard.

export function initPurchases(): void {
  const prodKey = Platform.select({
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
    android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
    default: undefined,
  });
  const apiKey = (__DEV__ && process.env.EXPO_PUBLIC_REVENUECAT_TEST_KEY)
    ? process.env.EXPO_PUBLIC_REVENUECAT_TEST_KEY
    : prodKey;

  if (!apiKey) {
    if (__DEV__) {
      console.warn(
        '[kibun:rc] RevenueCat API key not configured. ' +
        'Set EXPO_PUBLIC_REVENUECAT_IOS_KEY / EXPO_PUBLIC_REVENUECAT_ANDROID_KEY in .env.'
      );
    }
    return;
  }

  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  }

  Purchases.configure({ apiKey });
}
