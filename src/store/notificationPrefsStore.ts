import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NotificationSlot } from '@models/index';

interface NotificationPrefsState {
  selectedSlots: NotificationSlot[];
  permissionGranted: boolean;
  streakNudgeEnabled: boolean;
  setSlots: (slots: NotificationSlot[]) => void;
  setPermissionGranted: (granted: boolean) => void;
  setStreakNudgeEnabled: (enabled: boolean) => void;
}

export const useNotificationPrefsStore = create<NotificationPrefsState>()(
  persist(
    (set) => ({
      selectedSlots: [],
      permissionGranted: false,
      streakNudgeEnabled: false,
      setSlots: (slots) => set({ selectedSlots: slots }),
      setPermissionGranted: (granted) => set({ permissionGranted: granted }),
      setStreakNudgeEnabled: (enabled) => set({ streakNudgeEnabled: enabled }),
    }),
    {
      name: 'kibun-notification-prefs',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
