import { Tabs, Redirect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useOnboardingGateStore } from '@store/onboardingGateStore';
import { KawaiiTabBar } from '@components/KawaiiTabBar';
import { TabBarVisibilityProvider } from '@hooks/useScreenScroll';

export default function TabLayout() {
  const { t } = useTranslation('screens');
  const { complete, paywallSeen, _hasHydrated } = useOnboardingGateStore();
  if (!_hasHydrated) return null;
  if (!complete) return <Redirect href="/(onboarding)/disclaimer" />;
  if (!paywallSeen) return <Redirect href="/paywall" />;

  return (
    <TabBarVisibilityProvider>
      <Tabs
        tabBar={(props) => <KawaiiTabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="index" options={{ title: t('tabs.home') }} />
        <Tabs.Screen name="history" options={{ title: t('tabs.history') }} />
        <Tabs.Screen name="insights" options={{ title: t('tabs.insights') }} />
        <Tabs.Screen name="settings" options={{ title: t('tabs.settings') }} />
      </Tabs>
    </TabBarVisibilityProvider>
  );
}
