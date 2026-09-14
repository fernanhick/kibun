import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle, type ViewProps } from 'react-native';
import { spacing, radius, elevation } from '@constants/theme';
import { useTheme, type ThemePalette } from '@theme/ThemeContext';
import type { ThemeValue } from '@theme/ThemeContext';

// ─── Card ─────────────────────────────────────────────────────────────────────
// ONE STYLING CUE PER SURFACE. The audit found ~130 borderWidth sites against 29
// shadow sites with 13 files putting BOTH on the same element — a hairline
// border plus a drop shadow is the single most reliable "pre-2020" tell.
// Each variant here commits to exactly one cue:
//
//   elevated (default) — shadow only, no border. The resting card.
//   raised             — a heavier shadow. For the one card on screen that
//                        should out-rank the others. Use sparingly; if
//                        everything is raised, nothing is.
//   outline            — border only, no shadow. For nested//secondary panels
//                        that must not float off the card behind them.
//   tinted             — a filled tint, no border and no shadow. For callouts
//                        (insights, banners) that read as content, not chrome.
//   glass              — translucent chrome. Pair with a BlurView parent.
//
// The old component hardcoded `shadows.md` — the HEAVY tier — for every card,
// which is why nothing on a screen ever read as more important than anything
// else. `elevated` now maps to tier 1 and `raised` to tier 2.
export type CardVariant = 'elevated' | 'raised' | 'outline' | 'tinted' | 'glass';

interface CardProps extends Pick<ViewProps, 'accessibilityLabel' | 'accessibilityHint' | 'accessibilityRole' | 'accessible'> {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: keyof typeof spacing;
  variant?: CardVariant;
  /** Fill colour for `tinted`. Defaults to the brand tint. */
  tint?: string;
}

export function Card({
  children,
  style,
  padding = 'md',
  variant = 'elevated',
  tint,
  ...accessibilityProps
}: CardProps) {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  return (
    <View
      style={[
        styles.base,
        styles[variant],
        variant === 'tinted' && tint ? { backgroundColor: tint } : null,
        { padding: spacing[padding] },
        style,
      ]}
      {...accessibilityProps}
    >
      {children}
    </View>
  );
}

const createStyles = ({ colors, isDark }: ThemeValue) => StyleSheet.create({
  base: {
    borderRadius: radius.card,
  },
  elevated: {
    backgroundColor: colors.surfaceElevated,
    ...elevation(1, isDark),
  },
  raised: {
    backgroundColor: colors.surfaceElevated,
    ...elevation(2, isDark),
  },
  outline: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tinted: {
    backgroundColor: colors.primaryLight,
  },
  glass: {
    backgroundColor: colors.glassTint,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
});

// Re-exported for call sites that build their own card-like surfaces and need
// the same palette contract.
export type { ThemePalette };
