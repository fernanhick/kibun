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
}

export const useMoodEntryStore = create<MoodEntryState>()(
  persist(
    (set) => ({
      entries: [],
      addEntry: (entry) => {
        // 1. Save locally first (always succeeds)
        set((state) => ({ entries: [entry, ...state.entries] }));

        // 2. Fire-and-forget Supabase sync for registered users
        const session = useSessionStore.getState().session;
        if (session?.authStatus === 'registered') {
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
    }),
    {
      name: 'kibun-mood-entries',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
