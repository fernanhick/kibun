import { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Button, OnboardingProgress, Shiba, type ShibaVariant } from '@components/index';
import { useOnboardingStore } from '@store/onboardingStore';
import { MOOD_MAP, type MoodGroup, type MoodId } from '@constants/moods';
import { colors, typography, spacing, radius } from '@constants/theme';

function shibaVariantFor(firstMoodId: MoodId | null): ShibaVariant {
  if (!firstMoodId) return 'happy';
  const mood = MOOD_MAP[firstMoodId];
  if (!mood) return 'happy';
  const group: MoodGroup = mood.group;
  if (group === 'green') return mood.id === 'excited' ? 'excited' : 'happy';
  if (group === 'neutral') return 'neutral';
  return 'sad';
}

export default function ReflectionScreen() {
  const { t } = useTranslation(['onboarding', 'common']);
  const router = useRouter();
  const { profile, firstMoodId } = useOnboardingStore();

  const variant = useMemo(() => shibaVariantFor(firstMoodId), [firstMoodId]);

  const chips = useMemo(() => {
    const items: { key: string; label: string }[] = [];
    if (profile.sleepHours) {
      items.push({
        key: 'sleep',
        label: t('onboarding:reflection.chipSleep', {
          value: t(`onboarding:profilePhysical.sleepOpt.${profile.sleepHours}`),
        }),
      });
    }
    if (profile.stressLevel) {
      items.push({
        key: 'stress',
        label: t('onboarding:reflection.chipStress', {
          value: t(`onboarding:profileMental.stressOpt.${profile.stressLevel}`),
        }),
      });
    }
    const topGoal = profile.goals[0];
    if (topGoal) {
      items.push({
        key: 'goal',
        label: t('onboarding:reflection.chipGoal', {
          value: t(`onboarding:profileGoals.options.${topGoal}`),
        }),
      });
    }
    return items;
  }, [profile.sleepHours, profile.stressLevel, profile.goals, t]);

  const headline = profile.name
    ? t('onboarding:reflection.headlineNamed', { name: profile.name })
    : t('onboarding:reflection.headlineAnon');

  return (
    <Screen scrollable edgePadding="large">
      <LinearGradient
        colors={[colors.skyStart, colors.skyEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <OnboardingProgress current={10} total={11} style={styles.progress} />
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('onboarding:a11y.goBack')}
          hitSlop={12}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textInverse} />
        </Pressable>
        <View style={styles.shibaWrap}>
          <Shiba variant={variant} size={170} loop autoPlay />
        </View>
        <Text style={styles.title}>{headline}</Text>
        <Text style={styles.subtitle}>{t('onboarding:reflection.subtitle')}</Text>
      </LinearGradient>

      {chips.length > 0 && (
        <View style={styles.chipsCard}>
          {chips.map((c) => (
            <View key={c.key} style={styles.chip}>
              <Text style={styles.chipText}>{c.label}</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.tieLine}>{t('onboarding:reflection.tieLine')}</Text>

      <Button
        label={t('common:actions.continue')}
        onPress={() => router.push('/(onboarding)/notification-permission')}
        variant="sunrise"
        fullWidth
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignSelf: 'flex-start',
    padding: spacing.xs,
  },
  progress: {
    alignSelf: 'flex-end',
    marginBottom: spacing.xs,
  },
  heroCard: {
    borderRadius: 28,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  shibaWrap: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: typography.fonts.display,
    fontSize: typography.sizes.xxl,
    color: colors.textInverse,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontFamily: typography.fonts.body,
    fontSize: typography.sizes.body,
    color: colors.sparkle,
    textAlign: 'center',
  },
  chipsCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 22,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: colors.chipSurface,
    borderRadius: radius.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignSelf: 'flex-start',
  },
  chipText: {
    fontFamily: typography.fonts.ui,
    fontSize: typography.sizes.md,
    color: colors.text,
  },
  tieLine: {
    fontFamily: typography.fonts.body,
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
});
