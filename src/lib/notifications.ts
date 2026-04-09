import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { NotificationSlot } from '@models/index';
import type { CustomTimes } from '@store/notificationPrefsStore';

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
): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  for (const slot of slots) {
    const defaults = SLOT_SCHEDULE[slot];
    const custom = customTimes[slot] ? parseCustomTime(customTimes[slot]!) : null;
    const { hour, minute } = custom ?? defaults;

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
