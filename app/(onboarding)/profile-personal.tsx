import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Button, OptionPicker, OnboardingProgress } from '@components/index';
import { useOnboardingStore } from '@store/onboardingStore';
import { colors, typography, spacing, radius } from '@constants/theme';
import { PickerOption } from '@models/index';

const AGE_VALUES = ['under-18', '18-24', '25-34', '35-44', '45-54', '55-64', '65+'] as const;
const GENDER_VALUES = ['man', 'woman', 'non-binary', 'prefer-not-to-say'] as const;

export default function ProfilePersonalScreen() {
  const { t } = useTranslation(['onboarding', 'common']);
  const { profile, updateProfile } = useOnboardingStore();
  const [name, setName] = useState(profile.name);
  const [ageRange, setAgeRange] = useState<string | null>(profile.ageRange);
  const [gender, setGender] = useState<string | null>(profile.gender);
  const router = useRouter();

  const ageOptions: PickerOption[] = AGE_VALUES.map((value) => ({
    value,
    label: t(`onboarding:profilePersonal.age.${value}`),
  }));
  const genderOptions: PickerOption[] = GENDER_VALUES.map((value) => ({
    value,
    label: t(`onboarding:profilePersonal.genderOpt.${value}`),
  }));

  const canContinue = name.trim().length > 0 && ageRange !== null;

  const handleContinue = () => {
    if (!canContinue) return;
    updateProfile({ name: name.trim(), ageRange, gender });
    router.push('/(onboarding)/profile-work');
  };

  return (
    <Screen scrollable={true} edgePadding="large" contentContainerStyle={styles.content}>
      <LinearGradient
        colors={[colors.skyStart, colors.skyEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <OnboardingProgress current={5} total={14} style={styles.progress} />
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('onboarding:a11y.goBack')}
          hitSlop={12}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textInverse} />
        </Pressable>
        <Text style={styles.title}>{t('onboarding:profilePersonal.title')}</Text>
        <Text style={styles.subtitle}>{t('onboarding:profilePersonal.subtitle')}</Text>
      </LinearGradient>

      <View style={styles.sectionCard}>
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{t('onboarding:profilePersonal.fieldName')}</Text>
          <TextInput
            style={styles.textInput}
            value={name}
            onChangeText={setName}
            placeholder={t('onboarding:profilePersonal.namePlaceholder')}
            placeholderTextColor={colors.textDisabled}
            autoCapitalize="words"
            returnKeyType="done"
            maxLength={50}
            onSubmitEditing={() => Keyboard.dismiss()}
            accessibilityLabel={t('onboarding:profilePersonal.fieldName')}
          />
        </View>

        <View style={styles.pickerGroup}>
          <OptionPicker
            label={t('onboarding:profilePersonal.ageRange')}
            options={ageOptions}
            selected={ageRange}
            onSelect={setAgeRange}
          />
        </View>

        <View style={styles.pickerGroupLast}>
          <OptionPicker
            label={t('onboarding:profilePersonal.gender')}
            options={genderOptions}
            selected={gender}
            onSelect={setGender}
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
    marginBottom: 0,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 22,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  fieldGroup: {
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: colors.chipBorder,
    borderRadius: radius.lg,
    padding: spacing.md,
    fontSize: typography.sizes.md,
    color: colors.text,
    backgroundColor: colors.chipSurface,
  },
  pickerGroup: {
    marginBottom: spacing.lg,
  },
  pickerGroupLast: {
    marginBottom: spacing.xl,
  },
});
