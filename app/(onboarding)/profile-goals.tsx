import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Button } from '@components/index';
import { useOnboardingStore } from '@store/onboardingStore';
import { colors, typography, spacing, radius } from '@constants/theme';
import { PickerOption } from '@models/index';

const GOAL_OPTIONS: PickerOption[] = [
  { label: 'Understand my emotions', value: 'understand-emotions' },
  { label: 'Reduce stress', value: 'reduce-stress' },
  { label: 'Improve sleep', value: 'improve-sleep' },
  { label: 'Track my energy', value: 'track-energy' },
  { label: 'Build self-awareness', value: 'self-awareness' },
  { label: 'Notice mood patterns', value: 'mood-patterns' },
];

// Multi-select toggle — module-level pure function (no stale closure risk)
function toggleGoal(prev: string[], value: string): string[] {
  return prev.includes(value)
    ? prev.filter((g) => g !== value)
    : [...prev, value];
}

export default function ProfileGoalsScreen() {
  const { profile, updateProfile } = useOnboardingStore();
  const [selectedGoals, setSelectedGoals] = useState<string[]>(profile.goals);
  const router = useRouter();

  const canContinue = selectedGoals.length > 0;

  const handleGoalToggle = (value: string) => {
    setSelectedGoals((prev) => toggleGoal(prev, value));
  };

  const handleContinue = () => {
    if (!canContinue) return;
    updateProfile({ goals: selectedGoals });
    router.push('/(onboarding)/notification-permission');
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
        <Text style={styles.title}>What are you hoping for?</Text>
        <Text style={styles.subtitle}>Pick everything that feels right.</Text>
      </LinearGradient>

      <View style={styles.sectionCard}>
        <Text style={styles.groupLabel}>Your goals</Text>
        <View
          style={styles.chipsRow}
          accessibilityRole="none"
          accessibilityLabel="Goals"
        >
          {GOAL_OPTIONS.map((option) => {
            const isSelected = selectedGoals.includes(option.value);
            return (
              <Pressable
                key={option.value}
                onPress={() => handleGoalToggle(option.value)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                style={[styles.chip, isSelected ? styles.chipSelected : styles.chipUnselected]}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={option.label}
              >
                <Text style={[styles.chipText, isSelected ? styles.chipTextSelected : styles.chipTextUnselected]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
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
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 22,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  groupLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
  },
  chipSelected: {
    backgroundColor: colors.warmCtaStart,
    borderWidth: 1,
    borderColor: colors.warmCtaEnd,
  },
  chipUnselected: {
    backgroundColor: colors.chipSurface,
    borderWidth: 1,
    borderColor: colors.chipBorder,
  },
  chipText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  chipTextSelected: {
    color: colors.textInverse,
  },
  chipTextUnselected: {
    color: colors.text,
  },
});
