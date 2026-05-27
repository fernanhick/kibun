import React from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ION_PREFIX = 'ion:';

interface HabitIconProps {
  icon: string;
  size: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}

// Habit icons are free-form strings so users can type their own.
// Presets seed them with `ion:<ionicons-name>` to render as a vector glyph;
// anything else (custom user input) renders as text.
export function HabitIcon({ icon, size, color, style }: HabitIconProps) {
  if (icon.startsWith(ION_PREFIX)) {
    const name = icon.slice(ION_PREFIX.length) as React.ComponentProps<typeof Ionicons>['name'];
    return <Ionicons name={name} size={size} color={color} />;
  }
  return <Text style={[{ fontSize: size }, style]}>{icon}</Text>;
}
