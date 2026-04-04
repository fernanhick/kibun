import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@constants/theme';
import { useOnboardingGateStore } from '@store/onboardingGateStore';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface TabConfig {
  name: string;
  title: string;
  icon: IoniconName;
  iconFocused: IoniconName;
  accessibilityLabel: string;
}

const TABS: TabConfig[] = [
  {
    name: 'index',
    title: 'Home',
    icon: 'home-outline',
    iconFocused: 'home',
    accessibilityLabel: 'Home tab',
  },
  {
    name: 'history',
    title: 'History',
    icon: 'time-outline',
    iconFocused: 'time',
    accessibilityLabel: 'History tab',
  },
  {
    name: 'insights',
    title: 'Insights',
    icon: 'bar-chart-outline',
    iconFocused: 'bar-chart',
    accessibilityLabel: 'Insights tab',
  },
  {
    name: 'settings',
    title: 'Settings',
    icon: 'settings-outline',
    iconFocused: 'settings',
    accessibilityLabel: 'Settings tab',
  },
];

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
          backgroundColor: colors.background,
          borderTopColor: colors.border,
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
              <Ionicons
                name={focused ? tab.iconFocused : tab.icon}
                size={size}
                color={color}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
