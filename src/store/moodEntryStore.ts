import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MoodEntry } from '@models/index';
import { MOOD_MAP, MoodId } from '@constants/moods';
import { supabase } from '@lib/supabase';
import { useSessionStore } from './sessionStore';

interface MoodEntryState {
  entries: MoodEntry[];
  addEntry: (entry: MoodEntry) => void;
  updateJournalResponse: (entryId: string, prompt: string, response: string) => void;
  getEntriesForDate: (dateStr: string) => MoodEntry[];
  getDaysWithEntries: (yearMonth: string) => Record<string, string>;
  getStreak: () => number;
}

export const useMoodEntryStore = create<MoodEntryState>()(
  persist(
    (set, get) => ({
      entries: [],
      addEntry: (entry) => {
        // 1. Save locally first (always succeeds)
        set((state) => ({ entries: [entry, ...state.entries] }));

        // 2. Fire-and-forget Supabase sync for registered users
        const session = useSessionStore.getState().session;
        if (session?.authStatus === 'registered' && supabase) {
          const mood = MOOD_MAP[entry.moodId as MoodId];
          supabase
            .from('mood_entries')
            .insert({
              user_id: session.userId,
              mood: entry.moodId,
              mood_color: mood?.bubbleColor ?? '#BDBDBD',
              note: entry.note,
              check_in_slot: entry.slot,
              logged_at: entry.loggedAt,
            })
            .then(({ error }) => {
              if (error && __DEV__) {
                console.error('[kibun:mood] Supabase insert failed:', error.message);
              }
            });
        }
      },

      updateJournalResponse: (entryId, prompt, response) => {
        set((state) => ({
          entries: state.entries.map((e) =>
            e.id === entryId
              ? { ...e, journalPrompt: prompt, journalResponse: response }
              : e
          ),
        }));

        // Sync journal fields to Supabase for registered users
        const session = useSessionStore.getState().session;
        if (session?.authStatus === 'registered' && supabase) {
          supabase
            .from('mood_entries')
            .update({ journal_prompt: prompt, journal_response: response })
            .eq('id', entryId)
            .eq('user_id', session.userId)
            .then(({ error }) => {
              if (error && __DEV__) {
                console.error('[kibun:journal] Supabase update failed:', error.message);
              }
            });
        }
      },

      getEntriesForDate: (dateStr: string) => {
        return get()
          .entries.filter((e) => e.loggedAt.startsWith(dateStr))
          .sort((a, b) => a.loggedAt.localeCompare(b.loggedAt));
      },

      getDaysWithEntries: (yearMonth: string) => {
        const dayEntries = get().entries.filter((e) =>
          e.loggedAt.startsWith(yearMonth)
        );
        const byDay: Record<string, MoodEntry[]> = {};
        for (const e of dayEntries) {
          const day = e.loggedAt.split('T')[0];
          (byDay[day] ??= []).push(e);
        }
        const result: Record<string, string> = {};
        for (const [day, entries] of Object.entries(byDay)) {
          const freq: Record<string, number> = {};
          for (const e of entries) {
            freq[e.moodId] = (freq[e.moodId] ?? 0) + 1;
          }
          let maxCount = 0;
          for (const count of Object.values(freq)) {
            if (count > maxCount) maxCount = count;
          }
          const topMoods = Object.keys(freq).filter((m) => freq[m] === maxCount);
          if (topMoods.length === 1) {
            result[day] = topMoods[0];
          } else {
            const sorted = entries
              .filter((e) => topMoods.includes(e.moodId))
              .sort((a, b) => b.loggedAt.localeCompare(a.loggedAt));
            result[day] = sorted[0].moodId;
          }
        }
        return result;
      },

      getStreak: () => {
        const entries = get().entries;
        if (entries.length === 0) return 0;

        const daysWithEntries = new Set(
          entries.map((e) => e.loggedAt.split('T')[0])
        );

        let streak = 0;
        const d = new Date();
        while (true) {
          const dateStr = d.toISOString().split('T')[0];
          if (!daysWithEntries.has(dateStr)) break;
          streak++;
          d.setDate(d.getDate() - 1);
        }
        return streak;
      },
    }),
    {
      name: 'kibun-mood-entries',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
