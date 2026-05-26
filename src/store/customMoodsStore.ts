import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import type { CustomMood } from '@models/index';
import type { MoodGroup } from '@constants/moods'; // MoodGroup is defined only in constants, safe to import here
import { supabase } from '@lib/supabase';
import { withRetry } from '@lib/syncRetry';
import { useSessionStore } from './sessionStore';

const MAX_CUSTOM_MOODS = 5;

interface CustomMoodsState {
  moods: CustomMood[];
  _hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  addMood: (params: { label: string; color: string; group: MoodGroup; imageKey: string }) => boolean;
  deleteMood: (id: string) => void;
  mergeRemote: (remote: CustomMood[]) => void;
  clearAll: () => void;
}

export const useCustomMoodsStore = create<CustomMoodsState>()(
  persist(
    (set, get) => ({
      moods: [],
      _hasHydrated: false,
      setHasHydrated: (value) => set({ _hasHydrated: value }),

      addMood: ({ label, color, group, imageKey }) => {
        if (get().moods.length >= MAX_CUSTOM_MOODS) return false;
        const mood: CustomMood = {
          id: `custom_${Crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`,
          label: label.slice(0, 12),
          color,
          group,
          imageKey,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ moods: [...s.moods, mood] }));

        const session = useSessionStore.getState().session;
        if (session?.authStatus === 'registered' && supabase) {
          withRetry(
            () => supabase!
              .from('custom_moods')
              .insert({
                id: mood.id,
                user_id: session.userId,
                label: mood.label,
                color: mood.color,
                mood_group: mood.group,
              })
              .then(({ error }) => ({ error })),
            'custom-mood-insert',
          );
        }
        return true;
      },

      deleteMood: (id) => {
        set((s) => ({ moods: s.moods.filter((m) => m.id !== id) }));

        const session = useSessionStore.getState().session;
        if (session?.authStatus === 'registered' && supabase) {
          withRetry(
            () => supabase!
              .from('custom_moods')
              .delete()
              .eq('id', id)
              .eq('user_id', session.userId)
              .then(({ error }) => ({ error })),
            'custom-mood-delete',
          );
        }
      },

      mergeRemote: (remote) => {
        set((s) => {
          const map = new Map(s.moods.map((m) => [m.id, m]));
          for (const m of remote) {
            if (!map.has(m.id)) map.set(m.id, m);
          }
          return { moods: Array.from(map.values()) };
        });
      },

      clearAll: () => set({ moods: [] }),
    }),
    {
      name: 'kibun-custom-moods',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ moods: s.moods }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
