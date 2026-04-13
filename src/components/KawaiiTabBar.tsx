import { useRef, useEffect } from 'react';
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
} from '@constants/layout';
import { getMascotSource } from '@constants/mascotAnimations';
import { useMoodEntryStore } from '@store/index';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

// ─── Constants ────────────────────────────────────────────────────────────────

const TAB_BAR_HEIGHT = KAWAII_TAB_BAR_HEIGHT;
const MASCOT_SIZE = 140;

const TAB_ICONS: Record<string, { outline: IoniconName; filled: IoniconName; accent: string }> = {
  index:    { outline: 'home-outline',           filled: 'home',           accent: '#89AFFF' },
  history:  { outline: 'calendar-outline',       filled: 'calendar',       accent: '#FFA62B' },
  insights: { outline: 'sparkles-outline',       filled: 'sparkles',       accent: '#7AC8FF' },
  settings: { outline: 'color-palette-outline',  filled: 'color-palette',  accent: '#A7A0FF' },
};

// ─── Animated Tab Icon ────────────────────────────────────────────────────────

function TabIcon({
  routeName,
  label,
  focused,
  onPress,
}: {
  routeName: string;
  label: string;
  focused: boolean;
  onPress: () => void;
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
      style={styles.tabButton}
    >
      <Animated.View style={[styles.iconWrap, focused && { backgroundColor: icons.accent }, { transform: [{ scale }] }]}>
        <Ionicons
          name={focused ? icons.filled : icons.outline}
          size={26}
          color={focused ? '#fff' : '#fff'}
        />
      </Animated.View>
      <Text style={[styles.tabLabel, focused && { color: icons.accent }]}>{label}</Text>
    </Pressable>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function KawaiiTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const lastMoodId = useMoodEntryStore((s) => s.entries[0]?.moodId);

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

    return (
      <TabIcon
        key={route.key}
        routeName={route.name}
        label={label}
        focused={focused}
        onPress={() => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!event.defaultPrevented && !focused) {
            navigation.navigate(route.name);
          }
        }}
      />
    );
  };

  return (
    <View style={[styles.container, { paddingBottom: safeBottom }]} pointerEvents="box-none">
      <View style={styles.tabRow}>
        <View style={styles.tabSide}>
          {leftTabs.map((r, i) => renderTab(r, i))}
        </View>

        <View style={styles.centerSlot}>
          <Pressable
            onPress={() => router.push('/check-in' as Href)}
            accessibilityLabel="Log mood"
            accessibilityRole="button"
            style={styles.mascotButton}
          >
            <Image
              source={getMascotSource(lastMoodId)}
              style={styles.mascotImage}
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
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: TAB_BAR_HEIGHT,
    paddingHorizontal: 30,
  },
  tabSide: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  centerSlot: {
    width: MASCOT_SIZE ,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButton: {
    width: 64,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 218, 218, 1)',
  },
  tabLabel: {
    fontSize: 11,
    fontFamily: typography.fonts.ui,
    color: colors.textSecondary,
  },
  mascotButton: {
    width: MASCOT_SIZE,
    height: MASCOT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateY: -10 }],
  },
  mascotImage: {
    width: MASCOT_SIZE,
    height: MASCOT_SIZE,
  },
});
