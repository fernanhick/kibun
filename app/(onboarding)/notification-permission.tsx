import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import * as Crypto from 'expo-crypto';
import * as Notifications from 'expo-notifications';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Button } from '@components/index';
import { useOnboardingGateStore } from '@store/onboardingGateStore';
import { useNotificationPrefsStore } from '@store/notificationPrefsStore';
import { useOnboardingStore } from '@store/onboardingStore';
import { useSessionStore } from '@store/sessionStore';
import { useMoodEntryStore } from '@store/moodEntryStore';
import { scheduleSlotNotifications } from '@lib/notifications';
import { getCheckInSlot } from '@lib/checkInSlot';
import { saveProfileToSupabase } from '@lib/profileSync';
import { NotificationSlot } from '@models/index';
import { colors, typography, spacing, radius } from '@constants/theme';

interface SlotOption {
  label: string;
  hint: string;
  value: string;
}

const SLOT_OPTIONS: SlotOption[] = [
  { label: 'Morning', hint: 'around 9am', value: 'morning' },
  { label: 'Afternoon', hint: 'around 2pm', value: 'afternoon' },
  { label: 'Evening', hint: 'around 7pm', value: 'evening' },
  { label: 'Pre-sleep', hint: 'around 10pm', value: 'pre-sleep' },
];

function toggleSlot(prev: string[], value: string): string[] {
  return prev.includes(value)
    ? prev.filter((s) => s !== value)
    : [...prev, value];
}

export default function NotificationPermissionScreen() {
  const { setComplete } = useOnboardingGateStore();
  const firstMoodId = useOnboardingStore((s) => s.firstMoodId);
  const resetOnboarding = useOnboardingStore((s) => s.resetProfile);
  const [selectedSlots, setSelectedSlots] = useState<string[]>(['morning', 'evening']);
  const [requesting, setRequesting] = useState(false);
  const router = useRouter();

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
    const userId = useSessionStore.getState().session?.userId;
    if (userId) saveProfileToSupabase(userId, profile);

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
    router.replace('/(tabs)');
  };

  const handleSkip = () => {
    maybeLogFirstMood();

    // Persist profile to Supabase before clearing in-memory state
    const profile = useOnboardingStore.getState().profile;
    const userId = useSessionStore.getState().session?.userId;
    if (userId) saveProfileToSupabase(userId, profile);

    setComplete();
    resetOnboarding();
    router.replace('/(tabs)');
  };

  return (
    <Screen scrollable={true} contentContainerStyle={styles.content}>
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
        <Text style={styles.title}>Stay on track</Text>
        <Text style={styles.subtitle}>
          Kibun works best with daily check-ins. Pick your reminder times.
        </Text>
      </LinearGradient>

      <View style={styles.sectionCard}>
        <Text style={styles.groupLabel}>Reminder times</Text>
        <View style={styles.chipsRow}>
          {SLOT_OPTIONS.map((option) => {
            const isSelected = selectedSlots.includes(option.value);
            return (
              <Pressable
                key={option.value}
                onPress={() => handleSlotToggle(option.value)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                style={[styles.chip, isSelected ? styles.chipSelected : styles.chipUnselected]}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={`${option.label} reminder, ${option.hint}`}
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
        label="Enable reminders"
        onPress={handleEnable}
        variant="sunrise"
        loading={requesting}
        fullWidth
      />
      <View style={styles.skipButton}>
        <Button
          label="Maybe later"
          onPress={handleSkip}
          variant="ghost"
          fullWidth
        />
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
