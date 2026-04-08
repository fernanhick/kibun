import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

/**
 * Auth Callback Handler
 *
 * This route silently receives the OAuth redirect (kibun://auth/callback)
 * after the user completes login in the browser. The actual session exchange
 * happens in register.tsx via exchangeCodeForSession(). We just need this
 * route to exist so the deep link doesn't trigger "Unmatched Route" error.
 */
export default function AuthCallbackScreen() {
  const router = useRouter();

  useEffect(() => {
    // Immediately dismiss this screen — the OAuth flow is already handled
    // by WebBrowser.openAuthSessionAsync() result in register.tsx
    router.back();
  }, [router]);

  return <View style={{ flex: 1 }} />;
}
