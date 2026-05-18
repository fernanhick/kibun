import { useEffect, useMemo } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { getMascotSource } from '@constants/mascotAnimations';
import { typography, spacing } from '@constants/theme';

interface SplashScreenViewProps {
  onFinish: () => void;
}

const SPARKLE_RECIPE: { xPct: number; yPct: number; size: number; delay: number; opacity: number }[] = [
  { xPct: 0.18, yPct: 0.28, size: 8,  delay: 0,   opacity: 0.35 },
  { xPct: 0.75, yPct: 0.32, size: 12, delay: 200, opacity: 0.25 },
  { xPct: 0.12, yPct: 0.55, size: 6,  delay: 400, opacity: 0.4  },
  { xPct: 0.82, yPct: 0.58, size: 10, delay: 100, opacity: 0.3  },
  { xPct: 0.5,  yPct: 0.22, size: 7,  delay: 300, opacity: 0.2  },
  { xPct: 0.65, yPct: 0.68, size: 9,  delay: 500, opacity: 0.28 },
];

function Sparkle({ x, y, size, delay, baseOpacity }: {
  x: number; y: number; size: number; delay: number; baseOpacity: number;
}) {
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(baseOpacity, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(baseOpacity * 0.3, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    ));
    scale.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(1.3, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.7, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    ));
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.sparkle,
        style,
        { left: x - size / 2, top: y - size / 2, width: size, height: size, borderRadius: size / 2 },
      ]}
    />
  );
}

export function SplashScreenView({ onFinish }: SplashScreenViewProps) {
  const { width, height } = useWindowDimensions();
  const sparkles = useMemo(
    () => SPARKLE_RECIPE.map((s) => ({ ...s, x: width * s.xPct, y: height * s.yPct })),
    [width, height],
  );
  const mascotScale = useSharedValue(0.2);
  const mascotTranslateY = useSharedValue(40);
  const mascotOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(20);
  const subtitleOpacity = useSharedValue(0);

  useEffect(() => {
    mascotOpacity.value = withDelay(150, withTiming(1, { duration: 300 }));
    mascotScale.value = withDelay(150, withSpring(1, { damping: 10, stiffness: 120, mass: 0.8 }));
    mascotTranslateY.value = withDelay(150, withSpring(0, { damping: 12, stiffness: 100 }));

    titleOpacity.value = withDelay(450, withTiming(1, { duration: 350, easing: Easing.out(Easing.ease) }));
    titleTranslateY.value = withDelay(450, withTiming(0, { duration: 350, easing: Easing.out(Easing.ease) }));

    subtitleOpacity.value = withDelay(650, withTiming(1, { duration: 350, easing: Easing.out(Easing.ease) }));

    const timer = setTimeout(onFinish, 2500);
    return () => clearTimeout(timer);
  }, [onFinish]);

  const mascotStyle = useAnimatedStyle(() => ({
    opacity: mascotOpacity.value,
    transform: [
      { scale: mascotScale.value },
      { translateY: mascotTranslateY.value },
    ],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
  }));

  return (
    <LinearGradient
      colors={['#4A86FF', '#7B5EA7', '#C77DFF']}
      start={{ x: 0.3, y: 0 }}
      end={{ x: 0.7, y: 1 }}
      style={styles.container}
    >
      {sparkles.map((s, i) => (
        <Sparkle key={i} x={s.x} y={s.y} size={s.size} delay={s.delay} baseOpacity={s.opacity} />
      ))}

      <View style={styles.content}>
        <Animated.View style={[styles.mascotWrapper, mascotStyle]}>
          <Image
            source={getMascotSource('happy')}
            style={styles.mascot}
            contentFit="contain"
            autoplay
          />
        </Animated.View>

        <Animated.Text style={[styles.title, titleStyle]}>
          kibun
        </Animated.Text>

        <Animated.Text style={[styles.subtitle, subtitleStyle]}>
          気分
        </Animated.Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkle: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
  },
  mascotWrapper: {
    marginBottom: spacing.sm,
  },
  mascot: {
    width: 280,
    height: 280,
  },
  title: {
    fontSize: typography.sizes.display,
    fontFamily: typography.fonts.display,
    color: '#FFFFFF',
    marginTop: spacing[3],
    textShadowColor: 'rgba(255, 255, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fonts.body,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: spacing.xs,
    letterSpacing: 4,
  },
});
