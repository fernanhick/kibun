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

const STRESS_VALUES = ['very-low', 'low', 'moderate', 'high', 'very-high'] as const;

export default function ProfileMentalScreen() {
  const { t } = useTranslation(['onboarding', 'common']);
  const { profile, updateProfile } = useOnboardingStore();
  const [stressLevel, setStressLevel] = useState<string | null>(profile.stressLevel);
  const router = useRouter();

  const stressOptions: PickerOption[] = STRESS_VALUES.map((value) => ({
    value, label: t(`onboarding:profileMental.stressOpt.${value}`),
  }));

  const canContinue = stressLevel !== null;

  const handleContinue = () => {
    if (!canContinue) return;
    updateProfile({ stressLevel });
    router.push('/(onboarding)/profile-coping');
  };

  return (
    <Screen scrollable={true} edgePadding="large" contentContainerStyle={styles.content}>
      <LinearGradient
        colors={[colors.skyStart, colors.skyEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <OnboardingProgress current={10} total={14} style={styles.progress} />
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('onboarding:a11y.goBack')}
          hitSlop={12}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textInverse} />
        </Pressable>
        <Text style={styles.title}>{t('onboarding:profileMental.title')}</Text>
        <Text style={styles.subtitle}>{t('onboarding:profileMental.subtitle')}</Text>
      </LinearGradient>

      <View style={styles.sectionCard}>
        <View style={styles.pickerGroup}>
          <OptionPicker
            label={t('onboarding:profileMental.stress')}
            options={stressOptions}
            selected={stressLevel}
            onSelect={setStressLevel}
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
    marginBottom: spacing.md,
  },
});
