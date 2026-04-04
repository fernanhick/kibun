import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Button, OptionPicker } from '@components/index';
import { useOnboardingStore } from '@store/onboardingStore';
import { colors, typography, spacing } from '@constants/theme';
import { PickerOption } from '@models/index';

const STRESS_OPTIONS: PickerOption[] = [
  { label: 'Very low', value: 'very-low' },
  { label: 'Low', value: 'low' },
  { label: 'Moderate', value: 'moderate' },
  { label: 'High', value: 'high' },
  { label: 'Very high', value: 'very-high' },
];

export default function ProfileMentalScreen() {
  const { profile, updateProfile } = useOnboardingStore();
  const [stressLevel, setStressLevel] = useState<string | null>(profile.stressLevel);
  const router = useRouter();

  const canContinue = stressLevel !== null;

  const handleContinue = () => {
    if (!canContinue) return;
    updateProfile({ stressLevel });
    router.push('/(onboarding)/profile-goals');
  };

  return (
    <Screen scrollable={true} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Your stress baseline</Text>
      <Text style={styles.subtitle}>Everyone's baseline is different. There's no wrong answer.</Text>

      <View style={styles.pickerGroup}>
        <OptionPicker
          label="Your typical stress level"
          options={STRESS_OPTIONS}
          selected={stressLevel}
          onSelect={setStressLevel}
        />
      </View>

      <Button
        label="Continue"
        onPress={handleContinue}
        disabled={!canContinue}
        fullWidth
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.lg,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  pickerGroup: {
    marginBottom: spacing.xl,
  },
});
