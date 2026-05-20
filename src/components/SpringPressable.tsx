import React, { useCallback } from 'react';
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { motion } from '@constants/theme';
import { useReducedMotion } from '@hooks/useReducedMotion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface SpringPressableProps extends PressableProps {
  style?: StyleProp<ViewStyle>;
  pressedScale?: number;
  springPreset?: keyof typeof motion.spring;
  children?: React.ReactNode;
}

export function SpringPressable({
  style,
  pressedScale = motion.scale.pressed,
  springPreset = 'snappy',
  onPressIn,
  onPressOut,
  disabled,
  children,
  ...rest
}: SpringPressableProps) {
  const scale = useSharedValue(1);
  const spring = motion.spring[springPreset];
  const reducedMotion = useReducedMotion();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(
    (e: Parameters<NonNullable<PressableProps['onPressIn']>>[0]) => {
      if (!reducedMotion && !disabled) {
        scale.value = withSpring(pressedScale, spring);
      }
      onPressIn?.(e);
    },
    [onPressIn, pressedScale, scale, spring, reducedMotion, disabled],
  );

  const handlePressOut = useCallback(
    (e: Parameters<NonNullable<PressableProps['onPressOut']>>[0]) => {
      if (!reducedMotion && !disabled) {
        scale.value = withSpring(1, spring);
      }
      onPressOut?.(e);
    },
    [onPressOut, scale, spring, reducedMotion, disabled],
  );

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}
