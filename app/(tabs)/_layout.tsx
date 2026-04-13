import { Tabs, Redirect } from 'expo-router';
import { useOnboardingGateStore } from '@store/onboardingGateStore';
import { KawaiiTabBar } from '@components/KawaiiTabBar';

export default function TabLayout() {
  const { complete, paywallSeen, _hasHydrated } = useOnboardingGateStore();
  if (!_hasHydrated) return null;
  if (!complete) return <Redirect href="/(onboarding)/disclaimer" />;
  if (!paywallSeen) return <Redirect href="/paywall" />;

  return (
    <Tabs
      tabBar={(props) => <KawaiiTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="history" options={{ title: 'History' }} />
      <Tabs.Screen name="insights" options={{ title: 'Insights' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
