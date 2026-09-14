import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useSegments } from 'expo-router';

interface DeferredPresentationOptions<T> {
  /**
   * Must be stable across renders. Module-level event-bus `subscribe` methods
   * qualify; an inline arrow does not and will resubscribe every render.
   */
  subscribe: (listener: (payload: T) => void) => () => void;
  /** Stable across renders. Invoked from a timer, never during render. */
  onPresent: (payload: T) => void;
  /** Stable across renders. Called instead of `onPresent` for a stale payload. */
  onExpire?: (payload: T) => void;
  delayMs: number;
  ttlMs: number;
  /** Holds the queue without dropping it — e.g. while something else is on screen. */
  enabled?: boolean;
}

export interface DeferredPresentationState {
  /** True while a payload is waiting to be released. */
  hasPending: boolean;
}

/**
 * Queues an event and releases it only when interrupting is fair: the user is
 * on the tab stack rather than inside a pushed flow, the app is foregrounded,
 * and a settling delay has passed. Anything that waits too long is dropped
 * rather than surfaced minutes later with no connection to what triggered it.
 *
 * Shared by the achievement celebration and the review gate so the two cannot
 * drift on what counts as a safe moment — and so they queue behind each other
 * instead of racing to cover the same screen.
 */
export function useDeferredPresentation<T>({
  subscribe,
  onPresent,
  onExpire,
  delayMs,
  ttlMs,
  enabled = true,
}: DeferredPresentationOptions<T>): DeferredPresentationState {
  const segments = useSegments();
  const onSafeRoute = (segments[0] ?? '(tabs)') === '(tabs)';

  const [pending, setPending] = useState<{ payload: T; queuedAt: number } | null>(null);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');

  useEffect(
    () => subscribe((payload) => setPending({ payload, queuedAt: Date.now() })),
    [subscribe]
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => setAppActive(next === 'active'));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!pending || !enabled) return;
    // Re-runs when the route or foreground state changes, so a payload queued
    // behind a pushed screen is released as soon as one of them clears.
    if (!onSafeRoute || !appActive) return;

    const { payload, queuedAt } = pending;
    const timer = setTimeout(() => {
      setPending(null);
      if (Date.now() - queuedAt > ttlMs) {
        onExpire?.(payload);
        return;
      }
      onPresent(payload);
    }, delayMs);
    return () => clearTimeout(timer);
  }, [pending, enabled, onSafeRoute, appActive, delayMs, ttlMs, onPresent, onExpire]);

  return { hasPending: pending !== null };
}
