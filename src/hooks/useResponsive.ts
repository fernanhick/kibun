import { useWindowDimensions } from 'react-native';
import { breakpoints, type Breakpoint } from '@constants/breakpoints';

export interface ResponsiveInfo {
  width: number;
  height: number;
  breakpoint: Breakpoint;
  isTablet: boolean;
  isLargeTablet: boolean;
  orientation: 'portrait' | 'landscape';
  isLandscape: boolean;
  select: <T>(values: ResponsiveValues<T>) => T;
  columns: (phoneCols: number, tabletCols: number, tabletLgCols?: number) => number;
}

type ResponsiveValues<T> = {
  phone: T;
  phoneWide?: T;
  tablet?: T;
  tabletLg?: T;
  tabletXl?: T;
};

// `isTablet` is window-derived, not device-derived — a shrunk window (iPad
// Stage Manager / Slide Over / Android split-screen) correctly renders the
// phone layout. The static device class (see `@lib/deviceClass`) is used
// only for orientation-policy decisions, not layout.
export function useResponsive(): ResponsiveInfo {
  const { width, height } = useWindowDimensions();
  const breakpoint = resolveBreakpoint(width);
  const isLandscape = width > height;

  const select = <T,>(values: ResponsiveValues<T>): T => {
    // Walk from the widest bucket down, returning the first defined value
    // at or below current breakpoint width. Falls back to `phone`.
    const order: Breakpoint[] = ['tabletXl', 'tabletLg', 'tablet', 'phoneWide', 'phone'];
    for (const bp of order) {
      if (width >= breakpoints[bp] && values[bp] !== undefined) {
        return values[bp] as T;
      }
    }
    return values.phone;
  };

  const columns = (phoneCols: number, tabletCols: number, tabletLgCols?: number): number => {
    if (width >= breakpoints.tabletLg && tabletLgCols !== undefined) return tabletLgCols;
    if (width >= breakpoints.tablet) return tabletCols;
    return phoneCols;
  };

  return {
    width,
    height,
    breakpoint,
    isTablet: width >= breakpoints.tablet,
    isLargeTablet: width >= breakpoints.tabletLg,
    orientation: isLandscape ? 'landscape' : 'portrait',
    isLandscape,
    select,
    columns,
  };
}

function resolveBreakpoint(width: number): Breakpoint {
  if (width >= breakpoints.tabletXl) return 'tabletXl';
  if (width >= breakpoints.tabletLg) return 'tabletLg';
  if (width >= breakpoints.tablet) return 'tablet';
  if (width >= breakpoints.phoneWide) return 'phoneWide';
  return 'phone';
}
