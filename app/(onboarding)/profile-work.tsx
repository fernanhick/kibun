import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Button, OptionPicker } from '@components/index';
import { useOnboardingStore } from '@store/onboardingStore';
import { colors, typography, spacing } from '@constants/theme';
import { PickerOption } from '@models/index';

const EMPLOYMENT_OPTIONS: PickerOption[] = [
  { label: 'Employed', value: 'employed' },
  { label: 'Self-employed', value: 'self-employed' },
  { label: 'Student', value: 'student' },
  { label: 'Not working', value: 'not-working' },
  { label: 'Retired', value: 'retired' },
];

const WORK_SETTING_OPTIONS: PickerOption[] = [
  { label: 'Office', value: 'office' },
  { label: 'Remote', value: 'remote' },
  { label: 'Hybrid', value: 'hybrid' },
];

const HOURS_OPTIONS: PickerOption[] = [
  { label: '<20h', value: 'under-20' },
  { label: '20–35h', value: '20-35' },
  { label: '35–45h', value: '35-45' },
  { label: '45h+', value: 'over-45' },
];

const SHOWS_WORK_DETAIL = new Set(['employed', 'self-employed']);

export default function ProfileWorkScreen() {
  const { profile, updateProfile } = useOnboardingStore();
  const [employment, setEmployment] = useState<string | null>(profile.employment);
  const [workSetting, setWorkSetting] = useState<string | null>(profile.workSetting);
  const [workHours, setWorkHours] = useState<string | null>(profile.workHours);
  const router = useRouter();

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
    <Screen scrollable={true}>
      <View style={styles.content}>
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
          <Text style={styles.title}>How do you work?</Text>
          <Text style={styles.subtitle}>Your work style can shape your mood patterns.</Text>
        </LinearGradient>

        <View style={styles.sectionCard}>
          <View style={styles.pickerGroup}>
            <OptionPicker
              label="Employment"
              options={EMPLOYMENT_OPTIONS}
              selected={employment}
              onSelect={handleEmploymentSelect}
            />
          </View>

          {showWorkDetail && (
            <>
              <View style={styles.pickerGroup}>
                <OptionPicker
                  label="Work setting"
                  options={WORK_SETTING_OPTIONS}
                  selected={workSetting}
                  onSelect={setWorkSetting}
                />
              </View>

              <View style={styles.pickerGroup}>
                <OptionPicker
                  label="Hours per week (optional)"
                  options={HOURS_OPTIONS}
                  selected={workHours}
                  onSelect={setWorkHours}
                />
              </View>
            </>
          )}
        </View>

        <View style={styles.cta}>
          <Button
            label="Continue"
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
