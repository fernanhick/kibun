import React, { useEffect } from 'react';
import Svg, { Path, Ellipse, G } from 'react-native-svg';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useReducedMotion } from '@hooks/useReducedMotion';

interface SaplingProps {
  size?: number;
  accent: string;
  soilTint: string;
}

export function Sapling({ size = 160, accent, soilTint }: SaplingProps) {
  const sway = useSharedValue(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      sway.value = 0;
      return;
    }
    sway.value = withRepeat(
      withTiming(1, { duration: 3500, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    return () => cancelAnimation(sway);
  }, [sway, reducedMotion]);

  const plantStyle = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${(sway.value - 0.5) * 4}deg` }],
  }));

  return (
    <Animated.View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 160 160" style={{ position: 'absolute' }}>
        <Ellipse cx="80" cy="128" rx="46" ry="10" fill={soilTint} />
      </Svg>
      <Animated.View style={[{ width: size, height: size, position: 'absolute' }, plantStyle]}>
        <Svg width={size} height={size} viewBox="0 0 160 160">
          <G>
            <Path
              d="M80 128 Q78 100 80 80 Q82 60 80 44"
              stroke={accent}
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
            <Path d="M80 78 Q60 70 54 56 Q66 56 78 70 Z" fill={accent} opacity={0.85} />
            <Path d="M80 64 Q104 56 110 42 Q98 40 82 56 Z" fill={accent} />
            <Ellipse cx="80" cy="42" rx="5" ry="6" fill={accent} />
          </G>
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}
