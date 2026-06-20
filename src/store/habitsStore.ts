import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { Habit, HabitLog, HabitTrackingType } from '@models/index';
import { migrateHabitIcon } from '@lib/habitPresets';
import { supabase } from '@lib/supabase';
import { withRetry } from '@lib/syncRetry';
import { useSessionStore } from './sessionStore';

interface HabitsState {
  habits: Habit[];
  logs: HabitLog[];
  _hasHydrated: boolean;
  addHabit: (params: { name: string; icon: string; trackingType: HabitTrackingType }) => void;
  deleteHabit: (habitId: string) => void;
  logHabit: (habitId: string, logDate: string, value: number) => void;
  clearHabitLog: (habitId: string, logDate: string) => void;
  getLogsForDate: (date: string) => HabitLog[];
  mergeRemote: (habits: Habit[], logs: HabitLog[]) => void;
  clearAll: () => void;
  setHasHydrated: (value: boolean) => void;
}

export const useHabitsStore = create<HabitsState>()(
  persist(
    (set, get) => ({
      habits: [],
      logs: [],
      _hasHydrated: false,
      setHasHydrated: (value) => set({ _hasHydrated: value }),

      addHabit: ({ name, icon, trackingType }) => {
        const habit: Habit = {
          id: Crypto.randomUUID(),
          name,
          icon,
          trackingType,
          displayOrder: get().habits.length,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ habits: [...s.habits, habit] }));

        const session = useSessionStore.getState().session;
        if (session?.authStatus === 'registered' && supabase) {
          withRetry(
            () => supabase!
              .from('habits')
              .insert({
                id: habit.id,
                user_id: session.userId,
                name: habit.name,
                icon: habit.icon,
                tracking_type: habit.trackingType,
                display_order: habit.displayOrder,
              })
              .then(({ error }) => ({ error })),
            'habit-insert',
          );
        }
      },

      deleteHabit: (habitId) => {
        set((s) => ({
          habits: s.habits.filter((h) => h.id !== habitId),
          logs: s.logs.filter((l) => l.habitId !== habitId),
        }));

        const session = useSessionStore.getState().session;
        if (session?.authStatus === 'registered' && supabase) {
          withRetry(
            () => supabase!
              .from('habits')
              .delete()
              .eq('id', habitId)
              .eq('user_id', session.userId)
              .then(({ error }) => ({ error })),
            'habit-delete',
          );
        }
      },

      logHabit: (habitId, logDate, value) => {
        const existing = get().logs.find(
          (l) => l.habitId === habitId && l.logDate === logDate,
        );

        if (existing) {
          set((s) => ({
            logs: s.logs.map((l) =>
              l.habitId === habitId && l.logDate === logDate ? { ...l, value } : l,
            ),
          }));
        } else {
          const log: HabitLog = {
            id: Crypto.randomUUID(),
            habitId,
            logDate,
            value,
          };
          set((s) => ({ logs: [log, ...s.logs] }));
        }

        const session = useSessionStore.getState().session;
        if (session?.authStatus === 'registered' && supabase) {
          withRetry(
            () => supabase!
              .from('habit_logs')
              .upsert({
                user_id: session.userId,
                habit_id: habitId,
                log_date: logDate,
                value,
              }, { onConflict: 'user_id,habit_id,log_date' })
              .then(({ error }) => ({ error })),
            'habit-log-upsert',
          );
        }
      },

      clearHabitLog: (habitId, logDate) => {
        set((s) => ({
          logs: s.logs.filter(
            (l) => !(l.habitId === habitId && l.logDate === logDate),
          ),
        }));

        const session = useSessionStore.getState().session;
        if (session?.authStatus === 'registered' && supabase) {
          withRetry(
            () => supabase!
              .from('habit_logs')
              .delete()
              .eq('user_id', session.userId)
              .eq('habit_id', habitId)
              .eq('log_date', logDate)
              .then(({ error }) => ({ error })),
            'habit-log-delete',
          );
        }
      },

      getLogsForDate: (date) => get().logs.filter((l) => l.logDate === date),

      mergeRemote: (remoteHabits, remoteLogs) => {
        set((s) => {
          const habitMap = new Map(s.habits.map((h) => [h.id, h]));
          for (const h of remoteHabits) {
            // Remote rows may still hold the pre-vector-glyph emoji icons.
            if (!habitMap.has(h.id)) habitMap.set(h.id, { ...h, icon: migrateHabitIcon(h.icon) });
          }
          const logKey = (l: HabitLog) => `${l.habitId}:${l.logDate}`;
          const logMap = new Map(s.logs.map((l) => [logKey(l), l]));
          for (const l of remoteLogs) {
            if (!logMap.has(logKey(l))) logMap.set(logKey(l), l);
          }
          return {
            habits: Array.from(habitMap.values()).sort(
              (a, b) => a.displayOrder - b.displayOrder,
            ),
            logs: Array.from(logMap.values()),
          };
        });
      },

      clearAll: () => set({ habits: [], logs: [] }),
    }),
    {
      name: 'kibun-habits',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ habits: s.habits, logs: s.logs }),
      version: 1,
      // v0 → v1: habits stored emoji icons before the switch to `ion:` vector
      // glyphs. Remap any known legacy emoji to the current glyph on load.
      migrate: (persisted, version) => {
        const state = persisted as { habits?: Habit[]; logs?: HabitLog[] } | undefined;
        if (state?.habits && version < 1) {
          state.habits = state.habits.map((h) => ({ ...h, icon: migrateHabitIcon(h.icon) }));
        }
        return state as HabitsState;
      },
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
