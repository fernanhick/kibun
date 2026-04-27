import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Linking, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Purchases from 'react-native-purchases';
import type { PurchasesPackage } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen, Button } from '@components/index';
import { useOnboardingGateStore } from '@store/onboardingGateStore';
import { useSessionStore } from '@store/index';
import {
  getSubscriptionStatusFromCustomerInfo,
  REVENUECAT_ENTITLEMENT_ID,
  restorePurchases,
} from '@lib/revenuecat';
import { syncSubscriptionStatusToSupabase } from '@lib/profileSync';
import { PRIVACY_POLICY_URL, TERMS_OF_USE_URL } from '@constants/legal';
import { colors, typography, spacing, radius, shadows } from '@constants/theme';

const FREE_FEATURES = [
  { emoji: '📓', text: 'Daily mood logging' },
  { emoji: '🔔', text: 'Custom reminder times' },
  { emoji: '📅', text: 'Full mood history & calendar' },
];

const PRO_FEATURES = [
  { emoji: '✨', text: 'Daily AI wellness insight, just for you' },
  { emoji: '📊', text: 'Weekly & monthly AI mood reports' },
  { emoji: '🎉', text: 'Annual mood report & year in review' },
  { emoji: '🔮', text: 'Pattern insights & resilience score' },
  { emoji: '🌱', text: 'Habit tracking (sleep, exercise & more)' },
  { emoji: '📝', text: 'Life events & mood correlation' },
  { emoji: '🎨', text: 'Custom moods with personalised colours' },
];

// Fallback strings used only if RevenueCat offerings are unavailable on first
// render (network failure, sandbox not configured). The localized strings from
// PurchasesPackage.product.priceString are preferred everywhere they're available.
const FALLBACK_TRIAL_LINE = 'then $5.99 / month or $39.99 / year · cancel anytime';

function formatTrialLine(monthly?: PurchasesPackage, yearly?: PurchasesPackage): string {
  const m = monthly?.product.priceString;
  const y = yearly?.product.priceString;
  if (m && y) return `then ${m} / month or ${y} / year · cancel anytime`;
  if (m) return `then ${m} / month · cancel anytime`;
  if (y) return `then ${y} / year · cancel anytime`;
  return FALLBACK_TRIAL_LINE;
}

export default function PaywallScreen() {
  const router = useRouter();
  const { setPaywallSeen } = useOnboardingGateStore();
  const session = useSessionStore((s) => s.session);
  const { setSubscriptionStatus } = useSessionStore();
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [trialLine, setTrialLine] = useState<string>(FALLBACK_TRIAL_LINE);

  useEffect(() => {
    let cancelled = false;
    Purchases.getOfferings()
      .then((offerings) => {
        if (cancelled) return;
        const current = offerings.current;
        if (!current) return;
        const monthly = current.monthly ?? current.availablePackages.find((p) => p.packageType === 'MONTHLY');
        const yearly = current.annual ?? current.availablePackages.find((p) => p.packageType === 'ANNUAL');
        setTrialLine(formatTrialLine(monthly ?? undefined, yearly ?? undefined));
      })
      .catch((err) => {
        if (__DEV__) console.warn('[kibun:rc] getOfferings failed:', err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handlePurchase = async () => {
    if (purchasing) return;
    setPurchasing(true);
    setPurchaseError(null);
    try {
      const paywallResult = await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: REVENUECAT_ENTITLEMENT_ID,
        displayCloseButton: true,
      });

      if (__DEV__) {
        console.log('[kibun:rc] Paywall result:', paywallResult);
      }

      if (paywallResult === PAYWALL_RESULT.CANCELLED) {
        setPurchasing(false);
        return;
      }

      const customerInfo = await Purchases.getCustomerInfo();
      if (__DEV__) {
        console.log('[kibun:rc] Active entitlements:', JSON.stringify(customerInfo.entitlements.active));
      }

      const subscriptionStatus = getSubscriptionStatusFromCustomerInfo(customerInfo);
      if (subscriptionStatus !== 'none') {
        setSubscriptionStatus(subscriptionStatus);
        if (session?.userId) {
          syncSubscriptionStatusToSupabase(session.userId, subscriptionStatus);
        }
        setPaywallSeen();
        router.replace(session?.authStatus === 'registered' ? '/(tabs)' : '/register');
      } else {
        if (paywallResult === PAYWALL_RESULT.NOT_PRESENTED) {
          setPurchaseError('RevenueCat paywall is not configured. Set a current offering in the dashboard.');
        } else if (paywallResult === PAYWALL_RESULT.ERROR) {
          setPurchaseError('Paywall failed to load. Please try again.');
        } else {
          setPurchaseError('Purchase completed but entitlement not found. Please contact support.');
        }
        setPurchasing(false);
      }
    } catch (error: unknown) {
      const rcError = error as { code?: string; message?: string };
      if (rcError?.message?.includes('Native module not found')) {
        setPurchaseError('RevenueCat paywall UI is unavailable in this build. Rebuild the dev client and try again.');
        setPurchasing(false);
        return;
      }

      if (rcError?.message?.toLowerCase().includes('billing')) {
        setPurchaseError('In-app purchases are not available on this device. Make sure you are signed into Google Play.');
      } else {
        setPurchaseError('Something went wrong. Please try again.');
      }
      if (__DEV__) {
        console.warn('[kibun:rc] Purchase failed:', error);
      }
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    if (restoring || purchasing) return;
    setRestoring(true);
    setPurchaseError(null);
    try {
      const subscriptionStatus = await restorePurchases();
      if (subscriptionStatus !== 'none') {
        setSubscriptionStatus(subscriptionStatus);
        if (session?.userId) {
          syncSubscriptionStatusToSupabase(session.userId, subscriptionStatus);
        }
        setPaywallSeen();
        router.replace(session?.authStatus === 'registered' ? '/(tabs)' : '/register');
      } else {
        setPurchaseError('No previous purchases found for this account.');
      }
    } finally {
      setRestoring(false);
    }
  };

  const handleSkip = () => {
    setPaywallSeen();
    router.replace('/(tabs)');
  };

  return (
    <Screen scrollable contentContainerStyle={styles.content}>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <LinearGradient
        colors={['#FF6B9D', '#C060F0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <Text style={styles.heroEmoji}>🌸</Text>
        <Text style={styles.title}>kibun Premium</Text>
        <Text style={styles.subtitle}>
          Your feelings deserve the full picture.{'\n'}Let's make sense of them together 💕
        </Text>
      </LinearGradient>

      {/* ── Feature comparison ───────────────────────────────────────── */}
      <View style={styles.featureCard}>
        {/* Free tier */}
        <View style={styles.tierHeader}>
          <View style={styles.tierBadgeFree}>
            <Text style={styles.tierBadgeText}>FREE</Text>
          </View>
          <Text style={styles.tierLabel}>Always included</Text>
        </View>
        <View style={[styles.featureList, styles.featureListSpaced]}>
          {FREE_FEATURES.map((f) => (
            <View key={f.text} style={styles.featureRowFree}>
              <Text style={styles.featureEmoji}>{f.emoji}</Text>
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Pro tier */}
        <View style={styles.tierHeader}>
          <LinearGradient
            colors={['#FF6B9D', '#C060F0']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.tierBadgePro}
          >
            <Text style={styles.tierBadgeText}>PREMIUM</Text>
          </LinearGradient>
          <Text style={styles.tierLabel}>Unlock with trial</Text>
        </View>
        <View style={styles.featureList}>
          {PRO_FEATURES.map((f) => (
            <View key={f.text} style={styles.featureRowPro}>
              <Text style={styles.featureEmoji}>{f.emoji}</Text>
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <View style={styles.bottom}>
        <LinearGradient
          colors={['#FF6B9D', '#C060F0']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.trialBox}
        >
          <Text style={styles.trialDays}>🎀 7 days free</Text>
          <Text style={styles.trialTerms}>{trialLine}</Text>
        </LinearGradient>

        <Button
          label="Start my free trial 🌸"
          onPress={handlePurchase}
          variant="sunrise"
          loading={purchasing}
          fullWidth
          accessibilityHint="Begins your free trial. No charge for 7 days."
        />
        {purchaseError && (
          <Text style={styles.errorText}>{purchaseError}</Text>
        )}

        <Text style={styles.disclosure}>
          Payment is charged to your account at confirmation of purchase. Your
          subscription automatically renews unless cancelled at least 24 hours
          before the current period ends. Manage or cancel anytime in your
          account settings.
        </Text>

        <View style={styles.legalRow}>
          <Pressable
            onPress={handleRestore}
            accessibilityRole="button"
            accessibilityLabel="Restore previous purchases"
            disabled={restoring || purchasing}
            hitSlop={8}
          >
            <Text style={styles.legalLink}>
              {restoring ? 'Restoring…' : 'Restore purchases'}
            </Text>
          </Pressable>
          <Text style={styles.legalSep}>·</Text>
          <Pressable
            onPress={() => Linking.openURL(TERMS_OF_USE_URL)}
            accessibilityRole="link"
            accessibilityLabel="Terms of Use"
            hitSlop={8}
          >
            <Text style={styles.legalLink}>Terms of Use</Text>
          </Pressable>
          <Text style={styles.legalSep}>·</Text>
          <Pressable
            onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
            accessibilityRole="link"
            accessibilityLabel="Privacy Policy"
            hitSlop={8}
          >
            <Text style={styles.legalLink}>Privacy Policy</Text>
          </Pressable>
        </View>

        <View style={styles.skipRow}>
          <Button
            label="Maybe later"
            onPress={handleSkip}
            variant="ghost"
            fullWidth
            accessibilityHint="Skip subscription and continue with limited features"
          />
        </View>
      </View>
    </Screen>
  );
}

const PINK = '#FF6B9D';
const PINK_LIGHT = 'rgba(255, 107, 157, 0.08)';
const PINK_BORDER = 'rgba(255, 107, 157, 0.20)';

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  heroCard: {
    borderRadius: 28,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  heroEmoji: {
    fontSize: 52,
  },
  title: {
    fontSize: typography.sizes.display,
    fontFamily: typography.fonts.display,
    color: colors.textInverse,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: typography.sizes.md,
    color: 'rgba(255,255,255,0.88)',
    lineHeight: typography.sizes.md * typography.lineHeights.relaxed,
    textAlign: 'center',
  },
  featureCard: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: PINK_BORDER,
    borderRadius: 24,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.sm,
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 2,
  },
  tierBadgeFree: {
    backgroundColor: 'rgba(0,0,0,0.07)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  tierBadgePro: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  tierBadgeText: {
    fontSize: 10,
    fontFamily: typography.fonts.ui,
    color: colors.textInverse,
    letterSpacing: 0.8,
  },
  tierLabel: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.body,
    color: colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: PINK_BORDER,
    marginVertical: spacing.sm,
  },
  featureList: {
    gap: spacing.xs + 2,
  },
  featureListSpaced: {
    marginBottom: spacing.xs,
  },
  featureRowFree: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: radius.lg,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm,
  },
  featureRowPro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: PINK_LIGHT,
    borderRadius: radius.lg,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm,
  },
  featureEmoji: {
    fontSize: 17,
    width: 24,
    textAlign: 'center',
  },
  featureText: {
    flex: 1,
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.body,
    color: colors.text,
    lineHeight: typography.sizes.md * typography.lineHeights.relaxed,
  },
  bottom: {
    gap: spacing.md,
  },
  trialBox: {
    borderRadius: 22,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  trialDays: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fonts.display,
    color: colors.textInverse,
  },
  trialTerms: {
    fontSize: typography.sizes.sm,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },
  skipRow: {
    marginTop: spacing.xs,
  },
  errorText: {
    fontSize: typography.sizes.sm,
    color: colors.error ?? '#E53E3E',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  disclosure: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.sizes.xs * typography.lineHeights.relaxed,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.sm,
  },
  legalRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
    marginTop: spacing.xs,
  },
  legalLink: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
  legalSep: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
});
