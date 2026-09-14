import { useEffect, useMemo } from 'react';
import { View, Pressable, Text, StyleSheet, Platform } from 'react-native';
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { haptics } from '@lib/haptics';
import { typography, radius, motion, elevation } from '@constants/theme';
import { useTheme, type ThemeValue } from '@theme/ThemeContext';
import {
  TAB_BAR_HEIGHT,
  TAB_BAR_MARGIN,
  TAB_BAR_BOTTOM_GAP,
  TAB_BAR_SAFE_BOTTOM_ANDROID,
  TAB_BAR_SAFE_BOTTOM_MIN,
  getTabBarScale,
} from '@constants/layout';
import { SCREEN_MAX_WIDTH } from '@constants/breakpoints';
import { useResponsive } from '@hooks/useResponsive';
import { useReducedMotion } from '@hooks/useReducedMotion';
import { useTabBarVisibility } from '@hooks/useScreenScroll';

// ─── FloatingTabBar ───────────────────────────────────────────────────────────
// A Liquid Glass pill: inset from all three screen edges, translucent, with
// content scrolling beneath it and a spring-driven indicator that slides
// between tabs.
//
// Replaces KawaiiTabBar, which had three problems beyond its size:
//   • it hardcoded FOUR accent colours (#6E9C8C #C56B86 #7FA9A0 #9E8FB0), one
//     per tab — the textbook "circa-2017 Material 1" look, and none of them
//     tracked the theme, so all four survived unchanged into dark mode;
//   • the active icon rendered white-on-white when unfocused
//     (`color={focused ? '#fff' : '#fff'}`) against a hardcoded pink chip;
//   • it drove its animations through the legacy `Animated` API on the JS
//     thread rather than Reanimated worklets.
//
// Everything here uses the single brand accent and reads from the palette.
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

// The old bar imported `BottomTabBarProps` from '@react-navigation/bottom-tabs',
// which is NOT a dependency of this project — expo-router 56 ships its own tabs
// implementation. TypeScript silently resolved the whole props object to `any`,
// which is where four of the repo's nine baseline type errors came from. This
// is the structural contract the component actually consumes, declared locally.
interface TabRoute {
  key: string;
  name: string;
}

interface TabDescriptor {
  options: {
    // React Navigation allows a render function here, not just a string, so the
    // call site has to narrow before rendering it as text. The old bar cast it
    // straight to `string` — harmless only because this app always passes a
    // plain `title`.
    tabBarLabel?: string | ((props: never) => React.ReactNode);
    title?: string;
  };
}

export interface TabBarProps {
  state: { index: number; routes: TabRoute[] };
  descriptors: Record<string, TabDescriptor>;
  navigation: {
    emit(event: {
      type: 'tabPress';
      target: string;
      canPreventDefault: true;
    }): { defaultPrevented: boolean };
    navigate(name: string): void;
  };
}

const TAB_ICONS: Record<string, { outline: IoniconName; filled: IoniconName }> = {
  index: { outline: 'home-outline', filled: 'home' },
  history: { outline: 'calendar-outline', filled: 'calendar' },
  insights: { outline: 'sparkles-outline', filled: 'sparkles' },
  settings: { outline: 'options-outline', filled: 'options' },
};

interface TabButtonProps {
  routeName: string;
  label: string;
  focused: boolean;
  onPress: () => void;
  iconSize: number;
  labelFont: number;
}

function TabButton({ routeName, label, focused, onPress, iconSize, labelFont }: TabButtonProps) {
  const theme = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const reducedMotion = useReducedMotion();
  const icons = TAB_ICONS[routeName];

  // A small lift on the focused icon. Kawaii-forward, but restrained — this
  // fires on every tab change, so it uses `bouncy` rather than `celebrate`.
  const lift = useSharedValue(0);
  useEffect(() => {
    if (reducedMotion) {
      lift.value = focused ? 1 : 0;
      return;
    }
    lift.value = withSpring(focused ? 1 : 0, motion.spring.bouncy);
  }, [focused, reducedMotion, lift]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -2 * lift.value }, { scale: 1 + 0.12 * lift.value }],
  }));

  if (!icons) return null;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      style={styles.tabButton}
      hitSlop={6}
    >
      <Reanimated.View style={iconStyle}>
        <Ionicons
          name={focused ? icons.filled : icons.outline}
          size={iconSize}
          color={focused ? colors.primary : colors.textSecondary}
        />
      </Reanimated.View>
      <Text
        style={[
          styles.tabLabel,
          { fontSize: labelFont },
          focused && { color: colors.primary, fontFamily: typography.fonts.bodyBold },
        ]}
        maxFontSizeMultiplier={1.2}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function FloatingTabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { isDark } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { width } = useResponsive();
  const visibility = useTabBarVisibility();
  const reducedMotion = useReducedMotion();

  const scale = getTabBarScale(width);
  const barHeight = TAB_BAR_HEIGHT * scale;
  const iconSize = 24 * scale;
  const labelFont = 11 * scale;

  const safeBottom =
    Platform.OS === 'android'
      ? TAB_BAR_SAFE_BOTTOM_ANDROID
      : Math.max(insets.bottom, TAB_BAR_SAFE_BOTTOM_MIN);

  // Pill width, after the tablet clamp. The indicator is positioned in
  // fractions of this, so it has to be a real number rather than a percentage.
  const pillWidth =
    Math.min(width, SCREEN_MAX_WIDTH.tablet) - TAB_BAR_MARGIN * 2;
  const tabCount = state.routes.length;
  const tabWidth = pillWidth / tabCount;

  // ─── Sliding indicator ────────────────────────────────────────────────────
  const indicatorX = useSharedValue(state.index * tabWidth);
  useEffect(() => {
    const target = state.index * tabWidth;
    indicatorX.value = reducedMotion
      ? target
      : withSpring(target, motion.spring.snappy);
  }, [state.index, tabWidth, reducedMotion, indicatorX]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));

  // ─── Hide on scroll ───────────────────────────────────────────────────────
  const hiddenOffset = barHeight + safeBottom + TAB_BAR_BOTTOM_GAP + 24;
  const hideStyle = useAnimatedStyle(() => {
    const h = visibility?.hidden.value ?? 0;
    return {
      transform: [{ translateY: h * hiddenOffset }],
      opacity: 1 - h * 0.4,
    };
  });

  // The blur alone is too transparent to guarantee icon contrast over arbitrary
  // scrolling content, so a tonal overlay sits on top of it. Android gets a
  // stronger overlay because BlurView there is a weaker approximation.
  const overlayBg = isDark
    ? Platform.OS === 'ios'
      ? 'rgba(31,25,32,0.60)'
      : 'rgba(31,25,32,0.90)'
    : Platform.OS === 'ios'
      ? 'rgba(255,252,249,0.62)'
      : 'rgba(255,252,249,0.92)';

  return (
    <Reanimated.View
      style={[
        styles.container,
        { paddingBottom: safeBottom + TAB_BAR_BOTTOM_GAP },
        hideStyle,
      ]}
      pointerEvents="box-none"
    >
      <View style={[styles.pill, { height: barHeight, width: pillWidth }]}>
        <BlurView
          intensity={Platform.OS === 'ios' ? 60 : 40}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: overlayBg }]} />

        <Reanimated.View
          pointerEvents="none"
          style={[
            styles.indicator,
            { width: tabWidth - 12, height: barHeight - 14 },
            indicatorStyle,
          ]}
        />

        <View style={styles.tabRow}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const focused = state.index === index;
            const label =
              typeof options.tabBarLabel === 'string'
                ? options.tabBarLabel
                : options.title ?? route.name;

            return (
              <View key={route.key} style={{ width: tabWidth }}>
                <TabButton
                  routeName={route.name}
                  label={label}
                  focused={focused}
                  iconSize={iconSize}
                  labelFont={labelFont}
                  onPress={() => {
                    const event = navigation.emit({
                      type: 'tabPress',
                      target: route.key,
                      canPreventDefault: true,
                    });
                    if (!event.defaultPrevented && !focused) {
                      haptics.light();
                      navigation.navigate(route.name);
                    }
                  }}
                />
              </View>
            );
          })}
        </View>
      </View>
    </Reanimated.View>
  );
}

const createStyles = ({ colors, isDark }: ThemeValue) =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
    },
    pill: {
      borderRadius: radius.full,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.glassBorder,
      ...elevation(3, isDark),
    },
    indicator: {
      position: 'absolute',
      left: 6,
      top: 7,
      borderRadius: radius.full,
      backgroundColor: colors.primaryLight,
    },
    tabRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    tabButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
    },
    tabLabel: {
      fontFamily: typography.fonts.ui,
      color: colors.textSecondary,
      letterSpacing: 0.1,
    },
  });
