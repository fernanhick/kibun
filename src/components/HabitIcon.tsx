import React from 'react';
import { Text, View, StyleSheet, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '@constants/theme';
import { useTheme } from '@theme/ThemeContext';

const ION_PREFIX = 'ion:';

interface HabitIconProps {
  icon: string;
  size: number;
  color?: string;
  style?: StyleProp<TextStyle>;
  /** Wrap the glyph in a soft tinted circle for a more finished, app-like look. */
  circle?: boolean;
  /** Circle diameter. Defaults to `size + 16`. Only used when `circle` is set. */
  circleSize?: number;
  /** Circle background. Defaults to the brand sage tint. */
  circleColor?: string;
  circleStyle?: StyleProp<ViewStyle>;
}

// Habit icons are free-form strings so users can type their own.
// Presets seed them with `ion:<ionicons-name>` to render as a vector glyph;
// anything else (custom user input) renders as text.
export function HabitIcon({
  icon,
  size,
  color,
  style,
  circle = false,
  circleSize,
  circleColor,
  circleStyle,
}: HabitIconProps) {
  const { colors } = useTheme();
  const glyphColor = color ?? colors.primary;
  const tintBg = circleColor ?? colors.primaryLight;
  const glyph = icon.startsWith(ION_PREFIX) ? (
    <Ionicons
      name={icon.slice(ION_PREFIX.length) as React.ComponentProps<typeof Ionicons>['name']}
      size={size}
      color={glyphColor}
    />
  ) : (
    <Text style={[{ fontSize: size }, style]}>{icon}</Text>
  );

  if (!circle) return glyph;

  const diameter = circleSize ?? size + 16;
  return (
    <View
      style={[
        styles.circle,
        { width: diameter, height: diameter, borderRadius: diameter / 2, backgroundColor: tintBg },
        circleStyle,
      ]}
    >
      {glyph}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
});
