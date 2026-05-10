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

const EMPLOYMENT_VALUES = ['employed', 'self-employed', 'student', 'not-working', 'retired'] as const;
const SETTING_VALUES = ['office', 'remote', 'hybrid'] as const;
const HOURS_VALUES = ['under-20', '20-35', '35-45', 'over-45'] as const;
const SHOWS_WORK_DETAIL = new Set<string>(['employed', 'self-employed']);

export default function ProfileWorkScreen() {
  const { t } = useTranslation(['onboarding', 'common']);
  const { profile, updateProfile } = useOnboardingStore();
  const [employment, setEmployment] = useState<string | null>(profile.employment);
  const [workSetting, setWorkSetting] = useState<string | null>(profile.workSetting);
  const [workHours, setWorkHours] = useState<string | null>(profile.workHours);
  const router = useRouter();

  const employmentOptions: PickerOption[] = EMPLOYMENT_VALUES.map((value) => ({
    value, label: t(`onboarding:profileWork.employmentOpt.${value}`),
  }));
  const settingOptions: PickerOption[] = SETTING_VALUES.map((value) => ({
    value, label: t(`onboarding:profileWork.settingOpt.${value}`),
  }));
  const hoursOptions: PickerOption[] = HOURS_VALUES.map((value) => ({
    value, label: t(`onboarding:profileWork.hoursOpt.${value}`),
  }));

  const showWorkDetail = employment !== null && SHOWS_WORK_DETAIL.has(employment);
  const canContinue = employment !== null;

  const handleEmploymentSelect = (value: string) => {
    setEmployment(value);
    if (!SHOWS_WORK_DETAIL.has(value)) {
      setWorkSetting(null);
      setWorkHours(null);
    }
  };

  const handleContinue = () => {
    if (!canContinue) return;
    updateProfile({
      employment,
      workSetting: showWorkDetail ? workSetting : null,
      workHours: showWorkDetail ? workHours : null,
    });
    router.push('/(onboarding)/profile-physical');
  };

  return (
    <Screen scrollable={true} edgePadding="large">
      <View style={styles.content}>
        <LinearGradient
          colors={[colors.skyStart, colors.skyEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <OnboardingProgress current={6} total={14} style={styles.progress} />
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={t('onboarding:a11y.goBack')}
            hitSlop={12}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color={colors.textInverse} />
          </Pressable>
          <Text style={styles.title}>{t('onboarding:profileWork.title')}</Text>
          <Text style={styles.subtitle}>{t('onboarding:profileWork.subtitle')}</Text>
        </LinearGradient>

        <View style={styles.sectionCard}>
          <View style={styles.pickerGroup}>
            <OptionPicker
              label={t('onboarding:profileWork.employment')}
              options={employmentOptions}
              selected={employment}
              onSelect={handleEmploymentSelect}
            />
          </View>

          {showWorkDetail && (
            <>
              <View style={styles.pickerGroup}>
                <OptionPicker
                  label={t('onboarding:profileWork.workSetting')}
                  options={settingOptions}
                  selected={workSetting}
                  onSelect={setWorkSetting}
                />
              </View>

              <View style={styles.pickerGroup}>
                <OptionPicker
                  label={t('onboarding:profileWork.workHours')}
                  options={hoursOptions}
                  selected={workHours}
                  onSelect={setWorkHours}
                />
              </View>
            </>
          )}
        </View>

        <View style={styles.cta}>
          <Button
            label={t('common:actions.continue')}
            onPress={handleContinue}
            variant="sunrise"
            disabled={!canContinue}
            fullWidth
          />
        </View>
      </View>
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
    marginBottom: spacing.lg,
  },
  cta: {
    marginTop: spacing.xl,
  },
});
