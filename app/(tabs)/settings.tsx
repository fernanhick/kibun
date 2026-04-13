import React, { useState, useCallback, useRef } from 'react';
import { View, Text, Switch, Pressable, TextInput, StyleSheet, Linking } from 'react-native';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen, SparkleOverlay, Shiba } from '@components/index';
import { useNotificationPrefsStore } from '@store/notificationPrefsStore';
import { useSessionStore } from '@store/sessionStore';
import { scheduleSlotNotifications } from '@lib/notifications';
import type { NotificationSlot } from '@models/index';
import { colors, typography, spacing, radius } from '@constants/theme';

const PRIVACY_POLICY_URL = 'https://fernanhick.github.io/kibun/privacy-policy.html';

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
  const router = useRouter();
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const session = useSessionStore((s) => s.session);
  const isAnonymous = !session || session.authStatus === 'anonymous';
  const isPro = session?.subscriptionStatus === 'trial' || session?.subscriptionStatus === 'active';

  const selectedSlots = useNotificationPrefsStore((s) => s.selectedSlots);
  const streakNudgeEnabled = useNotificationPrefsStore((s) => s.streakNudgeEnabled);
  const customTimes = useNotificationPrefsStore((s) => s.customTimes);
  const { setSlots, setStreakNudgeEnabled, setPermissionGranted, setCustomTime, clearCustomTime } = useNotificationPrefsStore.getState();

  const appVersion = Constants.expoConfig?.version ?? '—';

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
      const { selectedSlots: slots, streakNudgeEnabled: nudge, customTimes: times } = useNotificationPrefsStore.getState();
      try {
        await scheduleSlotNotifications(slots, nudge, times);
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

  /** Validates HH:MM format and saves or clears the custom time for a slot. */
  const handleCustomTimeChange = (slot: NotificationSlot, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      clearCustomTime(slot);
      reschedule();
      return;
    }
    const valid = /^([01]\d|2[0-3]):([0-5]\d)$/.test(trimmed);
    if (valid) {
      setCustomTime(slot, trimmed);
      reschedule();
    }
  };

  const handleStreakToggle = (value: boolean) => {
    setStreakNudgeEnabled(value);
    reschedule();
  };

  return (
    <Screen scrollable={true}>
      <LinearGradient
        colors={[colors.skyStart, colors.skyEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <SparkleOverlay count={20} />
        <View style={styles.heroTopRow}>
          <View>
            <Text style={styles.screenTitle} accessibilityRole="header">
              Settings
            </Text>
            <Text style={styles.heroSubtitle}>Tune reminders and your daily flow</Text>
          </View>
          <Shiba variant="happy" size={140} />
        </View>
      </LinearGradient>

      {/* ── Account section ─────────────────────────────────────────── */}
      <Text style={styles.sectionHeader} accessibilityRole="header">
        ACCOUNT
      </Text>
      <View style={styles.section}>
        <Pressable
          style={styles.row}
          onPress={() => router.push('/account' as Href)}
          accessibilityRole="button"
          accessibilityLabel="Manage account"
        >
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>Account</Text>
            <Text style={styles.rowHint}>
              {isAnonymous ? 'Not signed in' : 'Manage account and subscription'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </Pressable>
      </View>

      {/* ── Notification permission banner ──────────────────────────── */}
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

      {/* ── Notification sections ────────────────────────────────────── */}
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
                trackColor={{ false: colors.border, true: colors.accent }}
                accessibilityLabel={`${row.label} reminder at ${row.hint}`}
                accessibilityState={{ disabled: isDisabled }}
              />
            </View>
          );
        })}
      </View>

      {/* ── Custom Reminder Times — Pro feature ──────────────────────── */}
      <Text style={styles.sectionHeader} accessibilityRole="header">
        CUSTOM TIMES
      </Text>
      {isPro ? (
        <View style={styles.section}>
          {SLOT_ROWS.filter((r) => selectedSlots.includes(r.slot)).map((row) => (
            <View key={row.slot} style={styles.row}>
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, isDisabled && styles.textDisabled]}>
                  {row.label}
                </Text>
                <Text style={[styles.rowHint, isDisabled && styles.textDisabled]}>
                  {customTimes[row.slot] ? `Set to ${customTimes[row.slot]}` : row.hint}
                </Text>
              </View>
              <TextInput
                style={[styles.timeInput, isDisabled && styles.textDisabled]}
                defaultValue={customTimes[row.slot] ?? ''}
                placeholder="HH:MM"
                placeholderTextColor={colors.textDisabled}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
                editable={!isDisabled}
                onEndEditing={(e) => handleCustomTimeChange(row.slot, e.nativeEvent.text)}
                accessibilityLabel={`Custom time for ${row.label} reminder`}
                accessibilityHint="Enter 24-hour time in HH:MM format"
              />
            </View>
          ))}
          {selectedSlots.length === 0 && (
            <View style={styles.row}>
              <Text style={[styles.rowHint, { flex: 1 }]}>
                Enable reminder slots above to set custom times.
              </Text>
            </View>
          )}
        </View>
      ) : (
        <Pressable
          onPress={() => router.push('/paywall' as Href)}
          accessibilityRole="button"
          accessibilityLabel="Upgrade to Pro to set custom reminder times"
        >
          <View style={[styles.section, styles.proLockRow]}>
            <Text style={styles.rowLabel}>Custom reminder times</Text>
            <View style={styles.proLockBadge}>
              <Text style={styles.proLockBadgeText}>Pro</Text>
            </View>
          </View>
        </Pressable>
      )}

      {/* ── Streak Reminder ──────────────────────────────────────────── */}
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
            trackColor={{ false: colors.border, true: colors.accent }}
            accessibilityLabel="Evening streak reminder at 8 pm"
            accessibilityState={{ disabled: isDisabled }}
          />
        </View>
      </View>

      {/* ── About section ────────────────────────────────────────────── */}
      <Text style={styles.sectionHeader} accessibilityRole="header">
        ABOUT
      </Text>
      <View style={styles.section}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Version</Text>
          <Text style={styles.rowHint}>{appVersion}</Text>
        </View>
        <Pressable
          style={styles.row}
          onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
          accessibilityRole="link"
          accessibilityLabel="Privacy Policy"
        >
          <Text style={styles.rowLabel}>Privacy Policy</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenTitle: {
    fontSize: typography.sizes.xxl,
    fontFamily: typography.fonts.display,
    color: colors.textInverse,
  },
  heroCard: {
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.sparkle,
    marginTop: 2,
  },
  permissionBanner: {
    backgroundColor: colors.errorLight,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: '#FFD6D1',
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
    fontFamily: typography.fonts.ui,
    color: colors.accent,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    letterSpacing: 0.5,
  },
  section: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: radius.lg,
    borderWidth: 1.2,
    borderColor: '#DCE9FF',
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
    fontFamily: typography.fonts.ui,
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
  timeInput: {
    width: 64,
    borderWidth: 1.5,
    borderColor: '#C8DCFF',
    borderRadius: radius.md,
    paddingVertical: 6,
    paddingHorizontal: 10,
    fontSize: typography.sizes.sm,
    color: colors.text,
    backgroundColor: '#F7FBFF',
    textAlign: 'center',
  },
  proLockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  proLockBadge: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  proLockBadgeText: {
    fontSize: typography.sizes.xs,
    color: colors.textInverse,
    fontWeight: typography.weights.semibold,
  },
});
