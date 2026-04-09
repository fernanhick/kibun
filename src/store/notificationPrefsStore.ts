import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NotificationSlot } from '@models/index';

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
  setSlots: (slots: NotificationSlot[]) => void;
  setPermissionGranted: (granted: boolean) => void;
  setStreakNudgeEnabled: (enabled: boolean) => void;
  setCustomTime: (slot: NotificationSlot, time: string) => void;
  clearCustomTime: (slot: NotificationSlot) => void;
}

export const useNotificationPrefsStore = create<NotificationPrefsState>()(
  persist(
    (set) => ({
      selectedSlots: [],
      permissionGranted: false,
      streakNudgeEnabled: false,
      customTimes: {},
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
    }),
    {
      name: 'kibun-notification-prefs',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
