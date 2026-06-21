import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Button, OptionPicker, OnboardingProgress } from '@components/index';
import { useOnboardingStore } from '@store/onboardingStore';
import { typography, spacing, radius } from '@constants/theme';
import { useTheme, type ThemePalette } from '@theme/ThemeContext';
import { useThemedStyles } from '@hooks/useThemedStyles';
import { PickerOption } from '@models/index';

const SOCIAL_VALUES = ['rarely', 'few-times-week', 'most-days', 'daily'] as const;
const STRESS_VALUES = ['very-low', 'low', 'moderate', 'high', 'very-high'] as const;

export default function ProfileLifeScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useTranslation(['onboarding', 'common']);
  const { profile, updateProfile } = useOnboardingStore();
  const [socialFrequency, setSocialFrequency] = useState<string | null>(profile.socialFrequency);
  const [stressLevel, setStressLevel] = useState<string | null>(profile.stressLevel);
  const router = useRouter();

  const socialOptions: PickerOption[] = SOCIAL_VALUES.map((value) => ({
    value, label: t(`onboarding:profileSocial.frequencyOpt.${value}`),
  }));
  const stressOptions: PickerOption[] = STRESS_VALUES.map((value) => ({
    value, label: t(`onboarding:profileMental.stressOpt.${value}`),
  }));

  const canContinue = socialFrequency !== null && stressLevel !== null;

  const handleContinue = () => {
    if (!canContinue) return;
    updateProfile({ socialFrequency, stressLevel });
    router.push('/(onboarding)/profile-helps-and-hopes');
  };

  return (
    <Screen scrollable={true} edgePadding="large" contentContainerStyle={styles.content}>
      <LinearGradient
        colors={[colors.skyStart, colors.skyEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <OnboardingProgress current={4} total={6} style={styles.progress} />
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('onboarding:a11y.goBack')}
          hitSlop={12}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textInverse} />
        </Pressable>
        <Text style={styles.title}>{t('onboarding:profileLife.title')}</Text>
        <Text style={styles.subtitle}>{t('onboarding:profileLife.subtitle')}</Text>
      </LinearGradient>

      <View style={styles.sectionCard}>
        <View style={styles.pickerGroup}>
          <OptionPicker
            label={t('onboarding:profileSocial.frequency')}
            options={socialOptions}
            selected={socialFrequency}
            onSelect={setSocialFrequency}
          />
        </View>

        <View style={styles.pickerGroupLast}>
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

const createStyles = (colors: ThemePalette) => StyleSheet.create({
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
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  pickerGroup: {
    marginBottom: spacing.lg,
  },
  pickerGroupLast: {
    marginBottom: spacing.md,
  },
});
