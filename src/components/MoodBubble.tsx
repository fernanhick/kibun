import { useRef, useEffect } from 'react';
import { Animated, Pressable, Text, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { MoodDefinition } from '@constants/moods';
import { typography, shadows } from '@constants/theme';

interface MoodBubbleProps {
  mood: MoodDefinition;
  size?: 'sm' | 'md' | 'lg';
  selected?: boolean;
  onPress?: (mood: MoodDefinition) => void;
  disabled?: boolean;
}

// 2:1 aspect ratio to match the horizontal bone silhouette
const BONE_SIZES = {
  sm: { width: 64, height: 32 },
  md: { width: 96, height: 48 },
  lg: { width: 128, height: 64 },
} as const;

// Q control points pushed far outward (y=10/70) for a chunky ~41px waist.
const BONE_PATH =
  'M 45,27 Q 80,10 115,27 A 20,20 0 1,1 143,40 A 20,20 0 1,1 115,53 Q 80,70 45,53 A 20,20 0 1,1 17,40 A 20,20 0 1,1 45,27 Z';

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
      toValue: selected ? 1.12 : 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    });
    animation.start();
    return () => animation.stop(); // Stop on unmount or before next effect run
  }, [selected]);

  const { width, height } = BONE_SIZES[size];
  const fontSizeStyle = { fontSize: FONT_SIZES[size] };

  return (
    <Animated.View
      style={[
        styles.wrapper,
        selected && {
          shadowColor: mood.bubbleColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.75,
          shadowRadius: 10,
          elevation: 10,
        },
        { transform: [{ scale: scaleAnim }] },
      ]}
    >
      <Pressable
        onPress={disabled ? undefined : () => onPress?.(mood)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={({ pressed }) => [
          styles.bone,
          { width, height },
          disabled && styles.disabled,
          pressed && !disabled && styles.pressed,
        ]}
        accessibilityRole={onPress ? 'button' : 'text'}
        accessibilityLabel={mood.label}
        accessibilityState={onPress ? { selected, disabled } : undefined}
      >
        <Svg width={width} height={height} viewBox="0 0 160 80" style={StyleSheet.absoluteFill}>
          {/* Drop shadow layer */}
          <Path
            d={BONE_PATH}
            fill="rgba(0,0,0,0.18)"
            transform="translate(3, 4)"
          />
          <Path
            d={BONE_PATH}
            fill={mood.bubbleColor}
            stroke="rgba(255,255,255,0.85)"
            strokeWidth={3}
            strokeLinejoin="round"
          />
        </Svg>
        <View style={styles.labelContainer}>
          <Text
            style={[styles.label, fontSizeStyle, { color: mood.textColor }]}
            numberOfLines={2}
            adjustsFontSizeToFit
          >
            {mood.label}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'flex-start',
  },
  bone: {
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  labelContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
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
