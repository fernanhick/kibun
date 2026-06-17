import React from 'react';
import {
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { typography, spacing, radius, shadows } from '@constants/theme';
import { useTheme, type ThemePalette } from '@theme/ThemeContext';
import { useThemedStyles } from '@hooks/useThemedStyles';
import { SpringPressable } from '@components/SpringPressable';

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
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const isBlocked = disabled || loading;
  const isGradient = variant === 'primary' || variant === 'sunrise';

  const containerStyle = [
    styles.base,
    styles[variant],
    !isGradient && styles[size],
    fullWidth && styles.fullWidth,
    isBlocked && styles.blocked,
  ];

  const textColor =
    variant === 'primary' || variant === 'sunrise'
      ? colors.textInverse
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

const createStyles = (colors: ThemePalette) => StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.button,
    minHeight: 44,
    ...shadows.sm,
    overflow: 'hidden',
  },
  // ─── Variants ───────────────────────────────────────────────────────────
  primary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  secondary: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.chipBorder,
  },
  ghost: {
    backgroundColor: colors.chipSurface,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  sunrise: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#D9A06F',
  },
  gradientFill: {
    width: '100%',
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lgGradient: {
    minHeight: 54,
    paddingHorizontal: spacing.xl,
  },
  mdGradient: {
    minHeight: 48,
    paddingHorizontal: spacing.lg,
  },
  smGradient: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
  },
  // ─── Sizes ──────────────────────────────────────────────────────────────
  lg: {
    paddingVertical: 15,
    paddingHorizontal: spacing.xl,
  },
  md: {
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
  },
  sm: {
    paddingVertical: 9,
    paddingHorizontal: spacing.md,
  },
  // ─── States ─────────────────────────────────────────────────────────────
  fullWidth: {
    width: '100%',
  },
  blocked: {
    opacity: 0.5,
  },
  // ─── Labels ─────────────────────────────────────────────────────────────
  label: {
    fontFamily: typography.fonts.ui,
    fontWeight: typography.weights.semibold,
  },
  lgLabel: {
    fontSize: typography.sizes.lg,
  },
  mdLabel: {
    fontSize: typography.sizes.body,
  },
  smLabel: {
    fontSize: typography.sizes.sm,
  },
});
