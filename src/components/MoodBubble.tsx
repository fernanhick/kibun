import { useRef, useEffect } from 'react';
import { Animated, Pressable, Text, StyleSheet } from 'react-native';
import { MoodDefinition } from '@constants/moods';
import { colors, typography, radius, shadows } from '@constants/theme';

interface MoodBubbleProps {
  mood: MoodDefinition;
  size?: 'sm' | 'md' | 'lg';
  selected?: boolean;
  onPress?: (mood: MoodDefinition) => void;
  disabled?: boolean;
}

const SIZES = { sm: 48, md: 72, lg: 96 } as const;

const FONT_SIZES = {
  sm: typography.sizes.xs,
  md: typography.sizes.sm,
  lg: typography.sizes.md,
} as const;

export function MoodBubble({
  mood,
  size = 'md',
  selected = false,
  onPress,
  disabled = false,
}: MoodBubbleProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.spring(scaleAnim, {
      toValue: selected ? 1.08 : 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    });
    animation.start();
    return () => animation.stop(); // Stop on unmount or before next effect run
  }, [selected]);

  const diameter = SIZES[size];
  const sizeStyle = { width: diameter, height: diameter, borderRadius: radius.bubble };
  const fontSizeStyle = { fontSize: FONT_SIZES[size] };

  return (
    <Animated.View style={[styles.wrapper, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        onPress={disabled ? undefined : () => onPress?.(mood)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={({ pressed }) => [
          styles.bubble,
          sizeStyle,
          { backgroundColor: mood.bubbleColor },
          selected && styles.selected,
          disabled && styles.disabled,
          pressed && !disabled && styles.pressed,
        ]}
        accessibilityRole={onPress ? 'button' : 'text'}
        accessibilityLabel={mood.label}
        accessibilityState={onPress ? { selected, disabled } : undefined}
      >
        <Text style={[styles.label, fontSizeStyle, { color: mood.textColor }]}>
          {mood.label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'flex-start', // Prevents Animated.View from stretching in flex parent
  },
  bubble: {
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  selected: {
    ...shadows.md, // Elevated shadow replaces sm — do not stack
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.38,
  },
  label: {
    fontWeight: typography.weights.semibold,
    textAlign: 'center',
  },
});
