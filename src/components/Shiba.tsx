import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { getMascotSource } from '@constants/mascotAnimations';
import type { MascotVariant } from '@constants/mascotAnimations';

export type ShibaVariant = 'happy' | 'excited' | 'sad' | 'neutral';

/** Map legacy Shiba variants to mascot animation variants. */
const VARIANT_TO_MASCOT: Record<ShibaVariant, MascotVariant> = {
  happy: 'happy',
  excited: 'happy',
  sad: 'sad',
  neutral: 'tired',
};

interface ShibaProps {
  variant: ShibaVariant;
  size?: number;
  loop?: boolean;
  autoPlay?: boolean;
  floating?: boolean;
  onFinish?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function Shiba({
  variant,
  size = 120,
  loop = true,
  autoPlay = true,
  floating = false,
  onFinish,
  style,
}: ShibaProps) {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!floating) return;
    const loopAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -4,
          duration: 1700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loopAnim.start();
    return () => loopAnim.stop();
  }, [floating, floatAnim]);

  // For non-looping animations with onFinish, approximate one cycle duration.
  useEffect(() => {
    if (!onFinish) return;
    const timer = setTimeout(onFinish, 3000);
    return () => clearTimeout(timer);
  }, [onFinish]);

  const mascotVariant = VARIANT_TO_MASCOT[variant];
  const source = getMascotSource(mascotVariant);

  return (
    <Animated.View
      style={[
        { width: size, height: size, transform: [{ translateY: floatAnim }] },
        style,
      ]}
      accessibilityLabel={`Shiba ${variant}`}
      accessibilityRole="image"
    >
      <Image
        source={source}
        style={{ width: size, height: size }}
        contentFit="contain"
        autoplay={autoPlay}
      />
    </Animated.View>
  );
}
