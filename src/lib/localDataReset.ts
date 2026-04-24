import AsyncStorage from '@react-native-async-storage/async-storage';

// Every Zustand store under src/store/ that uses persist middleware registers
// its key here. Keep this list in sync when adding new persisted stores.
const PERSISTED_STORE_KEYS = [
  'kibun-mood-entries',
  'kibun-achievements',
  'kibun-custom-moods',
  'kibun-life-events',
  'kibun-habits',
  'kibun-daily-insight',
  'kibun-notification-prefs',
  'kibun-onboarding-gate',
  'kibun-session',
  'kibun-ui-prefs',
] as const;

export async function resetAllLocalUserData(): Promise<void> {
  try {
    await AsyncStorage.multiRemove(PERSISTED_STORE_KEYS as unknown as string[]);
  } catch (err) {
    if (__DEV__) console.error('[kibun:localDataReset] multiRemove failed:', err);
  }
}
