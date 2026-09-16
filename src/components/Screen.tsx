import React from 'react';
import {
  Platform,
  ScrollView,
  View,
  StyleSheet,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Reanimated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSegments } from 'expo-router';
// SafeAreaView must come from react-native-safe-area-context (NOT react-native).
// The app wraps its tree in SafeAreaProvider from this package in app/_layout.tsx.
// Using react-native's SafeAreaView bypasses the provider context and produces
// incorrect insets on notched iOS devices (iPhone X+, Dynamic Island) silently.
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '@constants/theme';
import { useTheme, type ThemePalette } from '@theme/ThemeContext';
import { useThemedStyles } from '@hooks/useThemedStyles';
import { SCREEN_MAX_WIDTH } from '@constants/breakpoints';
import { useResponsive } from '@hooks/useResponsive';
import {
  TAB_BAR_VISUAL_OBSTRUCTION,
  TAB_BAR_SAFE_BOTTOM_ANDROID,
  TAB_BAR_SAFE_BOTTOM_MIN,
  getTabBarScale,
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
  // Reanimated scroll handler — pass the `onScroll` from useScreenScroll() to
  // track scroll offset on the UI thread. It used to drive the floating bar's
  // hide-on-scroll; the bar is docked now and never hides, so nothing reads the
  // offset today and this wiring is inert.
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

export function Screen({
  children,
  scrollable = false,
  style,
  contentContainerStyle,
  layout = 'centered',
  edgePadding = 'default',
  onScroll,
}: ScreenProps) {
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const responsive = useResponsive();
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(createStyles);
  const isTabRoute = segments[0] === '(tabs)';
  const tabSafeBottom =
    Platform.OS === 'android'
      ? TAB_BAR_SAFE_BOTTOM_ANDROID
      : Math.max(insets.bottom, TAB_BAR_SAFE_BOTTOM_MIN);

  // The tab bar is DOCKED (see BottomTabBar), so React Navigation already
  // excludes it from the screen viewport and screens must not pad for it —
  // TAB_BAR_VISUAL_OBSTRUCTION is 0 and this resolves to the safe inset alone.
  // Historically this reserved 149dp for the Kawaii shelf, then 74dp for the
  // floating pill, both of which drew ON TOP of content.
  const tabScale = getTabBarScale(responsive.width);
  const tabVisualObstruction = TAB_BAR_VISUAL_OBSTRUCTION * tabScale;
  const tabBottomInset = isTabRoute ? tabVisualObstruction + tabSafeBottom : 0;
  const flattenedContentStyle = StyleSheet.flatten(contentContainerStyle);
  const {
    paddingBottom: _contentPaddingBottom,
    paddingHorizontal: _contentPaddingHorizontal,
    paddingLeft: _contentPaddingLeft,
    paddingRight: _contentPaddingRight,
    ...innerContentStyle
  } = flattenedContentStyle ?? {};
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
        colors={[colors.background, colors.surface]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backgroundGradient}
      />
      {/*
        Ambient wash. This replaced three clip-art clouds — each built from a
        rounded base plus two puff Views and driven by its own infinite legacy
        `Animated.loop` — that rendered on EVERY screen in the app. Three
        problems: they read as the cheapest thing on screen, they never checked
        AccessibilityInfo.isReduceMotionEnabled, and they were light-mode only,
        so the app lost its whole ambient layer the moment dark mode shipped.

        The replacement is two soft blush blobs: static (zero timers), tinted
        from the palette so both themes get the same treatment, and low enough
        in opacity to sit behind content rather than compete with it.
      */}
      <View pointerEvents="none" style={styles.bgDecor}>
        <LinearGradient
          colors={[isDark ? 'rgba(240,143,173,0.10)' : 'rgba(176,73,106,0.07)', 'transparent']}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={[styles.blob, styles.blobTop]}
        />
        <LinearGradient
          colors={[isDark ? 'rgba(192,140,214,0.09)' : 'rgba(139,78,133,0.055)', 'transparent']}
          start={{ x: 0.9, y: 0 }}
          end={{ x: 0.1, y: 1 }}
          style={[styles.blob, styles.blobBottom]}
        />
        <SparkleOverlay variant="screen" count={10} />
      </View>
      {scrollable ? (
        onScroll ? (
          <Reanimated.ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: resolvedPaddingBottom, paddingHorizontal: 0 },
            ]}
            keyboardShouldPersistTaps="handled"
            onScroll={onScroll}
            scrollEventThrottle={16}
          >
            <View style={[innerWrapperStyle, innerContentStyle]}>{children}</View>
          </Reanimated.ScrollView>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: resolvedPaddingBottom, paddingHorizontal: 0 },
            ]}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[innerWrapperStyle, innerContentStyle]}>{children}</View>
          </ScrollView>
        )
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

const createStyles = (colors: ThemePalette) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFill,
  },
  bgDecor: {
    ...StyleSheet.absoluteFill,
  },
  // Blob geometry is percentage-based so it distributes proportionally across
  // phones, tablets in portrait, and tablets in landscape — absolute sizes
  // would cluster in the top-left corner on a wide canvas.
  blob: {
    position: 'absolute',
    borderRadius: 9999,
  },
  blobTop: {
    width: '95%',
    height: '38%',
    top: '-9%',
    left: '-22%',
  },
  blobBottom: {
    width: '85%',
    height: '32%',
    bottom: '4%',
    right: '-24%',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
});
