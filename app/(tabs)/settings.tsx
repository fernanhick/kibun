import React, { useState, useCallback, useRef } from 'react';
import { View, Text, Switch, Pressable, StyleSheet, Linking } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { Screen } from '@components/index';
import { useNotificationPrefsStore } from '@store/notificationPrefsStore';
import { scheduleSlotNotifications } from '@lib/notifications';
import type { NotificationSlot } from '@models/index';
import { colors, typography, spacing, radius } from '@constants/theme';

interface SlotRow {
  slot: NotificationSlot;
  label: string;
  hint: string;
}

const SLOT_ROWS: SlotRow[] = [
  { slot: 'morning', label: 'Morning', hint: 'Around 9 am' },
  { slot: 'afternoon', label: 'Afternoon', hint: 'Around 2 pm' },
  { slot: 'evening', label: 'Evening', hint: 'Around 7 pm' },
  { slot: 'pre-sleep', label: 'Pre-sleep', hint: 'Around 10 pm' },
];

export default function SettingsScreen() {
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedSlots = useNotificationPrefsStore((s) => s.selectedSlots);
  const streakNudgeEnabled = useNotificationPrefsStore((s) => s.streakNudgeEnabled);
  const { setSlots, setStreakNudgeEnabled, setPermissionGranted } = useNotificationPrefsStore.getState();

  // Re-check permission on every screen focus — critical for detecting changes
  // after user returns from OS Settings via Linking.openSettings().
  useFocusEffect(
    useCallback(() => {
      Notifications.getPermissionsAsync().then((result) => {
        const status = result.granted ? 'granted' : result.canAskAgain ? 'undetermined' : 'denied';
        setPermissionStatus(status);
        setPermissionGranted(result.granted);
      });
    }, [])
  );

  const isDisabled = permissionStatus !== 'granted';

  const reschedule = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const { selectedSlots: slots, streakNudgeEnabled: nudge } = useNotificationPrefsStore.getState();
      try {
        await scheduleSlotNotifications(slots, nudge);
      } catch (error) {
        if (__DEV__) {
          console.error('[kibun:notif] Reschedule failed:', error);
        }
      }
    }, 300);
  }, []);

  const handleSlotToggle = (slot: NotificationSlot) => {
    const current = useNotificationPrefsStore.getState().selectedSlots;
    const updated = current.includes(slot)
      ? current.filter((s) => s !== slot)
      : [...current, slot];
    setSlots(updated);
    reschedule();
  };

  const handleStreakToggle = (value: boolean) => {
    setStreakNudgeEnabled(value);
    reschedule();
  };

  return (
    <Screen scrollable={true}>
      <Text style={styles.screenTitle} accessibilityRole="header">
        Notifications
      </Text>

      {isDisabled && (
        <Pressable
          style={styles.permissionBanner}
          onPress={() => Linking.openSettings()}
          accessibilityRole="button"
          accessibilityHint="Opens device settings to enable notifications"
        >
          <Text style={styles.bannerText}>
            Notifications are disabled. Enable them in Settings to receive reminders.
          </Text>
          <Text style={styles.bannerLink}>Open Settings</Text>
        </Pressable>
      )}

      <Text style={styles.sectionHeader} accessibilityRole="header">
        REMINDER TIMES
      </Text>
      <View style={styles.section}>
        {SLOT_ROWS.map((row) => {
          const isOn = selectedSlots.includes(row.slot);
          return (
            <View key={row.slot} style={styles.row}>
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, isDisabled && styles.textDisabled]}>
                  {row.label}
                </Text>
                <Text style={[styles.rowHint, isDisabled && styles.textDisabled]}>
                  {row.hint}
                </Text>
              </View>
              <Switch
                value={isOn}
                onValueChange={() => handleSlotToggle(row.slot)}
                disabled={isDisabled}
                trackColor={{ false: colors.border, true: colors.primary }}
                accessibilityLabel={`${row.label} reminder at ${row.hint}`}
                accessibilityState={{ disabled: isDisabled }}
              />
            </View>
          );
        })}
      </View>

      <Text style={styles.sectionHeader} accessibilityRole="header">
        STREAK REMINDER
      </Text>
      <View style={styles.section}>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={[styles.rowLabel, isDisabled && styles.textDisabled]}>
              Evening nudge
            </Text>
            <Text style={[styles.rowHint, isDisabled && styles.textDisabled]}>
              Reminds you at 8 pm if you haven't logged today
            </Text>
          </View>
          <Switch
            value={streakNudgeEnabled}
            onValueChange={handleStreakToggle}
            disabled={isDisabled}
            trackColor={{ false: colors.border, true: colors.primary }}
            accessibilityLabel="Evening streak reminder at 8 pm"
            accessibilityState={{ disabled: isDisabled }}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  permissionBanner: {
    backgroundColor: colors.errorLight,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
  },
  bannerText: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  bannerLink: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },
  sectionHeader: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    letterSpacing: 0.5,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  rowText: {
    flex: 1,
    marginRight: spacing.md,
  },
  rowLabel: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  rowHint: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  textDisabled: {
    color: colors.textDisabled,
  },
});
