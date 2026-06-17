import { useRef, useEffect, useMemo, useState } from 'react';
import { View, Pressable, Text, Animated, StyleSheet, Platform } from 'react-native';
import Reanimated, { useAnimatedStyle } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { haptics } from '@lib/haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { typography, spacing } from '@constants/theme';
import { useTheme, type ThemePalette } from '@theme/ThemeContext';
import { useThemedStyles } from '@hooks/useThemedStyles';
import {
  KAWAII_TAB_BAR_HEIGHT,
  KAWAII_TAB_SAFE_BOTTOM_ANDROID,
  KAWAII_TAB_SAFE_BOTTOM_MIN,
  getKawaiiTabScale,
} from '@constants/layout';
import { SCREEN_MAX_WIDTH } from '@constants/breakpoints';
import { getMascotSource, getMascotVariant, MASCOT_VARIANTS, type MascotVariant } from '@constants/mascotAnimations';
import { useResponsive } from '@hooks/useResponsive';
import { useReducedMotion } from '@hooks/useReducedMotion';
import { useTabBarVisibility } from '@hooks/useScreenScroll';
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
  index:    { outline: 'home-outline',           filled: 'home',           accent: '#6E9C8C' },
  history:  { outline: 'calendar-outline',       filled: 'calendar',       accent: '#C56B86' },
  insights: { outline: 'sparkles-outline',       filled: 'sparkles',       accent: '#7FA9A0' },
  settings: { outline: 'color-palette-outline',  filled: 'color-palette',  accent: '#9E8FB0' },
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
  const reducedMotion = useReducedMotion();
  const styles = useThemedStyles(createStyles);
  const icons = TAB_ICONS[routeName];

  useEffect(() => {
    if (focused && !reducedMotion) {
      Animated.sequence([
        Animated.spring(scale, { toValue: 1.1, useNativeDriver: true, speed: 50, bounciness: 6 }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 3 }),
      ]).start();
    }
  }, [focused, scale, reducedMotion]);

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
      <Text
        style={[styles.tabLabel, { fontSize: metrics.labelFont }, focused && { color: icons.accent }]}
        maxFontSizeMultiplier={1.2}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function KawaiiTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { t } = useTranslation('screens');
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { width } = useResponsive();
  const lastMoodId = useMoodEntryStore((s) => s.entries[0]?.moodId);
  const visibility = useTabBarVisibility();

  // Tapping the center mascot cycles it through its animation variants — a
  // playful idle interaction (logging now lives inline on the home hero, so
  // this no longer navigates). A new mood log resets it to that mood's mascot.
  const reducedMotion = useReducedMotion();
  const [variantOverride, setVariantOverride] = useState<MascotVariant | null>(null);
  useEffect(() => {
    setVariantOverride(null);
  }, [lastMoodId]);

  const pop = useRef(new Animated.Value(1)).current;
  const handleMascotPress = () => {
    haptics.light();
    const current = variantOverride ?? getMascotVariant(lastMoodId);
    const nextIndex = (MASCOT_VARIANTS.indexOf(current) + 1) % MASCOT_VARIANTS.length;
    setVariantOverride(MASCOT_VARIANTS[nextIndex]);

    if (!reducedMotion) {
      Animated.sequence([
        Animated.spring(pop, { toValue: 1.12, useNativeDriver: true, speed: 50, bounciness: 8 }),
        Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 4 }),
      ]).start();
    }
  };
  const mascotSource = getMascotSource(variantOverride ?? lastMoodId);

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
  //
  // The Liquid Glass shelf sits behind the tabs and extends through the safe
  // area to the screen edge. Rounded top corners + frosted blur + tonal
  // overlay. On iOS BlurView renders true native blur; on Android the strong
  // overlay carries the look until `expo prebuild --clean` lands the native
  // module (after which the blur ramps in for free).
  const glassHeight = tabBarHeight + safeBottom + 8;
  // Slide the entire shelf + mascot off-screen on scroll-down. mascotSize covers
  // the chunk that pokes above the bar; the +16 buffer prevents the rounded
  // corners from briefly clipping into view during the spring overshoot.
  const hiddenOffset = glassHeight + mascotSize + 16;
  const hideStyle = useAnimatedStyle(() => {
    const h = visibility?.hidden.value ?? 0;
    return {
      transform: [{ translateY: h * hiddenOffset }],
      opacity: 1 - h * 0.35,
    };
  });
  const overlayBg = isDark
    ? (Platform.OS === 'ios' ? 'rgba(22,20,15,0.55)' : 'rgba(22,20,15,0.88)')
    : (Platform.OS === 'ios' ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.85)');
  return (
    <Reanimated.View style={[styles.container, hideStyle]} pointerEvents="box-none">
      <View
        pointerEvents="none"
        style={[styles.glassShelf, { height: glassHeight }]}
      >
        <BlurView
          intensity={Platform.OS === 'ios' ? 50 : 36}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: overlayBg }]} />
        <View style={styles.glassHairline} />
      </View>
      <View style={[styles.tabRowClamp, { paddingBottom: safeBottom }]}>
        <View style={[styles.tabRow, { height: tabBarHeight }]}>
          <View style={styles.tabSide}>
            {leftTabs.map((r, i) => renderTab(r, i))}
          </View>

          <View style={[styles.centerSlot, { width: mascotSize }]}>
            <Pressable
              onPress={handleMascotPress}
              accessibilityLabel={t('tabs.mascotA11y')}
              accessibilityRole="button"
              style={{ width: mascotSize, height: mascotSize, alignItems: 'center', justifyContent: 'center' }}
            >
              <Animated.View
                style={{ transform: [{ translateY: BASE_MASCOT_TRANSLATE_Y }, { scale: pop }] }}
              >
                <Image
                  source={mascotSource}
                  style={{ width: mascotSize, height: mascotSize }}
                  contentFit="contain"
                  autoplay
                />
              </Animated.View>
            </Pressable>
          </View>

          <View style={styles.tabSide}>
            {rightTabs.map((r, i) => renderTab(r, i + 2))}
          </View>
        </View>
      </View>
    </Reanimated.View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const createStyles = (colors: ThemePalette) => StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  glassShelf: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  glassHairline: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
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
    paddingHorizontal: spacing.sm,
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
    gap: spacing.xs,
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
