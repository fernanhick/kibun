import { useMemo } from 'react';
import { useTheme, type ThemePalette } from '@theme/ThemeContext';

// Bridges the static-StyleSheet pattern to runtime theming. Pass a
// MODULE-SCOPE `createStyles` factory (stable reference) so the memoized
// stylesheet only rebuilds when the palette actually flips light↔dark.
//
//   const styles = useThemedStyles(createStyles);
//   ...
//   const createStyles = (colors: ThemePalette) => StyleSheet.create({ ... });
//
// Components that also reference colors inline in JSX should additionally
// pull `const { colors } = useTheme();`.
export function useThemedStyles<T>(createStyles: (colors: ThemePalette) => T): T {
  const { colors } = useTheme();
  return useMemo(() => createStyles(colors), [colors, createStyles]);
}
