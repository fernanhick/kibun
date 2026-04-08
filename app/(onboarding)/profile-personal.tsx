import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen, Button, OptionPicker } from '@components/index';
import { useOnboardingStore } from '@store/onboardingStore';
import { colors, typography, spacing, radius } from '@constants/theme';
import { PickerOption } from '@models/index';

const AGE_OPTIONS: PickerOption[] = [
  { label: 'Under 18', value: 'under-18' },
  { label: '18–24', value: '18-24' },
  { label: '25–34', value: '25-34' },
  { label: '35–44', value: '35-44' },
  { label: '45–54', value: '45-54' },
  { label: '55–64', value: '55-64' },
  { label: '65+', value: '65+' },
];

const GENDER_OPTIONS: PickerOption[] = [
  { label: 'Man', value: 'man' },
  { label: 'Woman', value: 'woman' },
  { label: 'Non-binary', value: 'non-binary' },
  { label: 'Prefer not to say', value: 'prefer-not-to-say' },
];

export default function ProfilePersonalScreen() {
  const { profile, updateProfile } = useOnboardingStore();
  const [name, setName] = useState(profile.name);
  const [ageRange, setAgeRange] = useState<string | null>(profile.ageRange);
  const [gender, setGender] = useState<string | null>(profile.gender);
  const router = useRouter();

  const canContinue = name.trim().length > 0 && ageRange !== null;

  const handleContinue = () => {
    if (!canContinue) return;
    updateProfile({ name: name.trim(), ageRange, gender });
    router.push('/(onboarding)/profile-work');
  };

  return (
    <Screen scrollable={true} contentContainerStyle={styles.content}>
      <LinearGradient
        colors={[colors.skyStart, colors.skyEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <Text style={styles.title}>Tell us about yourself</Text>
        <Text style={styles.subtitle}>This helps Kibun personalise your insights.</Text>
      </LinearGradient>

      <View style={styles.sectionCard}>
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>First name</Text>
          <TextInput
            style={styles.textInput}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Alex"
            placeholderTextColor={colors.textDisabled}
            autoCapitalize="words"
            returnKeyType="done"
            maxLength={50}
            onSubmitEditing={() => Keyboard.dismiss()}
            accessibilityLabel="First name"
          />
        </View>

        <View style={styles.pickerGroup}>
          <OptionPicker
            label="Age range"
            options={AGE_OPTIONS}
            selected={ageRange}
            onSelect={setAgeRange}
          />
        </View>

        <View style={styles.pickerGroupLast}>
          <OptionPicker
            label="Gender (optional)"
            options={GENDER_OPTIONS}
            selected={gender}
            onSelect={setGender}
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
