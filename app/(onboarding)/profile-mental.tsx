import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
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
        <Text style={styles.title}>Your stress baseline</Text>
        <Text style={styles.subtitle}>Everyone's baseline is different. There's no wrong answer.</Text>
      </LinearGradient>

      <View style={styles.sectionCard}>
        <View style={styles.pickerGroup}>
          <OptionPicker
            label="Your typical stress level"
            options={STRESS_OPTIONS}
            selected={stressLevel}
            onSelect={setStressLevel}
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
