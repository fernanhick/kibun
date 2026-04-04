import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { Screen, Button } from '@components/index';
import { useOnboardingGateStore } from '@store/onboardingGateStore';
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
  const [selectedSlots, setSelectedSlots] = useState<string[]>(['morning', 'evening']);
  const [requesting, setRequesting] = useState(false);
  const router = useRouter();

  const handleSlotToggle = (value: string) => {
    setSelectedSlots((prev) => toggleSlot(prev, value));
  };

  const handleEnable = async () => {
    if (requesting) return;
    setRequesting(true);
    setComplete();
    try {
      await Notifications.requestPermissionsAsync();
      // TODO Phase 6: schedule local notifications for selectedSlots using granted status
    } catch {
      // Permission API failure — proceed to main app regardless
    }
    router.replace('/(tabs)');
  };

  const handleSkip = () => {
    setComplete();
    router.replace('/(tabs)');
  };

  return (
    <Screen scrollable={true} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Stay on track</Text>
      <Text style={styles.subtitle}>
        Kibun works best with daily check-ins. Pick your reminder times.
      </Text>

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

      <Button
        label="Enable reminders"
        onPress={handleEnable}
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
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  groupLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text,
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
    backgroundColor: colors.primary,
  },
  chipUnselected: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
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
