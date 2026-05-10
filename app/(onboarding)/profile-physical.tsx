import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Button, OptionPicker, OnboardingProgress } from '@components/index';
import { useOnboardingStore } from '@store/onboardingStore';
import { colors, typography, spacing } from '@constants/theme';
import { PickerOption } from '@models/index';

const SLEEP_VALUES = ['under-5', '5-6', '6-7', '7-8', '8-9', 'over-9'] as const;
const EXERCISE_VALUES = ['never', '1-2-week', '3-4-week', 'daily'] as const;

export default function ProfilePhysicalScreen() {
  const { t } = useTranslation(['onboarding', 'common']);
  const { profile, updateProfile } = useOnboardingStore();
  const [sleepHours, setSleepHours] = useState<string | null>(profile.sleepHours);
  const [exercise, setExercise] = useState<string | null>(profile.exercise);
  const router = useRouter();

  const sleepOptions: PickerOption[] = SLEEP_VALUES.map((value) => ({
    value, label: t(`onboarding:profilePhysical.sleepOpt.${value}`),
  }));
  const exerciseOptions: PickerOption[] = EXERCISE_VALUES.map((value) => ({
    value, label: t(`onboarding:profilePhysical.exerciseOpt.${value}`),
  }));

  const canContinue = sleepHours !== null && exercise !== null;

  const handleContinue = () => {
    if (!canContinue) return;
    updateProfile({ sleepHours, exercise });
    router.push('/(onboarding)/wisdom-mind-body');
  };

  return (
    <Screen scrollable={true} edgePadding="large">
      <View style={styles.content}>
        <LinearGradient
          colors={[colors.skyStart, colors.skyEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <OnboardingProgress current={7} total={14} style={styles.progress} />
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={t('onboarding:a11y.goBack')}
            hitSlop={12}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color={colors.textInverse} />
          </Pressable>
          <Text style={styles.title}>{t('onboarding:profilePhysical.title')}</Text>
          <Text style={styles.subtitle}>{t('onboarding:profilePhysical.subtitle')}</Text>
        </LinearGradient>

        <View style={styles.sectionCard}>
          <View style={styles.pickerGroup}>
            <OptionPicker
              label={t('onboarding:profilePhysical.sleep')}
              options={sleepOptions}
              selected={sleepHours}
              onSelect={setSleepHours}
            />
          </View>

          <View style={styles.pickerGroupLast}>
            <OptionPicker
              label={t('onboarding:profilePhysical.exercise')}
              options={exerciseOptions}
              selected={exercise}
              onSelect={setExercise}
            />
          </View>
        </View>

        <Button
          label={t('common:actions.continue')}
          onPress={handleContinue}
          variant="sunrise"
          disabled={!canContinue}
          fullWidth
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.lg,
  },
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
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.semibold,
    color: colors.textInverse,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.sizes.body,
    color: colors.sparkle,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  pickerGroup: {
    marginBottom: spacing.lg,
  },
  pickerGroupLast: {
    marginBottom: spacing.xl,
  },
});
