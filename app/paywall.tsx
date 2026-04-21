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
  { emoji: '✨', text: 'Daily AI wellness insight, just for you' },
  { emoji: '📊', text: 'Weekly & monthly AI mood reports' },
  { emoji: '🎉', text: 'Annual mood report & year in review' },
  { emoji: '📅', text: 'Unlimited mood history & calendar' },
  { emoji: '🔮', text: 'Pattern insights & resilience score' },
  { emoji: '🌱', text: 'Habit tracking (sleep, exercise & more)' },
  { emoji: '📝', text: 'Life event logging & mood correlation' },
  { emoji: '🎨', text: 'Custom moods with personalised colours' },
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
    <Screen scrollable contentContainerStyle={styles.content}>
      <View style={styles.top}>
        <LinearGradient
          colors={['#FF6B9D', '#C77DFF']}
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

        <View style={styles.featureCard}>
          <Text style={styles.featureSectionLabel}>Everything you get ✨</Text>
          <View style={styles.featureList}>
            {FEATURES.map((feature) => (
              <View key={feature.text} style={styles.featureRow}>
                <Text style={styles.featureEmoji}>{feature.emoji}</Text>
                <Text style={styles.featureText}>{feature.text}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.bottom}>
        <View style={styles.trialBox}>
          <Text style={styles.trialDays}>🎀 7 days free</Text>
          <Text style={styles.trialTerms}>
            then $5.99 / month or $39.99 / year · cancel anytime
          </Text>
        </View>

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
const PINK_LIGHT = 'rgba(255, 107, 157, 0.10)';
const PINK_BORDER = 'rgba(255, 107, 157, 0.25)';

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  top: {
    gap: spacing.lg,
  },
  heroCard: {
    borderRadius: 28,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  heroEmoji: {
    fontSize: 44,
  },
  featureCard: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: PINK_BORDER,
    borderRadius: 22,
    padding: spacing.md,
    ...shadows.sm,
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontFamily: typography.fonts.display,
    color: colors.textInverse,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.sizes.md,
    color: 'rgba(255,255,255,0.90)',
    lineHeight: typography.sizes.md * typography.lineHeights.relaxed,
    textAlign: 'center',
  },
  featureSectionLabel: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.ui,
    color: PINK,
    marginBottom: spacing.sm,
    letterSpacing: 0.4,
  },
  featureList: {
    gap: spacing.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: PINK_LIGHT,
    borderRadius: radius.lg,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm,
  },
  featureEmoji: {
    fontSize: 18,
    width: 26,
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
    backgroundColor: PINK_LIGHT,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1.5,
    borderColor: PINK_BORDER,
    ...shadows.sm,
  },
  trialDays: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fonts.display,
    color: PINK,
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
