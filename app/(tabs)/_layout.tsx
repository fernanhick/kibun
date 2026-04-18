import { Tabs, Redirect } from 'expo-router';
import { useOnboardingGateStore } from '@store/onboardingGateStore';
import { useTourStore } from '@store/tourStore';
import { KawaiiTabBar } from '@components/KawaiiTabBar';
import { SpotlightTourProvider } from 'react-native-spotlight-tour';
import { KIBUN_TOUR_STEPS } from '@constants/tourSteps';

export default function TabLayout() {
  const { complete, paywallSeen, _hasHydrated } = useOnboardingGateStore();
  if (!_hasHydrated) return null;
  if (!complete) return <Redirect href="/(onboarding)/disclaimer" />;
  if (!paywallSeen) return <Redirect href="/paywall" />;

  return (
    <SpotlightTourProvider
      steps={KIBUN_TOUR_STEPS}
      overlayColor="rgba(26, 26, 46, 0.75)"
      overlayOpacity={1}
      nativeDriver={false}
      onBackdropPress="continue"
      onStop={() => useTourStore.getState().markTourSeen()}
    >
      <Tabs
        tabBar={(props) => <KawaiiTabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="index" options={{ title: 'Home' }} />
        <Tabs.Screen name="history" options={{ title: 'History' }} />
        <Tabs.Screen name="insights" options={{ title: 'Insights' }} />
        <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
      </Tabs>
    </SpotlightTourProvider>
  );
}
