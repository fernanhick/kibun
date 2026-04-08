import { useRef, useEffect } from 'react';
import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Animated, View, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
          toValue: 1.35,
          useNativeDriver: true,
          speed: 70,
          bounciness: 16,
        }),
        Animated.spring(bounceAnim, {
          toValue: 1,
          useNativeDriver: true,
          speed: 45,
          bounciness: 10,
        }),
      ]).start();
    }
  }, [focused]);

  return (
    <Animated.View 
      style={{ 
        transform: [{ scale: bounceAnim }],
        width: '100%',
        alignItems: 'center',
      }}
    >
      <View
        style={[
          styles.iconBubble,
          focused ? { backgroundColor: tab.accent } : styles.iconBubbleIdle,
        ]}
      >
        <Ionicons
          name={focused ? tab.iconFocused : tab.icon}
          size={focused ? size + 3 : size}
          color={focused ? colors.textInverse : color}
        />
      </View>
    </Animated.View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  // Three-layer gate — renders null while AsyncStorage hydrates to prevent flash-redirect
  // for returning users. Once hydrated:
  //   1. Onboarding incomplete → redirect to medical disclaimer
  //   2. Paywall not yet seen → redirect to paywall (shown once after onboarding)
  //   3. All clear → render Tabs
  const { complete, paywallSeen, _hasHydrated } = useOnboardingGateStore();
  if (!_hasHydrated) return null;
  if (!complete) return <Redirect href="/(onboarding)/disclaimer" />;
  if (!paywallSeen) return <Redirect href="/paywall" />;

  // Safe area bottom for 3-button navigation (Android) — minimum 12pt above nav buttons
  const safeBottom = Math.max(insets.bottom, 12);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          position: 'absolute',
          left: 12,
          right: 12,
          bottom: safeBottom + 12,
          height: 72,
          paddingVertical: 8,
          paddingHorizontal: 8,
          backgroundColor: colors.surfaceElevated,
          borderTopWidth: 0,
          borderRadius: 24,
          ...shadows.lg,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: typography.fonts.ui,
          fontWeight: '600',
          marginTop: 4,
        },
        headerShown: false,
        tabBarItemStyle: {
          paddingVertical: 6,
          paddingHorizontal: 4,
        },
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
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    borderColor: 'rgba(255,255,255,0.4)',
    shadowColor: 'rgba(0,0,0,0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  iconBubbleIdle: {
    backgroundColor: 'rgba(74, 134, 255, 0.06)',
  },
});
