import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
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
      <LinearGradient
        colors={[colors.skyStart, colors.skyEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={12}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textInverse} />
        </Pressable>
        <Text style={styles.title}>Your social life</Text>
        <Text style={styles.subtitle}>Social connection shapes how we feel day to day.</Text>
      </LinearGradient>

      <View style={styles.sectionCard}>
        <View style={styles.pickerGroup}>
          <OptionPicker
            label="How often do you socialise?"
            options={SOCIAL_OPTIONS}
            selected={socialFrequency}
            onSelect={setSocialFrequency}
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
    marginBottom: spacing.md,
  },
});
