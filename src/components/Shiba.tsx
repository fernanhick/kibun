import { useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSegments } from 'expo-router';
import { Image } from 'expo-image';
import { getMascotSource } from '@constants/mascotAnimations';
import type { MascotVariant } from '@constants/mascotAnimations';
import { useReducedMotion } from '@hooks/useReducedMotion';

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
  hideOnTabRoutes?: boolean;
  onFinish?: () => void;
  style?: StyleProp<ViewStyle>;
  /**
   * Opt-in screen-reader label. Omit it (the default) and the mascot is exposed
   * as decorative, which is what it is at every current call site — it always
   * sits beside text that already says whatever the art is conveying.
   *
   * The previous behaviour announced `Shiba ${variant}` on all 9 screens that
   * render it, which both leaked an internal token name and was hardcoded
   * English in an app that ships 4 locales. If a future usage makes the mascot
   * genuinely informative, pass a translated string here.
   */
  accessibilityLabel?: string;
}

export function Shiba({
  variant,
  size = 120,
  loop = true,
  autoPlay = true,
  floating = false,
  hideOnTabRoutes = true,
  onFinish,
  style,
  accessibilityLabel,
}: ShibaProps) {
  const segments = useSegments();
  // A shared value, not `useRef(new Animated.Value(0)).current`. The old form
  // constructed a fresh Animated.Value on EVERY render and threw it away —
  // `useRef` ignores its argument after the first call — and reading `.current`
  // during render is what `react-hooks/refs` was reporting seven times here.
  const floatY = useSharedValue(0);
  const isTabRoute = segments[0] === '(tabs)';
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    // The float is a CONTINUOUS loop and this component renders on 9 screens,
    // so it was the app's largest source of unstoppable ambient motion. Bail
    // before starting it when Reduce Motion is on — the mascot simply rests.
    if (!floating || reducedMotion) {
      floatY.value = 0;
      return;
    }
    const leg = { duration: 1700, easing: Easing.inOut(Easing.quad) };
    floatY.value = withRepeat(
      withSequence(withTiming(-4, leg), withTiming(0, leg)),
      -1, // forever
      false,
    );
    // An infinite repeat outlives its effect unless it is cancelled. The legacy
    // version needed the same guarantee (`loopAnim.stop()`) — without it the
    // loop keeps running on the UI thread after `floating` flips false.
    return () => cancelAnimation(floatY);
  }, [floating, floatY, reducedMotion]);

  const floatStyle = useAnimatedStyle(() => ({ transform: [{ translateY: floatY.value }] }));

  // For non-looping animations with onFinish, approximate one cycle duration.
  useEffect(() => {
    if (!onFinish) return;
    const timer = setTimeout(onFinish, 3000);
    return () => clearTimeout(timer);
  }, [onFinish]);

  const mascotVariant = VARIANT_TO_MASCOT[variant];
  const source = getMascotSource(mascotVariant);

  // Keep only the tab-bar mascot as the primary animation on tab screens.
  if (hideOnTabRoutes && isTabRoute) {
    return null;
  }

  return (
    <Animated.View
      style={[{ width: size, height: size }, floatStyle, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      accessibilityElementsHidden={!accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}
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
