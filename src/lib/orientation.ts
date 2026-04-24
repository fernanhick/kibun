import * as ScreenOrientation from 'expo-screen-orientation';

// Phones: lock to portrait. Tablets: unlock (user rotation allowed).
// Called once at app startup after fonts + auth resolve.
export async function applyOrientationPolicy(isTabletDevice: boolean): Promise<void> {
  try {
    if (isTabletDevice) {
      await ScreenOrientation.unlockAsync();
    } else {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    }
  } catch (error) {
    if (__DEV__) {
      console.warn('[kibun:orientation] applyOrientationPolicy failed:', error);
    }
  }
}
