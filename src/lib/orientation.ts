import * as ScreenOrientation from 'expo-screen-orientation';

// Portrait-only on all devices (phone + tablet). The native manifest already
// enforces this via app.config.ts `orientation: 'portrait'`; the runtime lock
// is a guard for Expo Go and hot-reload, where the manifest isn't authoritative.
// The `_isTabletDevice` parameter is retained for call-site compatibility.
export async function applyOrientationPolicy(_isTabletDevice: boolean): Promise<void> {
  try {
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  } catch (error) {
    if (__DEV__) {
      console.warn('[kibun:orientation] applyOrientationPolicy failed:', error);
    }
  }
}
