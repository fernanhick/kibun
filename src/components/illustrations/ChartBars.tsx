import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { useReducedMotion } from '@hooks/useReducedMotion';
import { motion, radius } from '@constants/theme';

const BAR_HEIGHTS = [0.4, 0.7, 0.55, 0.92];

interface ChartBarsProps {
  size?: number;
  accent: string;
  trackTint: string;
}

export function ChartBars({ size = 160, accent, trackTint }: ChartBarsProps) {
  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      {BAR_HEIGHTS.map((h, i) => (
        <Bar
          key={i}
          targetRatio={h}
          index={i}
          accent={accent}
          trackTint={trackTint}
          maxHeight={size * 0.7}
        />
      ))}
    </View>
  );
}

interface BarProps {
  targetRatio: number;
  index: number;
  accent: string;
  trackTint: string;
  maxHeight: number;
}

function Bar({ targetRatio, index, accent, trackTint, maxHeight }: BarProps) {
  const ratio = useSharedValue(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      ratio.value = targetRatio;
    } else {
      ratio.value = withDelay(index * 110, withSpring(targetRatio, motion.spring.gentle));
    }
  }, [ratio, targetRatio, index, reducedMotion]);

  const fillStyle = useAnimatedStyle(() => ({ height: ratio.value * maxHeight }));

  return (
    <View style={[styles.barTrack, { height: maxHeight, backgroundColor: trackTint }]}>
      <Animated.View style={[styles.barFill, { backgroundColor: accent }, fillStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 12,
  },
  barTrack: {
    width: 22,
    borderRadius: radius.sm,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    borderRadius: radius.sm,
  },
});
