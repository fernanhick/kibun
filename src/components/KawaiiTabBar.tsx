import { useRef, useEffect, useMemo } from 'react';
import { View, Pressable, Text, Animated, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors, typography } from '@constants/theme';
import {
  KAWAII_TAB_BAR_HEIGHT,
  KAWAII_TAB_SAFE_BOTTOM_ANDROID,
  KAWAII_TAB_SAFE_BOTTOM_MIN,
  getKawaiiTabScale,
} from '@constants/layout';
import { SCREEN_MAX_WIDTH } from '@constants/breakpoints';
import { getMascotSource } from '@constants/mascotAnimations';
import { useResponsive } from '@hooks/useResponsive';
import { useMoodEntryStore } from '@store/index';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

// ─── Constants ────────────────────────────────────────────────────────────────

// Phone-correct base geometry. Tablet sizing is achieved via getKawaiiTabScale
// applied in the component — do NOT bump these to "make tablets bigger" or
// the phone layout will overflow (icons clip at the screen edge).
const BASE_MASCOT_SIZE = 140;
const BASE_ICON_SIZE = 26;
const BASE_ICON_WRAP = 52;
const BASE_ICON_RADIUS = 16;
// Tight to BASE_ICON_WRAP so two buttons actually fit inside each side on a
// phone: 4 × 56 + 140 mascot = 364 ≤ 393 − 2 × 8 padding. Going wider causes
// space-evenly to overflow and silently fall back to flex-start, which packs
// the right pair against the screen edge.
const BASE_TAB_BUTTON = 56;
const BASE_LABEL_FONT = 11;
const BASE_MASCOT_TRANSLATE_Y = -10;

const TAB_ICONS: Record<string, { outline: IoniconName; filled: IoniconName; accent: string }> = {
  index:    { outline: 'home-outline',           filled: 'home',           accent: '#89AFFF' },
  history:  { outline: 'calendar-outline',       filled: 'calendar',       accent: '#FFA62B' },
  insights: { outline: 'sparkles-outline',       filled: 'sparkles',       accent: '#7AC8FF' },
  settings: { outline: 'color-palette-outline',  filled: 'color-palette',  accent: '#A7A0FF' },
};

// ─── Animated Tab Icon ────────────────────────────────────────────────────────

interface TabMetrics {
  iconSize: number;
  iconWrap: number;
  iconRadius: number;
  buttonWidth: number;
  labelFont: number;
}

function TabIcon({
  routeName,
  label,
  focused,
  onPress,
  metrics,
}: {
  routeName: string;
  label: string;
  focused: boolean;
  onPress: () => void;
  metrics: TabMetrics;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const icons = TAB_ICONS[routeName];

  useEffect(() => {
    if (focused) {
      Animated.sequence([
        Animated.spring(scale, { toValue: 1.25, useNativeDriver: true, speed: 70, bounciness: 16 }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 45, bounciness: 10 }),
      ]).start();
    }
  }, [focused, scale]);

  if (!icons) return null;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      style={[styles.tabButton, { width: metrics.buttonWidth }]}
    >
      <Animated.View
        style={[
          styles.iconWrap,
          { width: metrics.iconWrap, height: metrics.iconWrap, borderRadius: metrics.iconRadius },
          focused && { backgroundColor: icons.accent },
          { transform: [{ scale }] },
        ]}
      >
        <Ionicons
          name={focused ? icons.filled : icons.outline}
          size={metrics.iconSize}
          color={focused ? '#fff' : '#fff'}
        />
      </Animated.View>
      <Text style={[styles.tabLabel, { fontSize: metrics.labelFont }, focused && { color: icons.accent }]}>
        {label}
      </Text>
    </Pressable>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function KawaiiTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useResponsive();
  const lastMoodId = useMoodEntryStore((s) => s.entries[0]?.moodId);

  const { tabBarHeight, mascotSize, metrics } = useMemo(() => {
    const scale = getKawaiiTabScale(width);
    return {
      tabBarHeight: KAWAII_TAB_BAR_HEIGHT * scale,
      mascotSize: BASE_MASCOT_SIZE * scale,
      metrics: {
        iconSize: BASE_ICON_SIZE * scale,
        iconWrap: BASE_ICON_WRAP * scale,
        iconRadius: BASE_ICON_RADIUS * scale,
        buttonWidth: BASE_TAB_BUTTON * scale,
        labelFont: BASE_LABEL_FONT * scale,
      },
    };
  }, [width]);

  const routes = state.routes;
  const leftTabs = routes.slice(0, 2);
  const rightTabs = routes.slice(2, 4);
  // On Android the system nav bar is hidden (sticky immersive) so insets.bottom
  // fluctuates when the user swipes to reveal it. Use a fixed value to prevent
  // the tab bar from jumping. On iOS use the real safe-area inset.
  const safeBottom =
    Platform.OS === 'android'
      ? KAWAII_TAB_SAFE_BOTTOM_ANDROID
      : Math.max(insets.bottom, KAWAII_TAB_SAFE_BOTTOM_MIN);

  const renderTab = (route: typeof routes[0], index: number) => {
    const { options } = descriptors[route.key];
    const focused = state.index === index;
    const label = (options.tabBarLabel as string) ?? options.title ?? route.name;

    const icon = (
      <TabIcon
        key={route.key}
        routeName={route.name}
        label={label}
        focused={focused}
        metrics={metrics}
        onPress={() => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!event.defaultPrevented && !focused) {
            navigation.navigate(route.name);
          }
        }}
      />
    );

    return icon;
  };

  // On wide screens (tablets, landscape) clamp the tab row so icons stay
  // thumb-reachable and the mascot/notch geometry remains valid. Below the
  // clamp width this is a no-op.
  return (
    <View style={[styles.container, { paddingBottom: safeBottom }]} pointerEvents="box-none">
      <View style={styles.tabRowClamp}>
        <View style={[styles.tabRow, { height: tabBarHeight }]}>
          <View style={styles.tabSide}>
            {leftTabs.map((r, i) => renderTab(r, i))}
          </View>

          <View style={[styles.centerSlot, { width: mascotSize }]}>
            <Pressable
              onPress={() => router.push('/check-in' as Href)}
              accessibilityLabel="Log mood"
              accessibilityRole="button"
              style={{ width: mascotSize, height: mascotSize, alignItems: 'center', justifyContent: 'center' }}
            >
              <Image
                source={getMascotSource(lastMoodId)}
                style={{ width: mascotSize, height: mascotSize, transform: [{ translateY: BASE_MASCOT_TRANSLATE_Y }] }}
                contentFit="contain"
                autoplay
              />
            </Pressable>
          </View>

          <View style={styles.tabSide}>
            {rightTabs.map((r, i) => renderTab(r, i + 2))}
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  tabRowClamp: {
    width: '100%',
    maxWidth: SCREEN_MAX_WIDTH.tablet,
    alignSelf: 'center',
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  tabSide: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  centerSlot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 218, 218, 1)',
  },
  tabLabel: {
    fontFamily: typography.fonts.ui,
    color: colors.textSecondary,
  },
});
