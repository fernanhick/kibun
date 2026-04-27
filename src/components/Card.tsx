import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle, type ViewProps } from 'react-native';
import { colors, spacing, radius, shadows } from '@constants/theme';

interface CardProps extends Pick<ViewProps, 'accessibilityLabel' | 'accessibilityHint' | 'accessibilityRole' | 'accessible'> {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: keyof typeof spacing;
}

export function Card({ children, style, padding = 'md', ...accessibilityProps }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        { padding: spacing[padding] },
        style,
      ]}
      {...accessibilityProps}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.md,
  },
});
