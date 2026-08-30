import { Tabs, Redirect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useOnboardingGateStore } from '@store/onboardingGateStore';
import { useMoodEntryStore } from '@store/moodEntryStore';
import { KawaiiTabBar } from '@components/KawaiiTabBar';
import { TabBarVisibilityProvider } from '@hooks/useScreenScroll';

// The paywall waits until the user has felt the product work. Onboarding hands
// off straight to the tabs; this gate raises the paywall once, after the third
// check-in. Contextual upsells (insights, history, mood-confirm, reports) still
// reach /paywall on demand before then.
const PAYWALL_AFTER_ENTRIES = 3;

export default function TabLayout() {
  const { t } = useTranslation('screens');
  const { complete, paywallSeen, _hasHydrated } = useOnboardingGateStore();
  const entryCount = useMoodEntryStore((s) => s.entries.length);
  const entriesHydrated = useMoodEntryStore((s) => s._hasHydrated);
  if (!_hasHydrated) return null;
  if (!complete) return <Redirect href="/(onboarding)/disclaimer" />;
  // Wait for entry hydration: pre-hydration the count is 0, so acting early
  // would only ever delay the paywall, never show it wrongly — but the guard
  // keeps that intentional rather than incidental.
  if (entriesHydrated && !paywallSeen && entryCount >= PAYWALL_AFTER_ENTRIES) {
    return <Redirect href="/paywall" />;
  }

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
