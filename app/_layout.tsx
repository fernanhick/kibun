import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useAuth } from '@hooks/useAuth';
import { SplashScreenView } from '@components/SplashScreenView';
import { initPurchases } from '@lib/revenuecat';

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
  const { isReady } = useAuth();
  const [splashDone, setSplashDone] = useState(false);

  // Delay native splash hide until BOTH auth resolves AND animation has played once.
  // Without splashDone, hideAsync fires when isReady=true, React immediately re-renders
  // to Stack — the native splash fades revealing Stack, not SplashScreenView. The Shiba
  // animation would never be visible and Lottie integration could not be validated.
  useEffect(() => {
    if (isReady && splashDone) {
      SplashScreen.hideAsync();
    }
  }, [isReady, splashDone]);

  // Show SplashScreenView until both conditions are met:
  // - isReady: auth resolved (prevents premature Stack render)
  // - splashDone: animation played once (ensures Shiba is visible to user)
  if (!isReady || !splashDone) {
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
