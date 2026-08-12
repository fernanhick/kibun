import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Linking, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Purchases from 'react-native-purchases';
import type { PurchasesPackage } from 'react-native-purchases';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Button, BackButton, Shiba } from '@components/index';
import { useOnboardingGateStore } from '@store/onboardingGateStore';
import { useSessionStore } from '@store/index';
import {
  getSubscriptionStatusFromCustomerInfo,
  restorePurchases,
} from '@lib/revenuecat';
import { syncSubscriptionStatusToSupabase } from '@lib/profileSync';
import { PRIVACY_POLICY_URL, TERMS_OF_USE_URL } from '@constants/legal';
import { typography, spacing, radius, shadows } from '@constants/theme';
import { useTheme, type ThemePalette } from '@theme/ThemeContext';
import { useThemedStyles } from '@hooks/useThemedStyles';

/**
 * Whether the store will actually give this package a free trial.
 *
 * iOS exposes it as `introPrice` with a zero price; Android exposes it as a free
 * phase on the default subscription option, and only populates `introPrice` in
 * newer SDK versions, so both are checked. A non-zero `introPrice` is a discounted
 * intro period, not a free trial, and must not count.
 */
function hasFreeTrial(pkg: PurchasesPackage | null): boolean {
  const product = pkg?.product as
    | { introPrice?: { price: number } | null; defaultOption?: { freePhase?: unknown } | null }
    | undefined;
  if (!product) return false;
  if (product.introPrice && Number(product.introPrice.price) === 0) return true;
  return Boolean(product.defaultOption?.freePhase);
}

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

type PlanType = 'monthly' | 'annual';

function PlanCard({
  selected,
  onPress,
  label,
  price,
  period,
  badge,
  a11yLabel,
  a11yHint,
}: {
  selected: boolean;
  onPress: () => void;
  label: string;
  price: string;
  period: string;
  badge?: string;
  a11yLabel: string;
  a11yHint: string;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable
      onPress={onPress}
      style={[styles.planCard, selected && styles.planCardSelected]}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={a11yLabel}
      accessibilityHint={a11yHint}
    >
      {badge ? (
        <View style={[styles.planBadge, selected && styles.planBadgeSelected]}>
          <Text style={[styles.planBadgeText, selected && styles.planBadgeTextSelected]}>
            {badge}
          </Text>
        </View>
      ) : (
        <View style={styles.planBadgeSpacer} />
      )}
      <View style={styles.planCardBody}>
        <View style={[styles.planRadio, selected && styles.planRadioSelected]}>
          {selected && <Ionicons name="checkmark" size={12} color={colors.textInverse} />}
        </View>
        <Text style={styles.planLabel}>{label}</Text>
        <Text style={styles.planPrice}>{price}</Text>
        <Text style={styles.planPeriod}>{period}</Text>
      </View>
    </Pressable>
  );
}

export default function PaywallScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { t } = useTranslation('screens');
  const { setPaywallSeen } = useOnboardingGateStore();
  const session = useSessionStore((s) => s.session);
  const { setSubscriptionStatus } = useSessionStore();
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [monthlyPkg, setMonthlyPkg] = useState<PurchasesPackage | null>(null);
  const [yearlyPkg, setYearlyPkg] = useState<PurchasesPackage | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('annual');

  useEffect(() => {
    let cancelled = false;
    Purchases.getOfferings()
      .then((offerings) => {
        if (cancelled) return;
        const current = offerings.current;
        if (!current) return;
        const monthly = current.monthly ?? current.availablePackages.find((p) => p.packageType === 'MONTHLY');
        const yearly = current.annual ?? current.availablePackages.find((p) => p.packageType === 'ANNUAL');
        setMonthlyPkg(monthly ?? null);
        setYearlyPkg(yearly ?? null);
      })
      .catch((err) => {
        if (__DEV__) console.warn('[kibun:rc] getOfferings failed:', err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedPackage = selectedPlan === 'annual' ? yearlyPkg : monthlyPkg;

  // Per-month equivalent of the yearly plan, used for the savings badge.
  const savingsPercent =
    monthlyPkg && yearlyPkg && monthlyPkg.product.price > 0
      ? Math.round((1 - yearlyPkg.product.price / (monthlyPkg.product.price * 12)) * 100)
      : 0;

  const monthlyPriceStr = monthlyPkg?.product.priceString ?? t('paywall.price.fallbackMonthly');
  const yearlyPriceStr = yearlyPkg?.product.priceString ?? t('paywall.price.fallbackYearly');

  // Never promise a trial the store will not honour. The trial is configured per
  // plan per store, so it can legitimately exist on one and not the other — and
  // getting this wrong means the purchase sheet charges immediately right after
  // the paywall said "7 days free".
  const trialOnSelected = hasFreeTrial(selectedPackage);
  const billedLine = trialOnSelected
    ? selectedPlan === 'annual'
      ? t('paywall.plan.billedYearly', { price: yearlyPriceStr })
      : t('paywall.plan.billedMonthly', { price: monthlyPriceStr })
    : selectedPlan === 'annual'
      ? t('paywall.plan.billedYearlyNoTrial', { price: yearlyPriceStr })
      : t('paywall.plan.billedMonthlyNoTrial', { price: monthlyPriceStr });

  const handlePurchase = async () => {
    if (purchasing) return;

    const pkg = selectedPackage;
    if (!pkg) {
      setPurchaseError(t('paywall.errors.notConfigured'));
      return;
    }

    setPurchasing(true);
    setPurchaseError(null);
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
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
        setPurchaseError(t('paywall.errors.noEntitlement'));
        setPurchasing(false);
      }
    } catch (error: unknown) {
      const rcError = error as { code?: string; message?: string; userCancelled?: boolean };

      // User dismissed the native purchase sheet — not an error, just reset.
      if (rcError?.userCancelled) {
        setPurchasing(false);
        return;
      }

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
        colors={['#BC6B7A', '#9E6E97']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0)']}
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
              colors={['#BC6B7A', '#9E6E97']}
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
      {/* Claims here must be true and backed by shipping behaviour. This
          surface is the 3.1.2 disclosure frame — never put an unearned
          rating or review count on it. */}
      <View
        style={styles.trustRow}
        accessibilityRole="text"
        accessibilityLabel={`${t('paywall.trust.privacy')}. ${t('paywall.trust.tagline')}`}
      >
        <View style={styles.trustBadgeRow}>
          <Ionicons name="shield-checkmark" size={15} color={colors.primary} />
          <Text style={styles.trustBadgeText}>{t('paywall.trust.privacy')}</Text>
        </View>
        <Text style={styles.trustTagline}>{t('paywall.trust.tagline')}</Text>
      </View>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <View style={styles.bottom}>
        {/* ── Plan selector ──────────────────────────────────────────── */}
        <View style={styles.planRow}>
          <PlanCard
            selected={selectedPlan === 'annual'}
            onPress={() => setSelectedPlan('annual')}
            label={t('paywall.plan.annual.label')}
            price={yearlyPriceStr}
            period={t('paywall.plan.annual.period')}
            badge={savingsPercent > 0 ? t('paywall.plan.save', { percent: savingsPercent }) : t('paywall.plan.bestValue')}
            a11yLabel={`${t('paywall.plan.annual.label')}, ${yearlyPriceStr} ${t('paywall.plan.annual.period')}${selectedPlan === 'annual' ? `, ${t('paywall.plan.selectedA11y')}` : ''}`}
            a11yHint={t('paywall.plan.a11yHint', { plan: t('paywall.plan.annual.label') })}
          />
          <PlanCard
            selected={selectedPlan === 'monthly'}
            onPress={() => setSelectedPlan('monthly')}
            label={t('paywall.plan.monthly.label')}
            price={monthlyPriceStr}
            period={t('paywall.plan.monthly.period')}
            a11yLabel={`${t('paywall.plan.monthly.label')}, ${monthlyPriceStr} ${t('paywall.plan.monthly.period')}${selectedPlan === 'monthly' ? `, ${t('paywall.plan.selectedA11y')}` : ''}`}
            a11yHint={t('paywall.plan.a11yHint', { plan: t('paywall.plan.monthly.label') })}
          />
        </View>

        <Text style={styles.billedLine}>{billedLine}</Text>

        <View style={styles.ctaGlow}>
          <Button
            label={trialOnSelected ? t('paywall.cta.subscribe') : t('paywall.cta.subscribeNoTrial')}
            onPress={handlePurchase}
            variant="sunrise"
            loading={purchasing}
            fullWidth
            accessibilityHint={
              trialOnSelected
                ? t('paywall.cta.subscribeA11yHint')
                : t('paywall.cta.subscribeA11yHintNoTrial')
            }
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

const PINK = '#BC6B7A';
const PINK_BORDER = 'rgba(188, 107, 122, 0.20)';

const createStyles = (colors: ThemePalette) => StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingTop: 0,
    paddingBottom: spacing.xl,
  },
  heroCard: {
    ...shadows.md,
    borderRadius: radius.xxl,
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
    borderRadius: radius.xxl,
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
    borderBottomColor: colors.border,
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
    borderRadius: radius.lg,
    backgroundColor: PINK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustRow: {
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: -spacing.xs,
  },
  trustBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  trustBadgeText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.body,
    color: colors.primary,
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
  planRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  planCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.sm,
  },
  planCardSelected: {
    borderColor: PINK,
    backgroundColor: colors.pinkLight,
  },
  planBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.borderLight,
    borderBottomRightRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  planBadgeSelected: {
    backgroundColor: PINK,
  },
  planBadgeSpacer: {
    height: 22,
  },
  planBadgeText: {
    fontSize: 9,
    fontFamily: typography.fonts.ui,
    color: colors.textSecondary,
    letterSpacing: 0.6,
  },
  planBadgeTextSelected: {
    color: colors.textInverse,
  },
  planCardBody: {
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
    gap: 2,
  },
  planRadio: {
    width: 20,
    height: 20,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  planRadioSelected: {
    borderColor: PINK,
    backgroundColor: PINK,
  },
  planLabel: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.ui,
    color: colors.textSecondary,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  planPrice: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fonts.display,
    color: colors.text,
    letterSpacing: -0.4,
  },
  planPeriod: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.body,
    color: colors.textSecondary,
  },
  billedLine: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: -spacing.xs,
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
