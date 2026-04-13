import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL, CustomerInfo } from 'react-native-purchases';
import type { SubscriptionStatus } from '@models/index';

const DEFAULT_ENTITLEMENT_ID = 'premium';
const configuredEntitlementId = process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID?.trim();
export const REVENUECAT_ENTITLEMENT_ID = configuredEntitlementId || DEFAULT_ENTITLEMENT_ID;
const ENTITLEMENT_IDS = [
  REVENUECAT_ENTITLEMENT_ID,
  'kibun Pro',
];

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
  const apiKey = Platform.select({
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
    android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
    default: undefined,
  });

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

function getActiveEntitlement(customerInfo: CustomerInfo) {
  for (const id of ENTITLEMENT_IDS) {
    const active = customerInfo.entitlements.active[id];
    if (active) return active;
  }
  return Object.values(customerInfo.entitlements.active)[0] ?? null;
}

export function getSubscriptionStatusFromCustomerInfo(
  customerInfo: CustomerInfo,
): SubscriptionStatus {
  const activeEntitlement = getActiveEntitlement(customerInfo);
  if (!activeEntitlement) return 'none';
  return activeEntitlement.periodType === 'TRIAL' ? 'trial' : 'active';
}

export async function refreshSubscriptionStatus(): Promise<SubscriptionStatus> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return getSubscriptionStatusFromCustomerInfo(customerInfo);
  } catch (error) {
    if (__DEV__) {
      console.warn('[kibun:rc] Failed to refresh subscription status:', error);
    }
    return 'none';
  }
}
