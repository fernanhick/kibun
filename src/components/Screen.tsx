import React from 'react';
import {
  Animated,
  Easing,
  Platform,
  ScrollView,
  View,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSegments } from 'expo-router';
// SafeAreaView must come from react-native-safe-area-context (NOT react-native).
// The app wraps its tree in SafeAreaProvider from this package in app/_layout.tsx.
// Using react-native's SafeAreaView bypasses the provider context and produces
// incorrect insets on notched iOS devices (iPhone X+, Dynamic Island) silently.
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '@constants/theme';
import { SCREEN_MAX_WIDTH } from '@constants/breakpoints';
import { useResponsive } from '@hooks/useResponsive';
import {
  KAWAII_TAB_VISUAL_OBSTRUCTION,
  KAWAII_TAB_SAFE_BOTTOM_ANDROID,
  KAWAII_TAB_SAFE_BOTTOM_MIN,
} from '@constants/layout';
import { SparkleOverlay } from './SparkleOverlay';

// `centered` clamps to a comfortable reading width on tablets (720). `wide`
// clamps wider (920) — for screens that host master-detail or multi-column
// layouts. `full` opts out of clamping entirely (the screen handles its own
// layout). Below the tablet breakpoint, all three behave identically.
type ScreenLayout = 'centered' | 'wide' | 'full';
type EdgePadding = 'default' | 'large' | 'none';

interface ScreenProps {
  children: React.ReactNode;
  scrollable?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  layout?: ScreenLayout;
  edgePadding?: EdgePadding;
}

export function Screen({
  children,
  scrollable = false,
  style,
  contentContainerStyle,
  layout = 'centered',
  edgePadding = 'default',
}: ScreenProps) {
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const responsive = useResponsive();
  const driftA = React.useRef(new Animated.Value(0)).current;
  const driftB = React.useRef(new Animated.Value(0)).current;
  const driftC = React.useRef(new Animated.Value(0)).current;
  const isTabRoute = segments[0] === '(tabs)';
  const tabSafeBottom =
    Platform.OS === 'android'
      ? KAWAII_TAB_SAFE_BOTTOM_ANDROID
      : Math.max(insets.bottom, KAWAII_TAB_SAFE_BOTTOM_MIN);

  // Reserve room for the custom tab bar + raised mascot so bottom content can scroll above it.
  const tabBottomInset = isTabRoute ? KAWAII_TAB_VISUAL_OBSTRUCTION + tabSafeBottom : 0;
  const flattenedContentStyle = StyleSheet.flatten(contentContainerStyle);
  const requestedPaddingBottom = flattenedContentStyle?.paddingBottom;
  const minPaddingBottom = styles.scrollContent.paddingBottom + tabBottomInset;
  const resolvedPaddingBottom =
    typeof requestedPaddingBottom === 'number'
      ? Math.max(requestedPaddingBottom, minPaddingBottom)
      : minPaddingBottom;

  // Tablet-aware max-width clamp (no clamp on phone — layout is identical).
  const maxWidth =
    layout === 'full' || !responsive.isTablet
      ? undefined
      : layout === 'wide'
        ? SCREEN_MAX_WIDTH.tabletLg
        : SCREEN_MAX_WIDTH.tablet;

  const horizontalPadding =
    edgePadding === 'none'
      ? 0
      : edgePadding === 'large'
        ? responsive.select({ phone: spacing.screenPadding, tablet: spacing.xl, tabletLg: spacing.xxl })
        : responsive.select({ phone: spacing.screenPadding, tablet: spacing.lg, tabletLg: spacing.xl });

  React.useEffect(() => {
    const createDrift = (value: Animated.Value, duration: number, distance: number) => {
      const forward = Animated.timing(value, {
        toValue: distance,
        duration,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      });
      const backward = Animated.timing(value, {
        toValue: 0,
        duration,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      });
      return Animated.loop(Animated.sequence([forward, backward]));
    };

    const loopA = createDrift(driftA, 12000, 8);
    const loopB = createDrift(driftB, 15000, -10);
    const loopC = createDrift(driftC, 18000, 7);

    loopA.start();
    loopB.start();
    loopC.start();

    return () => {
      loopA.stop();
      loopB.stop();
      loopC.stop();
    };
  }, [driftA, driftB, driftC]);

  const innerWrapperStyle: ViewStyle = {
    width: '100%',
    maxWidth,
    alignSelf: 'center',
    paddingHorizontal: horizontalPadding,
    ...(scrollable ? null : { flex: 1 }),
  };

  return (
    <SafeAreaView style={[styles.safeArea, style]}>
      <LinearGradient
        colors={['#E9F6FF', '#F8FDFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backgroundGradient}
      />
      <View pointerEvents="none" style={styles.bgDecor}>
        <SparkleOverlay variant="screen" count={34} />
        <Animated.View style={[styles.cloud, styles.cloudOne, { transform: [{ translateX: driftA }, { scale: 0.95 }] }]}>
          <View style={styles.cloudBase} />
          <View style={[styles.cloudPuff, styles.cloudPuffLeft]} />
          <View style={[styles.cloudPuff, styles.cloudPuffRight]} />
        </Animated.View>
        <Animated.View style={[styles.cloud, styles.cloudTwo, { transform: [{ translateX: driftB }, { scale: 1.1 }] }]}>
          <View style={styles.cloudBase} />
          <View style={[styles.cloudPuff, styles.cloudPuffLeft]} />
          <View style={[styles.cloudPuff, styles.cloudPuffRight]} />
        </Animated.View>
        <Animated.View style={[styles.cloud, styles.cloudThree, { transform: [{ translateX: driftC }, { scale: 0.88 }] }]}>
          <View style={styles.cloudBase} />
          <View style={[styles.cloudPuff, styles.cloudPuffLeft]} />
          <View style={[styles.cloudPuff, styles.cloudPuffRight]} />
        </Animated.View>
      </View>
      {scrollable ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            contentContainerStyle,
            { paddingBottom: resolvedPaddingBottom, paddingHorizontal: 0 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={innerWrapperStyle}>{children}</View>
        </ScrollView>
      ) : (
        <View
          style={[
            styles.content,
            isTabRoute && { paddingBottom: tabBottomInset },
          ]}
        >
          <View style={[innerWrapperStyle, contentContainerStyle]}>{children}</View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  bgDecor: {
    ...StyleSheet.absoluteFillObject,
  },
  cloud: {
    position: 'absolute',
    width: 116,
    height: 56,
    opacity: 0.9,
  },
  cloudBase: {
    position: 'absolute',
    bottom: 0,
    left: 14,
    width: 82,
    height: 32,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.66)',
  },
  cloudPuff: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  cloudPuffLeft: {
    width: 34,
    height: 34,
    left: 8,
    bottom: 16,
  },
  cloudPuffRight: {
    width: 44,
    height: 44,
    left: 48,
    bottom: 18,
  },
  // Cloud positions are percentage-based so they distribute proportionally
  // across phones, tablets in portrait, and tablets in landscape (where
  // absolute positions would cluster top-left on a wide canvas).
  cloudOne: {
    top: '6%',
    left: '-3%',
  },
  cloudTwo: {
    top: '14%',
    right: '-4%',
  },
  cloudThree: {
    bottom: '4%',
    left: '10%',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
});
