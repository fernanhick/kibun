import React from 'react';
import {
  Text,
  ActivityIndicator,
  View,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing, radius, shadows } from '@constants/theme';
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
          <View style={styles.gloss} />
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

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.button,
    minHeight: 48,
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
    borderColor: '#FFD37A',
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
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  smGradient: {
    minHeight: 42,
    paddingHorizontal: spacing.md,
  },
  gloss: {
    position: 'absolute',
    top: 2,
    left: 10,
    right: 10,
    height: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  // ─── Sizes ──────────────────────────────────────────────────────────────
  lg: {
    paddingVertical: 18,
    paddingHorizontal: spacing.xl,
  },
  md: {
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
  },
  sm: {
    paddingVertical: 10,
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
    fontSize: typography.sizes.xl,
  },
  mdLabel: {
    fontSize: typography.sizes.lg,
  },
  smLabel: {
    fontSize: typography.sizes.sm,
  },
});
