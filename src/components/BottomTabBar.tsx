import { useEffect, useMemo } from 'react';
import { View, Pressable, Text, StyleSheet, Platform } from 'react-native';
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptics } from '@lib/haptics';
import { typography, motion } from '@constants/theme';
import { useTheme, type ThemeValue } from '@theme/ThemeContext';
import {
  TAB_BAR_HEIGHT,
  TAB_BAR_SAFE_BOTTOM_ANDROID,
  TAB_BAR_SAFE_BOTTOM_MIN,
  getTabBarScale,
} from '@constants/layout';
import { SCREEN_MAX_WIDTH } from '@constants/breakpoints';
import { useResponsive } from '@hooks/useResponsive';
import { useReducedMotion } from '@hooks/useReducedMotion';

// ─── BottomTabBar ─────────────────────────────────────────────────────────────
// A conventional docked tab bar: full-bleed, flush to the bottom edge, opaque,
// separated from content by a top hairline.
//
// Replaces FloatingTabBar (the inset "Liquid Glass" pill). The pill looked good
// but floated ABOVE the scroll view, which cost more than it returned:
//   • every screen had to reserve TAB_BAR_VISUAL_OBSTRUCTION (74dp) of bottom
//     padding so its last row could clear the pill, and any screen that forgot
//     — Insights did — ended up with content trapped underneath it. The Top
//     moods chart's x-axis labels sat behind the bar on first paint;
//   • hide-on-scroll meant the primary navigation could be absent exactly when
//     a user reached for it, and its target moved between frames;
//   • BlurView is a weak approximation on Android, so the "glass" needed a
//     0.92-alpha tonal overlay to guarantee icon contrast — at which point it
//     was an opaque bar drawn the expensive way.
//
// Docked, React Navigation gives the bar real layout space: the screen viewport
// already excludes it, nothing overlaps, and no screen needs to know it exists.
//
// No active-state pill. Selection is already carried three times over — filled
// vs outline icon, primary vs secondary colour, and a bold label — so the
// rounded chip behind the focused tab was redundant reinforcement that made the
// bar look bulky and forced a sliding-indicator animation plus per-tab pixel
// width maths. Without it each tab is simply `flex: 1`. The small spring lift on
// the focused icon is kept; it is the one piece of motion that still earns its
// place here.
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

// expo-router 56 ships its own tabs implementation; '@react-navigation/bottom-tabs'
// is NOT a dependency. Importing BottomTabBarProps from it resolved to `any` and
// was the source of four baseline type errors. This is the structural contract
// the component actually consumes, declared locally.
interface TabRoute {
  key: string;
  name: string;
}

interface TabDescriptor {
  options: {
    // React Navigation allows a render function here, not just a string, so the
    // call site has to narrow before rendering it as text.
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
    transform: [{ translateY: -1.5 * lift.value }, { scale: 1 + 0.1 * lift.value }],
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

export function BottomTabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { width } = useResponsive();

  const scale = getTabBarScale(width);
  const barHeight = TAB_BAR_HEIGHT * scale;
  const iconSize = 22 * scale;
  const labelFont = 11 * scale;

  // On Android the system nav bar is hidden (sticky immersive, see app/_layout),
  // so insets.bottom fluctuates when the user swipes to reveal it. A fixed value
  // keeps the bar from jumping. On iOS the real safe-area inset is used.
  const safeBottom =
    Platform.OS === 'android'
      ? TAB_BAR_SAFE_BOTTOM_ANDROID
      : Math.max(insets.bottom, TAB_BAR_SAFE_BOTTOM_MIN);

  // The bar is full-bleed, but on a tablet stretching four tabs across 1200dp
  // leaves them marooned in the corners. The ROW is clamped and centred; the
  // surface behind it still runs edge to edge.
  const rowWidth = Math.min(width, SCREEN_MAX_WIDTH.tablet);

  return (
    <View style={[styles.container, { paddingBottom: safeBottom }]}>
      <View style={[styles.row, { height: barHeight, width: rowWidth }]}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const label =
            typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : options.title ?? route.name;

          return (
            <View key={route.key} style={styles.tabSlot}>
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
  );
}

const createStyles = ({ colors }: ThemeValue) =>
  StyleSheet.create({
    // Opaque and docked. A hairline carries the separation from content, so the
    // bar takes a border OR a shadow, never both — see the Phase 2 sweep.
    container: {
      backgroundColor: colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      alignItems: 'center',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'stretch',
    },
    // Even quarters. With the indicator gone there is no pixel geometry to keep
    // in sync, so the row can just divide itself.
    tabSlot: {
      flex: 1,
    },
    tabButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
    },
    tabLabel: {
      fontFamily: typography.fonts.ui,
      color: colors.textSecondary,
      letterSpacing: 0.1,
    },
  });
