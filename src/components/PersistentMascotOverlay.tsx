import React from 'react';
import {
  Animated,
  Easing,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useSegments, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, shadows } from '@constants/theme';
import { getMascotSource } from '@constants/mascotAnimations';
import { useMoodEntryStore } from '@store/index';

const HIDDEN_ROUTES = new Set(['(onboarding)', 'paywall', 'register', 'auth']);
const DETAIL_ROUTES = new Set(['ai-report', 'day-detail', 'check-in', 'mood-confirm', 'exercise']);

function getOverlayState(segments: string[]) {
  const topLevelRoute = segments[0] ?? '(tabs)';
  const isTabRoute = topLevelRoute === '(tabs)';
  const isDetailRoute = DETAIL_ROUTES.has(topLevelRoute);
  const isHiddenRoute = HIDDEN_ROUTES.has(topLevelRoute);

  return {
    // Hide on tab routes — mascot lives in the tab bar now
    isVisible: !isHiddenRoute && !isTabRoute && isDetailRoute,
    isTabRoute,
  };
}

export function PersistentMascotOverlay() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const segments = useSegments();
  const opacity = React.useRef(new Animated.Value(1)).current;
  const [keyboardVisible, setKeyboardVisible] = React.useState(false);
  const lastMoodId = useMoodEntryStore((s) => s.entries[0]?.moodId);

  const { isVisible, isTabRoute } = getOverlayState(segments);
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

  React.useEffect(() => {
    const targetOpacity = keyboardVisible ? 0.32 : 1;
    Animated.timing(opacity, {
      toValue: targetOpacity,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [keyboardVisible, opacity]);


  if (!isVisible) {
    return null;
  }

  const bottomOffset = Math.max(insets.bottom, 16) + 16;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Animated.View
        style={[
          styles.container,
          {
            bottom: bottomOffset,
            opacity,
          },
        ]}
      >
        <Pressable
          accessibilityLabel={isCheckInFlow ? 'Mascot' : 'Open check-in'}
          accessibilityRole={isCheckInFlow ? 'image' : 'button'}
          onPress={isCheckInFlow ? undefined : () => router.push('/check-in' as Href)}
          style={({ pressed }) => [styles.button, !isCheckInFlow && pressed && styles.buttonPressed]}
        >
          <Image
            source={getMascotSource(lastMoodId)}
            style={styles.image}
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
    right: 16,
  },
  button: {
    width: 136,
    height: 136,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    transform: [{ scale: 0.97 }],
  },
  image: {
    width: 136,
    height: 136,
    backgroundColor: 'transparent',
  },
});