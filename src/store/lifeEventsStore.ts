import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { LifeEvent, LifeEventCategory } from '@models/index';
import { supabase } from '@lib/supabase';
import { withRetry } from '@lib/syncRetry';
import { useSessionStore } from './sessionStore';

interface LifeEventsState {
  events: LifeEvent[];
  _hasHydrated: boolean;
  addEvent: (params: { title: string; category: LifeEventCategory; eventDate: string; notes?: string }) => void;
  deleteEvent: (eventId: string) => void;
  getEventsForDate: (dateStr: string) => LifeEvent[];
  mergeRemoteEvents: (events: LifeEvent[]) => void;
  clearEvents: () => void;
  setHasHydrated: (value: boolean) => void;
}

export const useLifeEventsStore = create<LifeEventsState>()(
  persist(
    (set, get) => ({
      events: [],
      _hasHydrated: false,
      setHasHydrated: (value) => set({ _hasHydrated: value }),

      addEvent: ({ title, category, eventDate, notes }) => {
        const event: LifeEvent = {
          id: Crypto.randomUUID(),
          title,
          category,
          eventDate,
          notes,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({ events: [event, ...state.events] }));

        const session = useSessionStore.getState().session;
        if (session?.authStatus === 'registered' && supabase) {
          withRetry(
            () => supabase!
              .from('life_events')
              .insert({
                id: event.id,
                user_id: session.userId,
                title: event.title,
                category: event.category,
                event_date: event.eventDate,
                notes: event.notes ?? null,
              })
              .then(({ error }) => ({ error })),
            'life-event-insert',
          );
        }
      },

      deleteEvent: (eventId) => {
        set((state) => ({
          events: state.events.filter((e) => e.id !== eventId),
        }));

        const session = useSessionStore.getState().session;
        if (session?.authStatus === 'registered' && supabase) {
          withRetry(
            () => supabase!
              .from('life_events')
              .delete()
              .eq('id', eventId)
              .eq('user_id', session.userId)
              .then(({ error }) => ({ error })),
            'life-event-delete',
          );
        }
      },

      getEventsForDate: (dateStr) =>
        get().events.filter((e) => e.eventDate === dateStr),

      mergeRemoteEvents: (remote) => {
        set((state) => {
          const byId = new Map(state.events.map((e) => [e.id, e]));
          for (const e of remote) {
            if (!byId.has(e.id)) byId.set(e.id, e);
          }
          return {
            events: Array.from(byId.values()).sort((a, b) =>
              b.createdAt.localeCompare(a.createdAt)
            ),
          };
        });
      },

      clearEvents: () => set({ events: [] }),
    }),
    {
      name: 'kibun-life-events',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ events: state.events }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
