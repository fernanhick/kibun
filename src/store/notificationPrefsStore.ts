import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NotificationSlot } from '@models/index';
import type { AdaptiveTimes } from '@lib/notifications';

export type CustomTimes = {
  morning?: string;       // HH:mm 24h
  afternoon?: string;
  evening?: string;
  'pre-sleep'?: string;
};

interface NotificationPrefsState {
  selectedSlots: NotificationSlot[];
  permissionGranted: boolean;
  streakNudgeEnabled: boolean;
  customTimes: CustomTimes;
  adaptiveTimes: AdaptiveTimes;
  adaptiveEnabled: boolean;
  setSlots: (slots: NotificationSlot[]) => void;
  setPermissionGranted: (granted: boolean) => void;
  setStreakNudgeEnabled: (enabled: boolean) => void;
  setCustomTime: (slot: NotificationSlot, time: string) => void;
  clearCustomTime: (slot: NotificationSlot) => void;
  setAdaptiveTimes: (times: AdaptiveTimes) => void;
  toggleAdaptive: (enabled: boolean) => void;
}

export const useNotificationPrefsStore = create<NotificationPrefsState>()(
  persist(
    (set) => ({
      selectedSlots: [],
      permissionGranted: false,
      streakNudgeEnabled: false,
      customTimes: {},
      adaptiveTimes: {},
      adaptiveEnabled: true,
      setSlots: (slots) => set({ selectedSlots: slots }),
      setPermissionGranted: (granted) => set({ permissionGranted: granted }),
      setStreakNudgeEnabled: (enabled) => set({ streakNudgeEnabled: enabled }),
      setCustomTime: (slot, time) =>
        set((state) => ({ customTimes: { ...state.customTimes, [slot]: time } })),
      clearCustomTime: (slot) =>
        set((state) => {
          const next = { ...state.customTimes };
          delete next[slot];
          return { customTimes: next };
        }),
      setAdaptiveTimes: (times) => set({ adaptiveTimes: times }),
      toggleAdaptive: (enabled) => set({ adaptiveEnabled: enabled }),
    }),
    {
      name: 'kibun-notification-prefs',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
