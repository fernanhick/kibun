import { useRef, useEffect } from 'react';
import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Animated, View, StyleSheet } from 'react-native';
import { colors, shadows, typography } from '@constants/theme';
import { useOnboardingGateStore } from '@store/onboardingGateStore';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface TabConfig {
  name: string;
  title: string;
  icon: IoniconName;
  iconFocused: IoniconName;
  accent: string;
  accessibilityLabel: string;
}

const TABS: TabConfig[] = [
  {
    name: 'index',
    title: 'Home',
    icon: 'home-outline',
    iconFocused: 'home',
    accent: '#89AFFF',
    accessibilityLabel: 'Home tab',
  },
  {
    name: 'history',
    title: 'History',
    icon: 'calendar-outline',
    iconFocused: 'calendar',
    accent: '#FFA62B',
    accessibilityLabel: 'History tab',
  },
  {
    name: 'insights',
    title: 'Insights',
    icon: 'sparkles-outline',
    iconFocused: 'sparkles',
    accent: '#7AC8FF',
    accessibilityLabel: 'Insights tab',
  },
  {
    name: 'settings',
    title: 'Settings',
    icon: 'color-palette-outline',
    iconFocused: 'color-palette',
    accent: '#A7A0FF',
    accessibilityLabel: 'Settings tab',
  },
];

function AnimatedTabIcon({
  tab,
  focused,
  color,
  size,
}: {
  tab: TabConfig;
  focused: boolean;
  color: string;
  size: number;
}) {
  const bounceAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (focused) {
      Animated.sequence([
        Animated.spring(bounceAnim, {
          toValue: 1.28,
          useNativeDriver: true,
          speed: 60,
          bounciness: 14,
        }),
        Animated.spring(bounceAnim, {
          toValue: 1,
          useNativeDriver: true,
          speed: 40,
          bounciness: 8,
        }),
      ]).start();
    }
  }, [focused]);

  return (
    <Animated.View style={{ transform: [{ scale: bounceAnim }] }}>
      <View
        style={[
          styles.iconBubble,
          focused ? { backgroundColor: tab.accent } : styles.iconBubbleIdle,
        ]}
      >
        <Ionicons
          name={focused ? tab.iconFocused : tab.icon}
          size={focused ? size + 1 : size}
          color={focused ? colors.textInverse : color}
        />
      </View>
    </Animated.View>
  );
}

export default function TabLayout() {
  // Three-layer gate — renders null while AsyncStorage hydrates to prevent flash-redirect
  // for returning users. Once hydrated:
  //   1. Onboarding incomplete → redirect to first-mood
  //   2. Paywall not yet seen → redirect to paywall (shown once after onboarding)
  //   3. All clear → render Tabs
  const { complete, paywallSeen, _hasHydrated } = useOnboardingGateStore();
  if (!_hasHydrated) return null;
  if (!complete) return <Redirect href="/(onboarding)/first-mood" />;
  if (!paywallSeen) return <Redirect href="/paywall" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          position: 'absolute',
          left: 14,
          right: 14,
          bottom: 12,
          height: 64,
          paddingTop: 8,
          backgroundColor: colors.surfaceElevated,
          borderTopWidth: 0,
          borderRadius: 22,
          ...shadows.md,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: typography.fonts.ui,
        },
        headerShown: false,
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarAccessibilityLabel: tab.accessibilityLabel,
            tabBarIcon: ({ focused, color, size }) => (
              <AnimatedTabIcon tab={tab} focused={focused} color={color} size={size} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  iconBubbleIdle: {
    backgroundColor: 'rgba(74, 134, 255, 0.08)',
  },
});
