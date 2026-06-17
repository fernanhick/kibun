import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle, type ViewProps } from 'react-native';
import { spacing, radius, shadows } from '@constants/theme';
import { useThemedStyles } from '@hooks/useThemedStyles';
import type { ThemePalette } from '@theme/ThemeContext';

interface CardProps extends Pick<ViewProps, 'accessibilityLabel' | 'accessibilityHint' | 'accessibilityRole' | 'accessible'> {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: keyof typeof spacing;
}

export function Card({ children, style, padding = 'md', ...accessibilityProps }: CardProps) {
  const styles = useThemedStyles(createStyles);
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

const createStyles = (colors: ThemePalette) => StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.card,
    ...shadows.md,
  },
});
