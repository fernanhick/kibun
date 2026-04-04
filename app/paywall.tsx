import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Purchases, { PURCHASES_ERROR_CODE } from 'react-native-purchases';
import { Screen, Button } from '@components/index';
import { useOnboardingGateStore } from '@store/onboardingGateStore';
import { useSessionStore } from '@store/index';
import { colors, typography, spacing, radius, shadows } from '@constants/theme';

const FEATURES = [
  'AI weekly and monthly mood reports',
  'Unlimited mood history and calendar',
  'Personalised pattern insights',
];

export default function PaywallScreen() {
  const router = useRouter();
  const { setPaywallSeen } = useOnboardingGateStore();
  const { setSubscriptionStatus } = useSessionStore();
  const [purchasing, setPurchasing] = useState(false);

  const handlePurchase = async () => {
    if (purchasing) return;
    setPurchasing(true);
    let purchased = false;
    try {
      const offerings = await Purchases.getOfferings();
      const pkg = offerings.current?.availablePackages[0];
      if (!pkg) {
        if (__DEV__) {
          console.warn('[kibun:rc] No offerings found. Configure products in RevenueCat dashboard.');
        }
        // No products — fall through to tabs (dev fallback, not a real purchase)
      } else {
        const { customerInfo } = await Purchases.purchasePackage(pkg);
        const active = customerInfo.entitlements.active['premium'];
        if (active) {
          setSubscriptionStatus(active.periodType === 'TRIAL' ? 'trial' : 'active');
          purchased = true; // Only set on confirmed entitlement
        }
      }
    } catch (error: unknown) {
      const rcError = error as { code?: string };
      if (rcError?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
        // User cancelled native IAP dialog — stay on paywall, re-enable button
        // Do NOT set paywallSeen. Do NOT navigate away.
        setPurchasing(false);
        return;
      }
      // All other errors (network, RC not configured, etc.) — log and fall through
      if (__DEV__) {
        console.warn('[kibun:rc] Purchase failed (non-cancel):', error);
      }
    }
    setPaywallSeen();
    // Successful purchase → registration; dev/error fallback → tabs directly
    router.replace(purchased ? '/register' : '/(tabs)');
  };

  const handleSkip = () => {
    setPaywallSeen();
    router.replace('/(tabs)');
  };

  return (
    <Screen scrollable={false} contentContainerStyle={styles.content}>
      <View style={styles.top}>
        <Text style={styles.title}>Try kibun Premium</Text>
        <Text style={styles.subtitle}>
          Understand your emotional patterns with AI-powered insights.
        </Text>

        <View style={styles.featureList}>
          {FEATURES.map((feature) => (
            <View key={feature} style={styles.featureRow}>
              <Text style={styles.featureDot}>•</Text>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
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
          loading={purchasing}
          fullWidth
          accessibilityHint="Begins your free trial. No charge for 7 days."
        />
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
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
  },
  top: {
    gap: spacing.lg,
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
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
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
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
});
