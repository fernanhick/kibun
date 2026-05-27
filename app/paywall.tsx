import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Linking, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import Purchases from 'react-native-purchases';
import type { PurchasesPackage } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Button, BackButton, Shiba } from '@components/index';
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

type ComparisonRowKey =
  | 'aiPrompts'
  | 'customMoods'
  | 'breathing'
  | 'correlations'
  | 'aiReports'
  | 'customReminders'
  | 'achievements';

const COMPARISON_ROWS: ReadonlyArray<{ key: ComparisonRowKey; free: boolean }> = [
  { key: 'aiPrompts', free: false },
  { key: 'customMoods', free: false },
  { key: 'breathing', free: false },
  { key: 'correlations', free: false },
  { key: 'aiReports', free: false },
  { key: 'customReminders', free: true },
  { key: 'achievements', free: false },
];

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
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <LinearGradient
        colors={['#FF6B9D', '#C060F0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.heroSheen}
          pointerEvents="none"
        />
        <View style={styles.heroTopRow}>
          <BackButton variant="onHero" onPress={handleSkip} />
          <View style={styles.premiumPill}>
            <Ionicons name="sparkles" size={11} color={colors.textInverse} />
            <Text style={styles.premiumPillText}>
              {t('paywall.comparison.header.premium')}
            </Text>
          </View>
        </View>
        <View style={styles.heroBody}>
          <Shiba variant="excited" size={72} />
          <View style={styles.heroText}>
            <Text style={styles.title} numberOfLines={2}>
              {t('paywall.hero.title')}
            </Text>
            <Text style={styles.subtitle}>{t('paywall.hero.subtitle')}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* ── Comparison table ─────────────────────────────────────────── */}
      <View style={styles.tableCard}>
        <View
          style={styles.tableHeaderRow}
          accessibilityRole="header"
        >
          <Text style={[styles.tableHeaderCell, styles.featureCol]}>
            {t('paywall.comparison.header.feature')}
          </Text>
          <Text style={[styles.tableHeaderCell, styles.checkCol]}>
            {t('paywall.comparison.header.free')}
          </Text>
          <View style={[styles.premiumCol, styles.premiumHeaderCell]}>
            <LinearGradient
              colors={['#FF6B9D', '#C060F0']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.premiumHeaderBadge}
            >
              <Text style={styles.premiumHeaderBadgeText}>
                {t('paywall.comparison.header.premium')}
              </Text>
            </LinearGradient>
          </View>
        </View>

        {COMPARISON_ROWS.map(({ key, free }, idx) => {
          const isLast = idx === COMPARISON_ROWS.length - 1;
          const label = t(`paywall.comparison.rows.${key}` as const);
          const includedLabel = t('paywall.comparison.includedA11y');
          const notIncludedLabel = t('paywall.comparison.notIncludedA11y');
          return (
            <View
              key={key}
              style={[styles.tableRow, isLast && styles.tableRowLast]}
              accessibilityRole="text"
              accessibilityLabel={`${label}. ${t('paywall.comparison.header.free')}: ${free ? includedLabel : notIncludedLabel}. ${t('paywall.comparison.header.premium')}: ${includedLabel}.`}
            >
              <Text style={[styles.tableCell, styles.featureCol, styles.featureCellText]}>
                {label}
              </Text>
              <View style={[styles.checkCol, styles.checkCell]}>
                {free ? (
                  <Ionicons name="checkmark" size={16} color={colors.textSecondary} />
                ) : (
                  <Ionicons name="remove" size={16} color={colors.textDisabled} />
                )}
              </View>
              <View style={[styles.premiumCol, styles.checkCell]}>
                <View style={styles.premiumCheckPill}>
                  <Ionicons name="checkmark" size={12} color={colors.textInverse} />
                </View>
              </View>
            </View>
          );
        })}
      </View>

      {/* ── Trust signal ─────────────────────────────────────────────── */}
      <View
        style={styles.trustRow}
        accessibilityRole="text"
        accessibilityLabel={`${t('paywall.trust.starsA11y')}. ${t('paywall.trust.tagline')}`}
      >
        <View style={styles.starsRow}>
          {[0, 1, 2, 3, 4].map((i) => (
            <Ionicons
              key={i}
              name="star"
              size={16}
              color="#F6B100"
              style={i > 0 ? styles.starSpacing : undefined}
            />
          ))}
        </View>
        <Text style={styles.trustTagline}>{t('paywall.trust.tagline')}</Text>
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

        <View style={styles.ctaGlow}>
          <Button
            label={t('paywall.cta.subscribe')}
            onPress={handlePurchase}
            variant="sunrise"
            loading={purchasing}
            fullWidth
            accessibilityHint={t('paywall.cta.subscribeA11yHint')}
          />
        </View>
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
const PINK_BORDER = 'rgba(255, 107, 157, 0.20)';

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingTop: 0,
    paddingBottom: spacing.xl,
  },
  heroCard: {
    ...shadows.md,
    borderRadius: 24,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.28)',
    overflow: 'hidden',
  },
  heroSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 96,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  premiumPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  premiumPillText: {
    fontSize: 10,
    fontFamily: typography.fonts.ui,
    color: colors.textInverse,
    letterSpacing: 1,
  },
  heroBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingRight: spacing.xs,
  },
  heroText: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontFamily: typography.fonts.display,
    color: colors.textInverse,
    letterSpacing: -0.6,
    lineHeight: 30,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.body,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 18,
  },
  tableCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingHorizontal: spacing.sm,
    paddingTop: 2,
    paddingBottom: 2,
    ...shadows.sm,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: PINK_BORDER,
  },
  tableHeaderCell: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.ui,
    color: colors.textSecondary,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  premiumHeaderCell: {
    alignItems: 'center',
  },
  premiumHeaderBadge: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  premiumHeaderBadgeText: {
    fontSize: 10,
    fontFamily: typography.fonts.ui,
    color: colors.textInverse,
    letterSpacing: 0.8,
  },
  featureCol: {
    flex: 1,
    paddingLeft: spacing.xs,
  },
  checkCol: {
    width: 52,
    alignItems: 'center',
  },
  premiumCol: {
    width: 76,
    alignItems: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(15,23,42,0.06)',
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  tableCell: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.body,
    color: colors.text,
  },
  featureCellText: {
    lineHeight: typography.sizes.sm * typography.lineHeights.tight,
  },
  checkCell: {
    justifyContent: 'center',
  },
  premiumCheckPill: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: PINK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustRow: {
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: -spacing.xs,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starSpacing: {
    marginLeft: 2,
  },
  trustTagline: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  ctaGlow: {
    borderRadius: radius.button,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 22,
    elevation: 8,
  },
  bottom: {
    gap: spacing.md,
  },
  trialBox: {
    ...shadows.md,
    borderRadius: 16,
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
