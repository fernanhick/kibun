import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Crypto from 'expo-crypto';
import * as Notifications from 'expo-notifications';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Button, OnboardingProgress } from '@components/index';
import { useOnboardingGateStore } from '@store/onboardingGateStore';
import { useNotificationPrefsStore } from '@store/notificationPrefsStore';
import { useOnboardingStore } from '@store/onboardingStore';
import { useSessionStore } from '@store/sessionStore';
import { useMoodEntryStore } from '@store/moodEntryStore';
import { scheduleSlotNotifications } from '@lib/notifications';
import { getCheckInSlot } from '@lib/checkInSlot';
import { saveProfileToSupabase } from '@lib/profileSync';
import { seedHabitsFromProfile } from '@lib/seedHabitsFromProfile';
import { NotificationSlot } from '@models/index';
import { typography, spacing, radius } from '@constants/theme';
import { useTheme, type ThemePalette } from '@theme/ThemeContext';
import { useThemedStyles } from '@hooks/useThemedStyles';

const SLOT_VALUES = ['morning', 'afternoon', 'evening', 'pre-sleep'] as const;

function toggleSlot(prev: string[], value: string): string[] {
  return prev.includes(value)
    ? prev.filter((s) => s !== value)
    : [...prev, value];
}

export default function NotificationPermissionScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useTranslation(['onboarding']);
  const { setComplete, setPersonalizationSnapshot } = useOnboardingGateStore();
  const firstMoodId = useOnboardingStore((s) => s.firstMoodId);
  const resetOnboarding = useOnboardingStore((s) => s.resetProfile);
  const [selectedSlots, setSelectedSlots] = useState<string[]>(['morning', 'evening']);
  const [requesting, setRequesting] = useState(false);
  const router = useRouter();

  const slotOptions = SLOT_VALUES.map((value) => ({
    value,
    label: t(`onboarding:notificationPermission.slotOpt.${value}.label`),
    hint: t(`onboarding:notificationPermission.slotOpt.${value}.hint`),
  }));

  const maybeLogFirstMood = () => {
    if (!firstMoodId) return;
    const entry = {
      id: Crypto.randomUUID(),
      moodId: firstMoodId,
      note: null,
      slot: getCheckInSlot(),
      loggedAt: new Date().toISOString(),
    };
    useMoodEntryStore.getState().addEntry(entry);
  };

  const handleSlotToggle = (value: string) => {
    setSelectedSlots((prev) => toggleSlot(prev, value));
  };

  const handleEnable = async () => {
    if (requesting) return;
    setRequesting(true);
    maybeLogFirstMood();

    // Persist profile to Supabase before clearing in-memory state
    const profile = useOnboardingStore.getState().profile;
    const persistedFirstMoodId = useOnboardingStore.getState().firstMoodId;
    const userId = useSessionStore.getState().session?.userId;
    if (userId) saveProfileToSupabase(userId, profile);

    // Snapshot personalization for analyzing / plan-snapshot / paywall — survives
    // app kills via AsyncStorage, so cold-start re-entry to /paywall stays personal.
    setPersonalizationSnapshot({ profile, firstMoodId: persistedFirstMoodId });
    seedHabitsFromProfile(profile);
    setComplete();
    resetOnboarding();

    const slots = selectedSlots as NotificationSlot[];
    const { setSlots, setPermissionGranted } = useNotificationPrefsStore.getState();
    setSlots(slots);

    try {
      const result = await Notifications.requestPermissionsAsync();
      setPermissionGranted(result.granted);
      if (result.granted) {
        await scheduleSlotNotifications(slots, false);
      }
    } catch {
      // Permission API failure — proceed to main app regardless
    }
    router.replace('/(onboarding)/analyzing');
  };

  const handleSkip = () => {
    maybeLogFirstMood();

    // Persist profile to Supabase before clearing in-memory state
    const profile = useOnboardingStore.getState().profile;
    const persistedFirstMoodId = useOnboardingStore.getState().firstMoodId;
    const userId = useSessionStore.getState().session?.userId;
    if (userId) saveProfileToSupabase(userId, profile);

    setPersonalizationSnapshot({ profile, firstMoodId: persistedFirstMoodId });
    seedHabitsFromProfile(profile);
    setComplete();
    resetOnboarding();
    router.replace('/(onboarding)/analyzing');
  };

  return (
    <Screen scrollable={true} edgePadding="large" contentContainerStyle={styles.content}>
      <LinearGradient
        colors={[colors.skyStart, colors.skyEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <OnboardingProgress current={8} total={8} style={styles.progress} />
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('onboarding:a11y.goBack')}
          hitSlop={12}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textInverse} />
        </Pressable>
        <Text style={styles.title}>{t('onboarding:notificationPermission.title')}</Text>
        <Text style={styles.subtitle}>{t('onboarding:notificationPermission.subtitle')}</Text>
      </LinearGradient>

      <View style={styles.sectionCard}>
        <Text style={styles.groupLabel}>{t('onboarding:notificationPermission.groupLabel')}</Text>
        <View style={styles.chipsRow}>
          {slotOptions.map((option) => {
            const isSelected = selectedSlots.includes(option.value);
            return (
              <Pressable
                key={option.value}
                onPress={() => handleSlotToggle(option.value)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                style={[styles.chip, isSelected ? styles.chipSelected : styles.chipUnselected]}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={t('onboarding:a11y.reminderHint', { label: option.label, hint: option.hint })}
              >
                <Text style={[styles.chipLabel, isSelected ? styles.chipLabelSelected : styles.chipLabelUnselected]}>
                  {option.label}
                </Text>
                <Text style={[styles.chipHint, isSelected ? styles.chipHintSelected : styles.chipHintUnselected]}>
                  {option.hint}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Button
        label={t('onboarding:notificationPermission.ctaEnable')}
        onPress={handleEnable}
        variant="sunrise"
        loading={requesting}
        fullWidth
      />
      <View style={styles.skipButton}>
        <Button
          label={t('onboarding:notificationPermission.ctaSkip')}
          onPress={handleSkip}
          variant="ghost"
          fullWidth
        />
      </View>
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
    alignItems: 'center',
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
  chipLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  chipLabelSelected: {
    color: colors.textInverse,
  },
  chipLabelUnselected: {
    color: colors.text,
  },
  chipHint: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.regular,
    opacity: 0.75,
  },
  chipHintSelected: {
    color: colors.textInverse,
  },
  chipHintUnselected: {
    color: colors.text,
  },
  skipButton: {
    marginTop: spacing.md,
  },
});
