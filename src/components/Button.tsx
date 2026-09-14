import React from 'react';
import {
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { typography, spacing, radius, elevation } from '@constants/theme';
import { useTheme, type ThemeValue } from '@theme/ThemeContext';
import { SpringPressable } from '@components/SpringPressable';

// ─── Button ───────────────────────────────────────────────────────────────────
// One styling cue per variant (see Card.tsx for the rationale):
//   primary / sunrise — gradient fill + shadow. NO border. The old version put
//                       a `rgba(255,255,255,0.35)` hairline on top of the
//                       gradient AND a shadow, which is the classic 2017 stack.
//   secondary         — tinted fill, no border, no shadow.
//   ghost             — border only, no fill, no shadow.
//
// Sizes are up one step (min-heights 48/54/60) to sit comfortably above the
// 44pt iOS / 48dp Android touch-target floor at the larger type scale.
interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'sunrise';
  size?: 'md' | 'sm' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  accessibilityHint?: string;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  accessibilityHint,
}: ButtonProps) {
  const theme = useTheme();
  const { colors } = theme;
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const isBlocked = disabled || loading;
  const isGradient = variant === 'primary' || variant === 'sunrise';

  const containerStyle = [
    styles.base,
    styles[variant],
    !isGradient && styles[size],
    fullWidth && styles.fullWidth,
    isBlocked && styles.blocked,
  ];

  // `onPrimary` rather than `textInverse`: in dark mode the brand fill is a
  // light rose, so the label on it must go dark. The two tokens diverge there.
  const textColor =
    isGradient
      ? colors.onPrimary
      : variant === 'secondary'
        ? colors.primaryDark
        : colors.primary;

  const gradientColors =
    variant === 'sunrise'
      ? ([colors.warmCtaStart, colors.warmCtaEnd] as const)
      : ([colors.primary, colors.skyEnd] as const);

  return (
    <SpringPressable
      onPress={isBlocked ? undefined : onPress}
      disabled={isBlocked}
      style={containerStyle}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isBlocked }}
    >
      {isGradient ? (
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradientFill, styles[`${size}Gradient`]]}
        >
          {loading ? (
            <ActivityIndicator size="small" color={textColor} />
          ) : (
            <Text style={[styles.label, styles[`${size}Label`], { color: textColor }]}>
              {label}
            </Text>
          )}
        </LinearGradient>
      ) : (
        loading ? (
          <ActivityIndicator size="small" color={textColor} />
        ) : (
          <Text style={[styles.label, styles[`${size}Label`], { color: textColor }]}>
            {label}
          </Text>
        )
      )}
    </SpringPressable>
  );
}

const createStyles = ({ colors, isDark }: ThemeValue) => StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.button,
    minHeight: 48,
    overflow: 'hidden',
  },
  // ─── Variants ───────────────────────────────────────────────────────────
  primary: {
    backgroundColor: 'transparent',
    ...elevation(2, isDark),
  },
  secondary: {
    backgroundColor: colors.primaryLight,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  sunrise: {
    backgroundColor: 'transparent',
    ...elevation(2, isDark),
  },
  gradientFill: {
    width: '100%',
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lgGradient: {
    minHeight: 60,
    paddingHorizontal: spacing.xl,
  },
  mdGradient: {
    minHeight: 54,
    paddingHorizontal: spacing.lg,
  },
  smGradient: {
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  // ─── Sizes ──────────────────────────────────────────────────────────────
  lg: {
    paddingVertical: 17,
    paddingHorizontal: spacing.xl,
  },
  md: {
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
  },
  sm: {
    paddingVertical: 11,
    paddingHorizontal: spacing.md,
  },
  // ─── States ─────────────────────────────────────────────────────────────
  fullWidth: {
    width: '100%',
  },
  blocked: {
    opacity: 0.45,
  },
  // ─── Labels ─────────────────────────────────────────────────────────────
  label: {
    fontFamily: typography.fonts.ui,
    fontWeight: typography.weights.bold,
    letterSpacing: -0.2,
  },
  lgLabel: {
    fontSize: typography.sizes.lg,
  },
  mdLabel: {
    fontSize: typography.sizes.body,
  },
  smLabel: {
    fontSize: typography.sizes.md,
  },
});
