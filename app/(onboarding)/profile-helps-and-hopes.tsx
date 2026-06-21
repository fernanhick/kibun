import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Button, OnboardingProgress } from '@components/index';
import { useOnboardingStore } from '@store/onboardingStore';
import { typography, spacing, radius } from '@constants/theme';
import { useTheme, type ThemePalette } from '@theme/ThemeContext';
import { useThemedStyles } from '@hooks/useThemedStyles';

const GOAL_VALUES = [
  'understand-emotions',
  'reduce-stress',
  'improve-sleep',
  'track-energy',
  'self-awareness',
  'mood-patterns',
] as const;

function toggleValue(prev: string[], value: string): string[] {
  return prev.includes(value)
    ? prev.filter((v) => v !== value)
    : [...prev, value];
}

export default function ProfileHelpsAndHopesScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useTranslation(['onboarding', 'common']);
  const { profile, updateProfile } = useOnboardingStore();
  const [goals, setGoals] = useState<string[]>(profile.goals);
  const router = useRouter();

  const canContinue = goals.length > 0;

  const handleContinue = () => {
    if (!canContinue) return;
    updateProfile({ goals });
    router.push('/(onboarding)/notification-permission');
  };

  return (
    <Screen scrollable={true} edgePadding="large" contentContainerStyle={styles.content}>
      <LinearGradient
        colors={[colors.skyStart, colors.skyEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <OnboardingProgress current={5} total={6} style={styles.progress} />
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('onboarding:a11y.goBack')}
          hitSlop={12}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textInverse} />
        </Pressable>
        <Text style={styles.title}>{t('onboarding:profileHelpsAndHopes.title')}</Text>
        <Text style={styles.subtitle}>{t('onboarding:profileHelpsAndHopes.subtitle')}</Text>
      </LinearGradient>

      <View style={styles.sectionCard}>
        <Text style={styles.groupLabel}>{t('onboarding:profileGoals.groupLabel')}</Text>
        <View
          style={styles.chipsRowLast}
          accessibilityRole="none"
          accessibilityLabel={t('onboarding:profileGoals.a11yLabel')}
        >
          {GOAL_VALUES.map((value) => {
            const isSelected = goals.includes(value);
            const label = t(`onboarding:profileGoals.options.${value}`);
            return (
              <Pressable
                key={value}
                onPress={() => setGoals((prev) => toggleValue(prev, value))}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                style={[styles.chip, isSelected ? styles.chipSelected : styles.chipUnselected]}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={label}
              >
                <Text style={[styles.chipText, isSelected ? styles.chipTextSelected : styles.chipTextUnselected]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Button
        label={t('common:actions.continue')}
        onPress={handleContinue}
        variant="sunrise"
        disabled={!canContinue}
        fullWidth
      />
    </Screen>
  );
}

const createStyles = (colors: ThemePalette) => StyleSheet.create({
  content: {
    paddingTop: spacing.lg,
  },
  progress: {
    alignSelf: 'flex-end',
    marginBottom: spacing.xs,
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: spacing.xs,
  },
  heroCard: {
    borderRadius: radius.xxl,
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
    borderRadius: radius.card,
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
  chipsRowLast: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
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
