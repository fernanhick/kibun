import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { NotificationSlot } from '@models/index';

const SLOT_SCHEDULE: Record<NotificationSlot, { hour: number; minute: number; body: string }> = {
  morning: { hour: 9, minute: 0, body: 'How are you feeling this morning?' },
  afternoon: { hour: 14, minute: 0, body: "Quick afternoon check-in \u2014 how's your day going?" },
  evening: { hour: 19, minute: 0, body: 'Evening wind-down \u2014 how are you feeling?' },
  'pre-sleep': { hour: 22, minute: 0, body: 'Before you sleep \u2014 how was your day?' },
};

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
): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  for (const slot of slots) {
    const { hour, minute, body } = SLOT_SCHEDULE[slot];
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Time to check in',
        body,
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
        title: 'kibun',
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

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
