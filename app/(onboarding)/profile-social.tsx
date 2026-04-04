import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Button, OptionPicker } from '@components/index';
import { useOnboardingStore } from '@store/onboardingStore';
import { colors, typography, spacing } from '@constants/theme';
import { PickerOption } from '@models/index';

const SOCIAL_OPTIONS: PickerOption[] = [
  { label: 'Rarely', value: 'rarely' },
  { label: 'A few times a week', value: 'few-times-week' },
  { label: 'Most days', value: 'most-days' },
  { label: 'Daily', value: 'daily' },
];

export default function ProfileSocialScreen() {
  const { profile, updateProfile } = useOnboardingStore();
  const [socialFrequency, setSocialFrequency] = useState<string | null>(profile.socialFrequency);
  const router = useRouter();

  const canContinue = socialFrequency !== null;

  const handleContinue = () => {
    if (!canContinue) return;
    updateProfile({ socialFrequency });
    router.push('/(onboarding)/profile-mental');
  };

  return (
    <Screen scrollable={true} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Your social life</Text>
      <Text style={styles.subtitle}>Social connection shapes how we feel day to day.</Text>

      <View style={styles.pickerGroup}>
        <OptionPicker
          label="How often do you socialise?"
          options={SOCIAL_OPTIONS}
          selected={socialFrequency}
          onSelect={setSocialFrequency}
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
