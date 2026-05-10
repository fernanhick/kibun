import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Button, OnboardingProgress } from '@components/index';
import { useOnboardingStore } from '@store/onboardingStore';
import { COPING_OPTIONS } from '@constants/copingOptions';
import { colors, typography, spacing, radius } from '@constants/theme';

function toggleCoping(prev: string[], value: string): string[] {
  return prev.includes(value)
    ? prev.filter((v) => v !== value)
    : [...prev, value];
}

export default function ProfileCopingScreen() {
  const { t } = useTranslation(['onboarding', 'common']);
  const { profile, updateProfile } = useOnboardingStore();
  const [selected, setSelected] = useState<string[]>(profile.copingStrategies);
  const router = useRouter();

  const canContinue = selected.length > 0;

  const handleToggle = (value: string) => {
    setSelected((prev) => toggleCoping(prev, value));
  };

  const handleContinue = () => {
    if (!canContinue) return;
    updateProfile({ copingStrategies: selected });
    router.push('/(onboarding)/profile-goals');
  };

  return (
    <Screen scrollable={true} edgePadding="large" contentContainerStyle={styles.content}>
      <LinearGradient
        colors={[colors.skyStart, colors.skyEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <OnboardingProgress current={11} total={14} style={styles.progress} />
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('onboarding:a11y.goBack')}
          hitSlop={12}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textInverse} />
        </Pressable>
        <Text style={styles.title}>{t('onboarding:profileCoping.title')}</Text>
        <Text style={styles.subtitle}>{t('onboarding:profileCoping.subtitle')}</Text>
      </LinearGradient>

      <View style={styles.sectionCard}>
        <Text style={styles.groupLabel}>{t('onboarding:profileCoping.groupLabel')}</Text>
        <View
          style={styles.chipsRow}
          accessibilityRole="none"
          accessibilityLabel={t('onboarding:profileCoping.a11yLabel')}
        >
          {COPING_OPTIONS.map((option) => {
            const isSelected = selected.includes(option.value);
            const label = t(`onboarding:profileCoping.options.${option.value}`);
            return (
              <Pressable
                key={option.value}
                onPress={() => handleToggle(option.value)}
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

const styles = StyleSheet.create({
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
