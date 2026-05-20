import React, { useEffect } from 'react';
import { type StyleProp, type TextStyle, TextInput } from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useReducedMotion } from '@hooks/useReducedMotion';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  style?: StyleProp<TextStyle>;
  maxFontSizeMultiplier?: number;
  accessibilityLabel?: string;
}

// Reanimated cannot animate <Text> contents. It CAN animate the `text` prop on a
// non-editable TextInput via useAnimatedProps — the update runs on the UI thread
// with zero React re-renders.
export function AnimatedNumber({
  value,
  duration = 900,
  suffix = '',
  prefix = '',
  style,
  maxFontSizeMultiplier,
  accessibilityLabel,
}: AnimatedNumberProps) {
  const animated = useSharedValue(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      animated.value = value;
    } else {
      animated.value = withTiming(value, {
        duration,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [value, duration, animated, reducedMotion]);

  const animatedProps = useAnimatedProps(
    () => ({
      text: `${prefix}${Math.round(animated.value)}${suffix}`,
      defaultValue: `${prefix}${Math.round(animated.value)}${suffix}`,
    }) as object,
  );

  return (
    <AnimatedTextInput
      editable={false}
      style={[
        { padding: 0, margin: 0, includeFontPadding: false, textAlignVertical: 'center' },
        style,
      ]}
      value={`${prefix}${Math.round(value)}${suffix}`}
      animatedProps={animatedProps}
      underlineColorAndroid="transparent"
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      accessibilityLabel={accessibilityLabel ?? `${prefix}${value}${suffix}`}
    />
  );
}
