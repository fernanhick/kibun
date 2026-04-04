import React from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  type PressableProps,
} from 'react-native';
import { colors, typography, spacing, radius } from '@constants/theme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'md' | 'sm';
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

  const containerStyle = [
    styles.base,
    styles[variant],
    styles[size],
    fullWidth && styles.fullWidth,
    isBlocked && styles.blocked,
  ];

  const textColor =
    variant === 'primary' ? colors.textInverse : colors.primary;

  return (
    <Pressable
      onPress={isBlocked ? undefined : onPress}
      style={({ pressed }) => [
        containerStyle,
        pressed && !isBlocked && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isBlocked }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <Text style={[styles.label, styles[`${size}Label`], { color: textColor }]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.button,
  },
  // ─── Variants ───────────────────────────────────────────────────────────
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.primaryLight,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  // ─── Sizes ──────────────────────────────────────────────────────────────
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
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.85,
  },
  // ─── Labels ─────────────────────────────────────────────────────────────
  label: {
    fontWeight: typography.weights.semibold,
  },
  mdLabel: {
    fontSize: typography.sizes.md,
  },
  smLabel: {
    fontSize: typography.sizes.sm,
  },
});
