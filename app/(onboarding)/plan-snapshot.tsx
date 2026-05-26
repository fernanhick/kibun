import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen, Button, Shiba } from '@components/index';
import { SparkleOverlay } from '@components/SparkleOverlay';
import { useOnboardingGateStore } from '@store/onboardingGateStore';
import { colors, typography, spacing, shadows } from '@constants/theme';

interface PlanRow {
  key: string;
  emoji: string;
  label: string;
  value: string;
}

export default function PlanSnapshotScreen() {
  const { t } = useTranslation(['onboarding', 'common']);
  const router = useRouter();
  const snapshot = useOnboardingGateStore((s) => s.personalizationSnapshot);
  const profile = snapshot?.profile ?? null;

  const name = profile?.name?.trim() || null;
  const headline = name
    ? t('onboarding:planSnapshot.titleNamed', { name })
    : t('onboarding:planSnapshot.titleAnon');

  const rows: PlanRow[] = useMemo(() => {
    if (!profile) return [];
    const out: PlanRow[] = [];
    if (profile.sleepHours) {
      out.push({
        key: 'sleep',
        emoji: '🌙',
        label: t('onboarding:planSnapshot.rowSleep'),
        value: t(`onboarding:profilePhysical.sleepOpt.${profile.sleepHours}`),
      });
    }
    if (profile.stressLevel) {
      out.push({
        key: 'stress',
        emoji: '🌬️',
        label: t('onboarding:planSnapshot.rowStress'),
        value: t(`onboarding:profileMental.stressOpt.${profile.stressLevel}`),
      });
    }
    const topGoal = profile.goals?.[0];
    if (topGoal) {
      out.push({
        key: 'goal',
        emoji: '🎯',
        label: t('onboarding:planSnapshot.rowGoal'),
        value: t(`onboarding:profileGoals.options.${topGoal}`),
      });
    }
    return out;
  }, [profile, t]);

  return (
    <Screen scrollable edgePadding="large" contentContainerStyle={styles.content}>
      <LinearGradient
        colors={[colors.skyStart, colors.skyEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <SparkleOverlay count={22} />
        <View style={styles.shibaWrap}>
          <Shiba variant="excited" size={140} loop autoPlay />
        </View>
        <Text style={styles.title}>{headline}</Text>
        <Text style={styles.subtitle}>{t('onboarding:planSnapshot.subtitle')}</Text>
      </LinearGradient>

      {rows.length > 0 && (
        <View style={styles.rowsCard}>
          {rows.map((r, idx) => (
            <View
              key={r.key}
              style={[styles.row, idx === rows.length - 1 && styles.rowLast]}
              accessibilityRole="text"
              accessibilityLabel={`${r.label}: ${r.value}`}
            >
              <Text style={styles.rowEmoji}>{r.emoji}</Text>
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>{r.label}</Text>
                <Text style={styles.rowValue}>{r.value}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.tagline}>{t('onboarding:planSnapshot.tagline')}</Text>

      <Button
        label={t('onboarding:planSnapshot.cta')}
        onPress={() => router.replace('/paywall')}
        variant="sunrise"
        fullWidth
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  heroCard: {
    ...shadows.md,
    borderRadius: 28,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  shibaWrap: {
    alignItems: 'center',
  },
  title: {
    fontFamily: typography.fonts.display,
    fontSize: typography.sizes.xxl,
    color: colors.textInverse,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: typography.fonts.body,
    fontSize: typography.sizes.body,
    color: colors.sparkle,
    textAlign: 'center',
    lineHeight: 22,
  },
  rowsCard: {
    ...shadows.sm,
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowEmoji: {
    fontSize: 28,
    width: 36,
    textAlign: 'center',
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontFamily: typography.fonts.ui,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  rowValue: {
    fontFamily: typography.fonts.body,
    fontSize: typography.sizes.md,
    color: colors.text,
    marginTop: 2,
  },
  tagline: {
    fontFamily: typography.fonts.body,
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
    lineHeight: 22,
  },
});
