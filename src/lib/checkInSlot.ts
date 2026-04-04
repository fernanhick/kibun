import { MoodSlot } from '@models/index';

export function getCheckInSlot(date: Date = new Date()): MoodSlot {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'night';
  return 'pre_sleep';
}
