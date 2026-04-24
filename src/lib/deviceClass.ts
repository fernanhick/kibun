import { Dimensions, Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';

// Computed once at startup; used only for orientation-policy decisions and
// native-platform flags — never for layout (which uses `useResponsive` and
// re-renders on window resize). A shrunk iPad window is still an iPad.
let cached: boolean | null = null;

export function getIsTabletDevice(): boolean {
  if (cached !== null) return cached;

  if (Platform.OS === 'ios') {
    cached = Platform.isPad === true;
    return cached;
  }

  if (Platform.OS === 'android') {
    try {
      cached = DeviceInfo.isTablet();
      return cached;
    } catch {
      // Fall through to heuristic if native module is unavailable.
    }
    // Heuristic fallback: smallest dimension of the *screen* (not window —
    // window can shrink in split-screen) ≥ 600dp. Matches sw600dp qualifier.
    const screen = Dimensions.get('screen');
    cached = Math.min(screen.width, screen.height) >= 600;
    return cached;
  }

  cached = false;
  return cached;
}
