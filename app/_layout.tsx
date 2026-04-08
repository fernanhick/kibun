import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Stack, useRouter, type Href } from 'expo-router';
import { useFonts } from 'expo-font';
import {
  Fredoka_500Medium,
  Fredoka_600SemiBold,
  Fredoka_700Bold,
} from '@expo-google-fonts/fredoka';
import * as Notifications from 'expo-notifications';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useAuth } from '@hooks/useAuth';
import { SplashScreenView } from '@components/SplashScreenView';
import { initPurchases } from '@lib/revenuecat';
import { configureNotificationHandler, scheduleSlotNotifications } from '@lib/notifications';
import { useNotificationPrefsStore } from '@store/notificationPrefsStore';
import { useSessionStore } from '@store/sessionStore';
import { registerPushToken } from '@lib/pushTokens';
import { prewarmSentimentModel } from '@lib/sentiment';

// Keep the native splash screen visible until auth is resolved.
// Without this, the OS auto-dismisses the splash before React is ready,
// causing a blank screen flash on cold start.
SplashScreen.preventAutoHideAsync();

// Initialize RevenueCat SDK before React mounts so offerings are pre-fetched
// by the time the user reaches PaywallScreen.
// Wrapped in try-catch: a native module edge case cannot crash before ErrorBoundary mounts.
try {
  initPurchases();
} catch (error) {
  if (__DEV__) {
    console.error('[kibun:rc] initPurchases() failed at module init:', error);
  }
}

// Configure notification handler at module level so it's active before any
// notification arrives during app foregrounding — same pattern as SplashScreen
// and initPurchases above.
configureNotificationHandler();

// Pre-warm the on-device ONNX sentiment model so the first inference in
// MoodConfirmScreen is fast. Silently no-ops if model asset is not yet present.
prewarmSentimentModel();

// ─── Error Boundary ───────────────────────────────────────────────────────────
// Catches unhandled render errors in the navigation tree.
// Renders a safe fallback — user can restart without force-quitting.
// Sentry integration deferred to Phase 9.
interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // TODO Phase 9: Replace with Sentry.captureException(error, { extra: info })
    console.error('[kibun] Unhandled render error:', error, info);
  }

  handleRestart = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>{this.state.errorMessage}</Text>
          <TouchableOpacity style={styles.restartButton} onPress={this.handleRestart}>
            <Text style={styles.restartText}>Restart app</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

// ─── Root Layout ─────────────────────────────────────────────────────────────
export default function RootLayout() {
  const router = useRouter();
  const { isReady } = useAuth();
  const [fontsLoaded] = useFonts({
    Fredoka_500Medium,
    Fredoka_600SemiBold,
    Fredoka_700Bold,
  });
  const [splashDone, setSplashDone] = useState(false);

  // Refs for cold-start notification routing.
  // isReadyRef and splashDoneRef give the notification listener stable access
  // to readiness state without adding them as dependencies (avoids re-registering
  // the listener on every render tick during startup).
  const isReadyRef = useRef(false);
  const splashDoneRef = useRef(false);
  const pendingRouteRef = useRef<string | null>(null);

  // Keep refs in sync with state
  useEffect(() => { isReadyRef.current = isReady; }, [isReady]);
  useEffect(() => { splashDoneRef.current = splashDone; }, [splashDone]);

  // Consume buffered cold-start navigation once both auth and splash have resolved.
  useEffect(() => {
    if (isReady && splashDone && pendingRouteRef.current) {
      router.push(pendingRouteRef.current as Href);
      pendingRouteRef.current = null;
    }
  }, [isReady, splashDone, router]);

  // Reschedule notifications from persisted preferences on every app launch.
  // Must wait for AsyncStorage hydration before reading store state.
  useEffect(() => {
    const reschedule = async () => {
      const { permissionGranted, selectedSlots, streakNudgeEnabled } = useNotificationPrefsStore.getState();
      if (permissionGranted && (selectedSlots.length > 0 || streakNudgeEnabled)) {
        try {
          await scheduleSlotNotifications(selectedSlots, streakNudgeEnabled);
        } catch (error) {
          if (__DEV__) {
            console.error('[kibun:notif] Scheduling failed on launch:', error);
          }
        }
      }
    };

    if (useNotificationPrefsStore.persist.hasHydrated()) {
      reschedule();
    } else {
      const unsubscribe = useNotificationPrefsStore.persist.onFinishHydration(reschedule);
      return () => { unsubscribe(); };
    }
  }, []);

  // Register Expo push token for subscribed registered users.
  // Must run after isReady (auth resolved) so session data is available.
  // registerPushToken() is idempotent and non-throwing.
  useEffect(() => {
    if (!isReady) return;
    const { session } = useSessionStore.getState();
    if (
      session?.authStatus === 'registered' &&
      (session.subscriptionStatus === 'trial' || session.subscriptionStatus === 'active')
    ) {
      registerPushToken().catch(() => {});
    }
  }, [isReady]);

  // Route push notification taps to the appropriate screen.
  // Only ai_report type is currently handled — other types fall through silently.
  // On cold start (app killed → user taps push), the listener may fire before the
  // Stack is mounted. Buffer the route in pendingRouteRef; the consume effect above
  // will execute it once isReady && splashDone are both true.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      if (data?.type === 'ai_report') {
        if (!isReadyRef.current || !splashDoneRef.current) {
          // Cold-start: navigation tree not yet mounted — buffer for post-ready execution.
          pendingRouteRef.current = '/ai-report';
        } else {
          router.push('/ai-report' as Href);
        }
      }
    });
    return () => sub.remove();
  }, [router]);

  // Delay native splash hide until BOTH auth resolves AND animation has played once.
  // Without splashDone, hideAsync fires when isReady=true, React immediately re-renders
  // to Stack — the native splash fades revealing Stack, not SplashScreenView. The Shiba
  // animation would never be visible and Lottie integration could not be validated.
  useEffect(() => {
    if (isReady && splashDone && fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [isReady, splashDone, fontsLoaded]);

  // Show SplashScreenView until both conditions are met:
  // - isReady: auth resolved (prevents premature Stack render)
  // - splashDone: animation played once (ensures Shiba is visible to user)
  if (!isReady || !splashDone || !fontsLoaded) {
    return <SplashScreenView onFinish={() => setSplashDone(true)} />;
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <Stack initialRouteName="(tabs)">
          <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="paywall" options={{ headerShown: false }} />
          <Stack.Screen name="register" options={{ headerShown: false }} />
          <Stack.Screen name="check-in" options={{ headerShown: false, presentation: 'modal' }} />
          <Stack.Screen name="mood-confirm" options={{ headerShown: false }} />
          <Stack.Screen name="day-detail" options={{ headerShown: false }} />
          <Stack.Screen name="ai-report" options={{ headerShown: false }} />
          <Stack.Screen name="account" options={{ headerShown: false }} />
        </Stack>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1A1A2E',
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  restartButton: {
    backgroundColor: '#6C63FF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  restartText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
