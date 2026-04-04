import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
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
      <Text style={styles.title}>What are you hoping for?</Text>
      <Text style={styles.subtitle}>Pick everything that feels right.</Text>

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
  groupLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text,
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
    backgroundColor: colors.primary,
  },
  chipUnselected: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
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
