import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { NotificationSlot, MoodEntry } from '@models/index';
import type { CustomTimes } from '@store/notificationPrefsStore';

export type AdaptiveTimes = Partial<Record<NotificationSlot, string>>; // HH:mm per slot

const SLOT_SCHEDULE: Record<NotificationSlot, { hour: number; minute: number; body: string }> = {
  morning: { hour: 9, minute: 0, body: 'How are you feeling this morning?' },
  afternoon: { hour: 14, minute: 0, body: "Quick afternoon check-in \u2014 how's your day going?" },
  evening: { hour: 19, minute: 0, body: 'Evening wind-down \u2014 how are you feeling?' },
  'pre-sleep': { hour: 22, minute: 0, body: 'Before you sleep \u2014 how was your day?' },
};

function parseCustomTime(hhmm: string): { hour: number; minute: number } | null {
  const parts = hhmm.split(':');
  if (parts.length !== 2) return null;
  const hour = parseInt(parts[0], 10);
  const minute = parseInt(parts[1], 10);
  if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function scheduleSlotNotifications(
  slots: NotificationSlot[],
  streakNudge: boolean = false,
  customTimes: CustomTimes = {},
  adaptiveTimes: AdaptiveTimes = {},
): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  for (const slot of slots) {
    const defaults = SLOT_SCHEDULE[slot];
    const custom = customTimes[slot] ? parseCustomTime(customTimes[slot]!) : null;
    const adaptive = !custom && adaptiveTimes[slot] ? parseCustomTime(adaptiveTimes[slot]!) : null;
    const { hour, minute } = custom ?? adaptive ?? defaults;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Time to check in',
        body: defaults.body,
        data: { slot },
      },
      trigger: {
        type: SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
  }

  if (streakNudge) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Kibun',
        body: "Don't break your streak! How was your day?",
        data: { type: 'streak_nudge' },
      },
      trigger: {
        type: SchedulableTriggerInputTypes.DAILY,
        hour: 20,
        minute: 0,
      },
    });
  }
}

export async function scheduleAchievementNotification(label: string, emoji: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${emoji} Achievement unlocked!`,
      body: label,
      data: { type: 'achievement' },
    },
    trigger: null, // fire immediately
  });
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// Maps MoodSlot to the corresponding NotificationSlot
const MOOD_TO_NOTIF_SLOT: Record<string, NotificationSlot> = {
  morning: 'morning',
  afternoon: 'afternoon',
  night: 'evening',
  pre_sleep: 'pre-sleep',
};

const MIN_DATA_POINTS = 7;

/**
 * Analyses when users actually log their moods per slot (last 30 days),
 * then computes an optimal notification time 15 min before the median log time.
 * Returns HH:mm strings per slot; omits slots with fewer than MIN_DATA_POINTS entries.
 */
export function computeAdaptiveTimes(entries: MoodEntry[]): AdaptiveTimes {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = cutoff.toISOString();

  const buckets: Record<NotificationSlot, number[]> = {
    morning: [], afternoon: [], evening: [], 'pre-sleep': [],
  };

  for (const entry of entries) {
    if (entry.loggedAt < cutoffStr) continue;
    const notifSlot = MOOD_TO_NOTIF_SLOT[entry.slot];
    if (!notifSlot) continue;
    const d = new Date(entry.loggedAt);
    buckets[notifSlot].push(d.getHours() * 60 + d.getMinutes());
  }

  const result: AdaptiveTimes = {};
  for (const [slot, times] of Object.entries(buckets) as [NotificationSlot, number[]][]) {
    if (times.length < MIN_DATA_POINTS) continue;
    const sorted = [...times].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const notifMins = Math.max(0, median - 15);
    const h = Math.floor(notifMins / 60);
    const m = notifMins % 60;
    result[slot] = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  return result;
}
