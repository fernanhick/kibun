import React, { useCallback, useEffect, useRef } from 'react';
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { motion } from '@constants/theme';
import { haptics } from '@lib/haptics';
import { useReducedMotion } from '@hooks/useReducedMotion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface SpringPressableProps extends PressableProps {
  style?: StyleProp<ViewStyle>;
  pressedScale?: number;
  springPreset?: keyof typeof motion.spring;
  /**
   * Reward moment. When this flips false → true the surface plays a celebratory
   * overshoot pop plus a success haptic — the "habit completion celebration"
   * pattern. It deliberately fires ONLY on the rising edge, so un-completing a
   * habit is silent: the reward has to mean something to keep working.
   */
  celebrateOn?: boolean;
  /**
   * NOTE: there is deliberately no `staggerIndex` here any more. It used to put
   * an `entering` animation on this component's own root to avoid a wrapper node
   * per grid item — but Reanimated overwrites an element's `transform` when a
   * layout animation and an animated style target the SAME component, and the
   * press scale IS this component's transform. Wrap in <Stagger> instead.
   */
  children?: React.ReactNode;
}

export function SpringPressable({
  style,
  pressedScale = motion.scale.pressed,
  springPreset = 'snappy',
  celebrateOn,
  onPressIn,
  onPressOut,
  disabled,
  children,
  ...rest
}: SpringPressableProps) {
  const scale = useSharedValue(1);
  const spring = motion.spring[springPreset];
  const reducedMotion = useReducedMotion();

  // Rising-edge detector. A ref (not state) so recognising the edge never costs
  // a render — the animation runs entirely on the UI thread.
  const wasCelebrating = useRef(celebrateOn ?? false);
  useEffect(() => {
    const now = celebrateOn ?? false;
    const rose = now && !wasCelebrating.current;
    wasCelebrating.current = now;
    if (!rose) return;
    haptics.success();
    if (reducedMotion) return;
    scale.value = withSequence(
      withSpring(motion.scale.pop, motion.spring.celebrate),
      withSpring(1, motion.spring.bouncy),
    );
  }, [celebrateOn, reducedMotion, scale]);

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
    // No `entering` here, deliberately. Reanimated overwrites an element's
    // `transform` when a layout animation and an animated style target the SAME
    // component, and this component exists to animate `transform` on press — so
    // an entrance on this node fought the spring and logged
    // "Property `transform` of AnimatedComponent(Pressable) may be overwritten
    // by a layout animation". Callers that want a staggered entrance wrap this
    // in <Stagger>, which is a bare Animated.View with no transform of its own.
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
