import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen, Button, Shiba, HabitIcon } from '@components/index';
import { SparkleOverlay } from '@components/SparkleOverlay';
import { useHabitsStore } from '@store/habitsStore';
import { findPreset } from '@lib/habitPresets';
import { colors, typography, spacing, shadows } from '@constants/theme';

interface PlanRow {
  key: string;
  icon: string;
  name: string;
}

export default function PlanSnapshotScreen() {
  const { t } = useTranslation(['onboarding', 'common', 'screens']);
  const router = useRouter();
  const habits = useHabitsStore((s) => s.habits);

  const rows: PlanRow[] = useMemo(() => {
    return habits.slice(0, 4).map((h) => {
      const preset = findPreset(h.name);
      const name = preset ? t(`screens:manageHabits.preset.${preset.key}`) : h.name;
      return { key: h.id, icon: h.icon, name };
    });
  }, [habits, t]);

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
        <Text style={styles.title}>{t('onboarding:planSnapshot.title')}</Text>
        <Text style={styles.subtitle}>{t('onboarding:planSnapshot.subtitle')}</Text>
      </LinearGradient>

      {rows.length > 0 && (
        <View style={styles.rowsCard}>
          <Text style={styles.rowsHeader}>{t('onboarding:planSnapshot.rowsHeader')}</Text>
          {rows.map((r, idx) => (
            <View
              key={r.key}
              style={[styles.row, idx === rows.length - 1 && styles.rowLast]}
              accessibilityRole="text"
              accessibilityLabel={r.name}
            >
              <HabitIcon icon={r.icon} size={22} color={colors.primary} style={styles.rowEmoji} />
              <Text style={styles.rowName}>{r.name}</Text>
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
    borderRadius: 20,
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
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  rowsHeader: {
    fontFamily: typography.fonts.ui,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.xs,
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
    width: 32,
    textAlign: 'center',
  },
  rowName: {
    flex: 1,
    fontFamily: typography.fonts.body,
    fontSize: typography.sizes.md,
    color: colors.text,
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
