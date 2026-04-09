import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen, Button } from '@components/index';
import { supabase } from '@lib/supabase';
import { useOnboardingGateStore } from '@store/onboardingGateStore';
import { useSessionStore } from '@store/sessionStore';
import { colors, typography, spacing, radius } from '@constants/theme';

// Required by expo-web-browser to complete any pending auth sessions on mount.
WebBrowser.maybeCompleteAuthSession();

export default function RegistrationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string | string[]; source?: string | string[] }>();
  const modeParam = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  const sourceParam = Array.isArray(params.source) ? params.source[0] : params.source;
  const fromOnboarding = sourceParam === 'onboarding';
  const session = useSessionStore((s) => s.session);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'register' | 'login'>(modeParam === 'login' ? 'login' : 'register');

  const completeOnboardingForReturningUser = () => {
    if (!fromOnboarding) return;
    useOnboardingGateStore.setState({ complete: true, paywallSeen: true });
  };

  useEffect(() => {
    if (session?.authStatus === 'registered' && !fromOnboarding) {
      router.replace('/(tabs)');
    }
  }, [fromOnboarding, router, session?.authStatus]);

  // Email/password: register (updateUser to upgrade anonymous) or login (signInWithPassword).
  const handleEmail = async () => {
    if (!supabase) {
      setError('Configuration error: Supabase is not set for this build.');
      return;
    }
    if (!email.trim() || !password.trim() || submitting) return;
    setSubmitting(true);
    setError(null);

    if (mode === 'register') {
      const { error: authError } = await supabase.auth.updateUser({
        email: email.trim(),
        password: password.trim(),
      });
      if (authError) {
        setError(authError.message);
        setSubmitting(false);
        return;
      }
    } else {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });
      if (authError) {
        setError(authError.message);
        setSubmitting(false);
        return;
      }
    }

    completeOnboardingForReturningUser();
    router.replace('/(tabs)');
  };

  // Shared OAuth handler for Google/Apple.
  // Uses signInWithOAuth for both login and signup — Supabase auto-creates users on first OAuth login.
  // Does NOT use linkIdentity (unreliable with PKCE + skipBrowserRedirect on mobile).
  const handleOAuth = async (provider: 'google' | 'apple') => {
    if (!supabase) {
      setError('Configuration error: Supabase is not set for this build.');
      return;
    }
    setError(null);

    const redirectUrl = Linking.createURL('auth/callback');
    if (__DEV__) console.log('[kibun:oauth] redirectUrl:', redirectUrl);

    const { data, error: authError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
      },
    });

    if (authError || !data?.url) {
      setError(authError?.message ?? `${provider} sign in unavailable`);
      return;
    }

    try {
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
      if (__DEV__) console.log('[kibun:oauth] browser result:', JSON.stringify(result));

      if (result.type !== 'success' || !result.url) return;

      // Parse the callback URL for tokens or code
      const url = result.url;

      // Try PKCE code from query params
      const codeMatch = url.match(/[?&]code=([^&#]+)/);
      if (codeMatch) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(codeMatch[1]);
        if (exchangeError) {
          if (__DEV__) console.error('[kibun:oauth] code exchange failed:', exchangeError);
          setError(exchangeError.message);
          return;
        }
        completeOnboardingForReturningUser();
        router.replace('/(tabs)');
        return;
      }

      // Try implicit flow tokens from hash fragment
      const hashParams = url.includes('#') ? new URLSearchParams(url.split('#')[1]) : null;
      const accessToken = hashParams?.get('access_token');
      const refreshToken = hashParams?.get('refresh_token');

      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionError) {
          if (__DEV__) console.error('[kibun:oauth] setSession failed:', sessionError);
          setError(sessionError.message);
          return;
        }
        completeOnboardingForReturningUser();
        router.replace('/(tabs)');
        return;
      }

      // If neither worked, try refreshing the session — the OAuth might have completed server-side
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session && !sessionData.session.user.is_anonymous) {
        completeOnboardingForReturningUser();
        router.replace('/(tabs)');
        return;
      }

      if (__DEV__) console.warn('[kibun:oauth] No tokens in redirect URL:', url);
      setError('Sign in could not be completed. Please try again.');
    } catch (e) {
      if (__DEV__) console.error('[kibun:oauth] exception:', e);
      setError(`${provider === 'google' ? 'Google' : 'Apple'} sign in failed. Please try again.`);
    }
  };

  const handleSkip = () => {
    router.replace('/(tabs)');
  };

  return (
    <Screen scrollable={true} contentContainerStyle={styles.content}>
      <LinearGradient
        colors={[colors.skyStart, colors.skyEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <Text style={styles.title}>
          {mode === 'register' ? 'Create your account' : 'Welcome back!'}
        </Text>
        <Text style={styles.subtitle}>
          {mode === 'register'
            ? 'Link your data to an account so you never lose it'
            : 'Sign in to pick up where you left off'}
        </Text>
        {fromOnboarding && (
          <Text style={styles.infoNote}>
            You can skip onboarding now. Completing those questions later helps us personalize insights.
          </Text>
        )}
      </LinearGradient>

      <View style={styles.sectionCard}>
        {/* Social auth buttons */}
        <View style={styles.socialGroup}>
          <Pressable
            style={({ pressed }) => [styles.appleButton, pressed && styles.pressed]}
            onPress={() => handleOAuth('apple')}
            accessibilityRole="button"
            accessibilityLabel="Continue with Apple"
          >
            <Text style={styles.appleButtonText}>Continue with Apple</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.googleButton, pressed && styles.pressed]}
            onPress={() => handleOAuth('google')}
            accessibilityRole="button"
            accessibilityLabel="Continue with Google"
          >
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </Pressable>
        </View>

        {/* Divider */}
        <View style={styles.divider} accessibilityRole="none">
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Email / password form */}
        <View style={styles.form}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={(text) => { setEmail(text); setError(null); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              accessibilityLabel="Email address"
              placeholder="you@example.com"
              placeholderTextColor={colors.textDisabled}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={(text) => { setPassword(text); setError(null); }}
              secureTextEntry={true}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              accessibilityLabel="Password"
              placeholder={mode === 'register' ? 'Min. 8 characters' : 'Your password'}
              placeholderTextColor={colors.textDisabled}
            />
          </View>

          <Button
            label={mode === 'register' ? 'Create account' : 'Sign in'}
            onPress={handleEmail}
            variant="sunrise"
            disabled={!email.trim() || !password.trim()}
            loading={submitting}
            fullWidth
          />
        </View>

        {/* Toggle login/register */}
        <Pressable
          onPress={() => { setMode(mode === 'register' ? 'login' : 'register'); setError(null); }}
          style={styles.toggleRow}
        >
          <Text style={styles.toggleText}>
            {mode === 'register'
              ? 'Already have an account? '
              : "Don't have an account? "}
          </Text>
          <Text style={styles.toggleLink}>
            {mode === 'register' ? 'Sign in' : 'Create one'}
          </Text>
        </Pressable>
      </View>

      {/* Inline error display */}
      {error !== null && (
        <Text style={styles.errorText} accessibilityRole="alert">
          {error}
        </Text>
      )}

      {/* Skip */}
      <View style={styles.skipRow}>
        <Button
          label="Skip for now"
          onPress={handleSkip}
          variant="ghost"
          fullWidth
          accessibilityHint="Continue without creating an account"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  heroCard: {
    borderRadius: 28,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 22,
    padding: spacing.md,
    gap: spacing.md,
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
  },
  subtitle: {
    fontSize: typography.sizes.md,
    color: colors.sparkle,
    lineHeight: typography.sizes.md * typography.lineHeights.relaxed,
    marginTop: -spacing.sm,
  },
  infoNote: {
    marginTop: spacing.sm,
    fontSize: typography.sizes.sm,
    color: colors.textInverse,
    opacity: 0.9,
    lineHeight: 20,
  },
  socialGroup: {
    gap: spacing.sm,
  },
  appleButton: {
    backgroundColor: colors.text,
    borderRadius: radius.button,
    paddingVertical: 14,
    alignItems: 'center',
  },
  appleButtonText: {
    color: colors.textInverse,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  googleButton: {
    backgroundColor: colors.chipSurface,
    borderWidth: 1,
    borderColor: colors.chipBorder,
    borderRadius: radius.button,
    paddingVertical: 14,
    alignItems: 'center',
  },
  googleButtonText: {
    color: colors.text,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  pressed: {
    opacity: 0.85,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  form: {
    gap: spacing.md,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  fieldLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.chipBorder,
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    fontSize: typography.sizes.md,
    color: colors.text,
    backgroundColor: colors.chipSurface,
  },
  errorText: {
    fontSize: typography.sizes.sm,
    color: colors.error,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingTop: spacing.xs,
  },
  toggleText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  toggleLink: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },
  skipRow: {
    marginTop: spacing.sm,
  },
});
