import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Purchases from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen, Button } from '@components/index';
import { useOnboardingGateStore } from '@store/onboardingGateStore';
import { useSessionStore } from '@store/index';
import {
  getSubscriptionStatusFromCustomerInfo,
  REVENUECAT_ENTITLEMENT_ID,
} from '@lib/revenuecat';
import { syncSubscriptionStatusToSupabase } from '@lib/profileSync';
import { colors, typography, spacing, radius, shadows } from '@constants/theme';

const FEATURES = [
  'AI weekly and monthly mood reports',
  'Unlimited mood history and calendar',
  'Personalised pattern insights',
];

export default function PaywallScreen() {
  const router = useRouter();
  const { setPaywallSeen } = useOnboardingGateStore();
  const session = useSessionStore((s) => s.session);
  const { setSubscriptionStatus } = useSessionStore();
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

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

  const handleSkip = () => {
    setPaywallSeen();
    router.replace('/(tabs)');
  };

  return (
    <Screen scrollable={false} contentContainerStyle={styles.content}>
      <View style={styles.top}>
        <LinearGradient
          colors={[colors.skyStart, colors.skyEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <Text style={styles.title}>Try kibun Premium</Text>
          <Text style={styles.subtitle}>
            Understand your emotional patterns with AI-powered insights.
          </Text>
        </LinearGradient>

        <View style={styles.featureCard}>
          <View style={styles.featureList}>
            {FEATURES.map((feature) => (
              <View key={feature} style={styles.featureRow}>
                <Text style={styles.featureDot}>•</Text>
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.bottom}>
        <View style={styles.trialBox}>
          <Text style={styles.trialDays}>7 days free</Text>
          <Text style={styles.trialTerms}>
            then $5.99 / month or $39.99 / year · cancel anytime
          </Text>
        </View>

        <Button
          label="Start 7-day free trial"
          onPress={handlePurchase}
          variant="sunrise"
          loading={purchasing}
          fullWidth
          accessibilityHint="Begins your free trial. No charge for 7 days."
        />
        {purchaseError && (
          <Text style={styles.errorText}>{purchaseError}</Text>
        )}
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

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  top: {
    gap: spacing.lg,
  },
  heroCard: {
    borderRadius: 28,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    marginBottom: spacing.lg,
  },
  featureCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 22,
    padding: spacing.md,
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
  },
  subtitle: {
    fontSize: typography.sizes.md,
    color: colors.sparkle,
    lineHeight: typography.sizes.md * typography.lineHeights.relaxed,
  },
  featureList: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  featureRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  featureDot: {
    fontSize: typography.sizes.md,
    color: colors.primary,
    lineHeight: typography.sizes.md * typography.lineHeights.relaxed,
  },
  featureText: {
    flex: 1,
    fontSize: typography.sizes.md,
    color: colors.text,
    lineHeight: typography.sizes.md * typography.lineHeights.relaxed,
  },
  bottom: {
    gap: spacing.md,
  },
  trialBox: {
    backgroundColor: colors.chipSurface,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.chipBorder,
    ...shadows.sm,
  },
  trialDays: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  trialTerms: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
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
});
