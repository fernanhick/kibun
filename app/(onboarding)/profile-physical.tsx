import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen, Button, OptionPicker } from '@components/index';
import { useOnboardingStore } from '@store/onboardingStore';
import { colors, typography, spacing } from '@constants/theme';
import { PickerOption } from '@models/index';

const SLEEP_OPTIONS: PickerOption[] = [
  { label: '<5h', value: 'under-5' },
  { label: '5–6h', value: '5-6' },
  { label: '6–7h', value: '6-7' },
  { label: '7–8h', value: '7-8' },
  { label: '8–9h', value: '8-9' },
  { label: '9h+', value: 'over-9' },
];

const EXERCISE_OPTIONS: PickerOption[] = [
  { label: 'Never', value: 'never' },
  { label: '1–2×/week', value: '1-2-week' },
  { label: '3–4×/week', value: '3-4-week' },
  { label: 'Daily', value: 'daily' },
];

export default function ProfilePhysicalScreen() {
  const { profile, updateProfile } = useOnboardingStore();
  const [sleepHours, setSleepHours] = useState<string | null>(profile.sleepHours);
  const [exercise, setExercise] = useState<string | null>(profile.exercise);
  const router = useRouter();

  const canContinue = sleepHours !== null && exercise !== null;

  const handleContinue = () => {
    if (!canContinue) return;
    updateProfile({ sleepHours, exercise });
    router.push('/(onboarding)/profile-social');
  };

  return (
    <Screen scrollable={true}>
      <View style={styles.content}>
        <LinearGradient
          colors={[colors.skyStart, colors.skyEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <Text style={styles.title}>Your physical routine</Text>
          <Text style={styles.subtitle}>Sleep and movement have a big impact on how we feel.</Text>
        </LinearGradient>

        <View style={styles.sectionCard}>
          <View style={styles.pickerGroup}>
            <OptionPicker
              label="Sleep per night (average)"
              options={SLEEP_OPTIONS}
              selected={sleepHours}
              onSelect={setSleepHours}
            />
          </View>

          <View style={styles.pickerGroupLast}>
            <OptionPicker
              label="Exercise frequency"
              options={EXERCISE_OPTIONS}
              selected={exercise}
              onSelect={setExercise}
            />
          </View>
        </View>

        <Button
          label="Continue"
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
