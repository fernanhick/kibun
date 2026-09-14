import React from 'react';
import {
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { useRouter, useSegments, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SCREEN_MAX_WIDTH } from '@constants/breakpoints';
import { getContentScale } from '@constants/layout';
import { getMascotSource } from '@constants/mascotAnimations';
import { motion } from '@constants/theme';
import { useMoodEntryStore } from '@store/index';

const BASE_MASCOT_SIZE = 136;
const MASCOT_EDGE_GAP = 16;

const HIDDEN_ROUTES = new Set(['(onboarding)', 'paywall', 'register', 'auth']);
const DETAIL_ROUTES = new Set(['ai-report', 'day-detail', 'check-in', 'mood-confirm', 'exercise']);

function getOverlayState(segments: string[]) {
  const topLevelRoute = segments[0] ?? '(tabs)';
  const isTabRoute = topLevelRoute === '(tabs)';
  const isDetailRoute = DETAIL_ROUTES.has(topLevelRoute);
  const isHiddenRoute = HIDDEN_ROUTES.has(topLevelRoute);

  return {
    // Hide on tab routes — the mascot lives in the home hero (HomeHero.tsx)
    // since the floating pill tab bar replaced the mascot shelf.
    isVisible: !isHiddenRoute && !isTabRoute && isDetailRoute,
    isTabRoute,
  };
}

export function PersistentMascotOverlay() {
  const { t } = useTranslation('screens');
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const segments = useSegments();
  const { width: windowWidth } = useWindowDimensions();
  const opacity = useSharedValue(1);
  const [keyboardVisible, setKeyboardVisible] = React.useState(false);
  const lastMoodId = useMoodEntryStore((s) => s.entries[0]?.moodId);

  const { isVisible } = getOverlayState(segments);
  const topRoute = segments[0] ?? '(tabs)';
  const isCheckInFlow = topRoute === 'check-in' || topRoute === 'mood-confirm' || topRoute === 'exercise';

  React.useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Opacity only, and deliberately NOT gated on Reduce Motion. Apple's setting
  // SUBSTITUTES cross-fades for motion rather than removing all transition, so
  // a fade is already the reduced-motion-correct behaviour here.
  React.useEffect(() => {
    opacity.value = withTiming(keyboardVisible ? 0.32 : 1, {
      duration: motion.timing.fast,
      easing: Easing.out(Easing.quad),
    });
  }, [keyboardVisible, opacity]);

  const opacityStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));


  if (!isVisible) {
    return null;
  }

  const mascotSize = Math.round(BASE_MASCOT_SIZE * getContentScale(windowWidth));
  const bottomOffset = Math.max(insets.bottom, 16) + 16;
  // On wide screens (tablet landscape), shift the mascot just outside the
  // centered content column so it doesn't overlap content. On phones and
  // narrow tablets, the gutter is too small — clamp to the screen-edge gap.
  const columnGutter = (windowWidth - SCREEN_MAX_WIDTH.tabletLg) / 2;
  const rightOffset = Math.max(MASCOT_EDGE_GAP, columnGutter - mascotSize - MASCOT_EDGE_GAP);

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Animated.View
        style={[
          styles.container,
          { bottom: bottomOffset, right: rightOffset },
          opacityStyle,
        ]}
      >
        <Pressable
          accessibilityLabel={isCheckInFlow ? undefined : t('tabs.logMoodA11y')}
          accessibilityRole={isCheckInFlow ? undefined : 'button'}
          accessibilityElementsHidden={isCheckInFlow}
          importantForAccessibility={isCheckInFlow ? 'no-hide-descendants' : 'yes'}
          onPress={isCheckInFlow ? undefined : () => router.push('/check-in' as Href)}
          style={({ pressed }) => [
            styles.button,
            { width: mascotSize, height: mascotSize },
            !isCheckInFlow && pressed && styles.buttonPressed,
          ]}
        >
          <Image
            source={getMascotSource(lastMoodId)}
            style={[styles.image, { width: mascotSize, height: mascotSize }]}
            contentFit="contain"
            autoplay
          />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    transform: [{ scale: 0.97 }],
  },
  image: {
    backgroundColor: 'transparent',
  },
});