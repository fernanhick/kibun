import { useRef, useEffect } from 'react';
import { View, Pressable, Text, Animated, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import Svg, { Path } from 'react-native-svg';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors, typography, shadows } from '@constants/theme';
import { getMascotSource } from '@constants/mascotAnimations';
import { useMoodEntryStore } from '@store/index';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

// ─── Constants ────────────────────────────────────────────────────────────────

const TAB_BAR_HEIGHT = 72;
const NOTCH_RADIUS = 52;
const NOTCH_WIDTH = NOTCH_RADIUS * 2 + 28; // total width of the curved cutout
const MASCOT_SIZE = 110;
const CURVE_DEPTH = 14;

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
  }, [focused]);

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
          color={focused ? '#fff' : colors.textSecondary}
        />
      </Animated.View>
      <Text style={[styles.tabLabel, focused && { color: icons.accent }]}>{label}</Text>
    </Pressable>
  );
}

// ─── Curved background SVG ───────────────────────────────────────────────────

function CurvedBackground({ width }: { width: number }) {
  const mid = width / 2;
  const halfNotch = NOTCH_WIDTH / 2;
  const h = TAB_BAR_HEIGHT;

  // Path: straight left → curve down into notch → arc at bottom → curve back up → straight right → down → close
  const d = [
    `M 0 ${CURVE_DEPTH}`,
    // Left side — straight to notch start
    `L ${mid - halfNotch} ${CURVE_DEPTH}`,
    // Curve down into the notch
    `C ${mid - halfNotch + 16} ${CURVE_DEPTH}, ${mid - NOTCH_RADIUS} ${NOTCH_RADIUS + CURVE_DEPTH}, ${mid} ${NOTCH_RADIUS + CURVE_DEPTH}`,
    // Curve back up out of the notch
    `C ${mid + NOTCH_RADIUS} ${NOTCH_RADIUS + CURVE_DEPTH}, ${mid + halfNotch - 16} ${CURVE_DEPTH}, ${mid + halfNotch} ${CURVE_DEPTH}`,
    // Right side — straight to end
    `L ${width} ${CURVE_DEPTH}`,
    // Bottom right
    `L ${width} ${h}`,
    // Bottom left
    `L 0 ${h}`,
    'Z',
  ].join(' ');

  return (
    <Svg width={width} height={h + CURVE_DEPTH} style={styles.svgBg}>
      <Path d={d} fill="#FFFFFF" opacity={0.97} />
      <Path d={d} fill="none" stroke="#DCE9FF" strokeWidth={1.2} />
    </Svg>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function KawaiiTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const lastMoodId = useMoodEntryStore((s) => s.entries[0]?.moodId);

  const routes = state.routes;
  const leftTabs = routes.slice(0, 2);
  const rightTabs = routes.slice(2, 4);
  // On Android the system nav bar is hidden (sticky immersive) so insets.bottom
  // fluctuates when the user swipes to reveal it. Use a fixed value to prevent
  // the tab bar from jumping. On iOS use the real safe-area inset.
  const safeBottom = Platform.OS === 'android' ? 8 : Math.max(insets.bottom, 8);

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
      <CurvedBackground width={width} />

      <View style={styles.tabRow}>
        <View style={styles.tabGroup}>
          {leftTabs.map((r, i) => renderTab(r, i))}
        </View>

        {/* Center mascot button */}
        <Pressable
          onPress={() => router.push('/check-in' as Href)}
          accessibilityLabel="Log mood"
          accessibilityRole="button"
          style={({ pressed }) => [styles.mascotButton, pressed && styles.mascotPressed]}
        >
          <Image
            source={getMascotSource(lastMoodId)}
            style={styles.mascotImage}
            contentFit="contain"
            autoplay
          />
        </Pressable>

        <View style={styles.tabGroup}>
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
  svgBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: TAB_BAR_HEIGHT,
    marginTop: CURVE_DEPTH,
    paddingHorizontal: 8,
  },
  tabGroup: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minWidth: 64,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(74, 134, 255, 0.06)',
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
    marginTop: -(NOTCH_RADIUS + CURVE_DEPTH - 8),
  },
  mascotPressed: {
    transform: [{ scale: 0.95 }],
  },
  mascotImage: {
    width: MASCOT_SIZE,
    height: MASCOT_SIZE,
  },
});
