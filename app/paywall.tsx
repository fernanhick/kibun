import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Linking, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import Purchases from 'react-native-purchases';
import type { PurchasesPackage } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen, Button, BackButton } from '@components/index';
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

const FREE_FEATURE_EMOJIS = ['📓', '🔔', '📅'];
const PRO_FEATURE_EMOJIS = ['✨', '📊', '🎉', '🔮', '🌱', '📝', '🎨'];

function formatPriceLine(
  t: TFunction<'screens'>,
  monthly?: PurchasesPackage,
  yearly?: PurchasesPackage
): string {
  const m = monthly?.product.priceString;
  const y = yearly?.product.priceString;
  if (m && y) return t('paywall.price.both', { monthly: m, yearly: y });
  if (m) return t('paywall.price.monthlyOnly', { monthly: m });
  if (y) return t('paywall.price.yearlyOnly', { yearly: y });
  return t('paywall.price.both', {
    monthly: t('paywall.price.fallbackMonthly'),
    yearly: t('paywall.price.fallbackYearly'),
  });
}

export default function PaywallScreen() {
  const router = useRouter();
  const { t } = useTranslation('screens');
  const { setPaywallSeen } = useOnboardingGateStore();
  const session = useSessionStore((s) => s.session);
  const { setSubscriptionStatus } = useSessionStore();
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [priceLine, setPriceLine] = useState<string>(() => formatPriceLine(t));

  const freeFeatures = t('paywall.features.free', { returnObjects: true }) as string[];
  const proFeatures = t('paywall.features.pro', { returnObjects: true }) as string[];

  useEffect(() => {
    let cancelled = false;
    Purchases.getOfferings()
      .then((offerings) => {
        if (cancelled) return;
        const current = offerings.current;
        if (!current) return;
        const monthly = current.monthly ?? current.availablePackages.find((p) => p.packageType === 'MONTHLY');
        const yearly = current.annual ?? current.availablePackages.find((p) => p.packageType === 'ANNUAL');
        setPriceLine(formatPriceLine(t, monthly ?? undefined, yearly ?? undefined));
      })
      .catch((err) => {
        if (__DEV__) console.warn('[kibun:rc] getOfferings failed:', err);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

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
          setPurchaseError(t('paywall.errors.notConfigured'));
        } else if (paywallResult === PAYWALL_RESULT.ERROR) {
          setPurchaseError(t('paywall.errors.loadFailed'));
        } else {
          setPurchaseError(t('paywall.errors.noEntitlement'));
        }
        setPurchasing(false);
      }
    } catch (error: unknown) {
      const rcError = error as { code?: string; message?: string };
      if (rcError?.message?.includes('Native module not found')) {
        setPurchaseError(t('paywall.errors.nativeMissing'));
        setPurchasing(false);
        return;
      }

      if (rcError?.message?.toLowerCase().includes('billing')) {
        setPurchaseError(t('paywall.errors.billingUnavailable'));
      } else {
        setPurchaseError(t('paywall.errors.generic'));
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
        setPurchaseError(t('paywall.errors.noPriorPurchases'));
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
      <BackButton onPress={handleSkip} />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <LinearGradient
        colors={['#FF6B9D', '#C060F0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <Text style={styles.heroEmoji}>🌸</Text>
        <Text style={styles.title}>{t('paywall.hero.title')}</Text>
        <Text style={styles.subtitle}>{t('paywall.hero.subtitle')}</Text>
      </LinearGradient>

      {/* ── Feature comparison ───────────────────────────────────────── */}
      <View style={styles.featureCard}>
        {/* Free tier */}
        <View style={styles.tierHeader}>
          <View style={styles.tierBadgeFree}>
            <Text style={styles.tierBadgeText}>{t('paywall.tier.free.badge')}</Text>
          </View>
          <Text style={styles.tierLabel}>{t('paywall.tier.free.label')}</Text>
        </View>
        <View style={[styles.featureList, styles.featureListSpaced]}>
          {freeFeatures.map((text, idx) => (
            <View key={idx} style={styles.featureRowFree}>
              <Text style={styles.featureEmoji}>{FREE_FEATURE_EMOJIS[idx]}</Text>
              <Text style={styles.featureText}>{text}</Text>
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
            <Text style={styles.tierBadgeText}>{t('paywall.tier.pro.badge')}</Text>
          </LinearGradient>
          <Text style={styles.tierLabel}>{t('paywall.tier.pro.label')}</Text>
        </View>
        <View style={styles.featureList}>
          {proFeatures.map((text, idx) => (
            <View key={idx} style={styles.featureRowPro}>
              <Text style={styles.featureEmoji}>{PRO_FEATURE_EMOJIS[idx]}</Text>
              <Text style={styles.featureText}>{text}</Text>
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
          <Text style={styles.priceMain}>{priceLine}</Text>
          <Text style={styles.priceSub}>{t('paywall.price.trial')}</Text>
        </LinearGradient>

        <Button
          label={t('paywall.cta.subscribe')}
          onPress={handlePurchase}
          variant="sunrise"
          loading={purchasing}
          fullWidth
          accessibilityHint={t('paywall.cta.subscribeA11yHint')}
        />
        {purchaseError && (
          <Text style={styles.errorText}>{purchaseError}</Text>
        )}

        <Text style={styles.disclosure}>{t('paywall.disclosure')}</Text>

        <View style={styles.legalRow}>
          <Pressable
            onPress={handleRestore}
            accessibilityRole="button"
            accessibilityLabel={t('paywall.restore.a11y')}
            disabled={restoring || purchasing}
            hitSlop={8}
          >
            <Text style={styles.legalLink}>
              {restoring ? t('paywall.restore.loading') : t('paywall.restore.label')}
            </Text>
          </Pressable>
          <Text style={styles.legalSep}>·</Text>
          <Pressable
            onPress={() => Linking.openURL(TERMS_OF_USE_URL)}
            accessibilityRole="link"
            accessibilityLabel={t('paywall.legal.termsA11y')}
            hitSlop={8}
          >
            <Text style={styles.legalLink}>{t('paywall.legal.terms')}</Text>
          </Pressable>
          <Text style={styles.legalSep}>·</Text>
          <Pressable
            onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
            accessibilityRole="link"
            accessibilityLabel={t('paywall.legal.privacyA11y')}
            hitSlop={8}
          >
            <Text style={styles.legalLink}>{t('paywall.legal.privacy')}</Text>
          </Pressable>
        </View>

        <View style={styles.skipRow}>
          <Button
            label={t('paywall.cta.skip')}
            onPress={handleSkip}
            variant="ghost"
            fullWidth
            accessibilityHint={t('paywall.cta.skipA11yHint')}
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
  priceMain: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fonts.display,
    color: colors.textInverse,
    textAlign: 'center',
  },
  priceSub: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.body,
    color: colors.textInverse,
    textAlign: 'center',
    opacity: 0.92,
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
