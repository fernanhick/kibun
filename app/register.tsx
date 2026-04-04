import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { Screen, Button } from '@components/index';
import { supabase } from '@lib/supabase';
import { colors, typography, spacing, radius } from '@constants/theme';

// Required by expo-web-browser to complete any pending auth sessions on mount.
WebBrowser.maybeCompleteAuthSession();

export default function RegistrationScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Converts the anonymous session to a registered email/password account.
  // supabase.auth.updateUser preserves the anonymous userId — same user, now registered.
  const handleEmail = async () => {
    if (!email.trim() || !password.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    const { error: authError } = await supabase.auth.updateUser({
      email: email.trim(),
      password: password.trim(),
    });
    if (authError) {
      setError(authError.message);
      setSubmitting(false);
      return;
    }
    // updateUser dispatches a confirmation email.
    // If email confirmation is disabled in Supabase dashboard: session upgrades immediately.
    // If enabled: onAuthStateChange fires when the user clicks the confirmation link.
    // Navigate to tabs in both cases — the banner disappears once the session upgrades.
    router.replace('/(tabs)');
  };

  // linkIdentity links Google to the existing anonymous user, preserving the userId.
  // skipBrowserRedirect: true lets us open the OAuth URL manually via WebBrowser.
  const handleGoogle = async () => {
    setError(null);
    const redirectTo = makeRedirectUri({ scheme: 'kibun', path: 'auth/callback' });
    const { data, error: authError } = await supabase.auth.linkIdentity({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (authError || !data?.url) {
      setError(authError?.message ?? 'Google sign in unavailable');
      return;
    }
    try {
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type !== 'success') return; // Cancelled — no error shown, stays on screen
      const { error: sessionError } = await supabase.auth.exchangeCodeForSession(result.url);
      if (sessionError) {
        setError(sessionError.message);
        return;
      }
      // onAuthStateChange SIGNED_IN fires → setSession({ authStatus: 'registered' })
      router.replace('/(tabs)');
    } catch {
      setError('Google sign in failed. Please try again.');
    }
  };

  // linkIdentity links Apple to the existing anonymous user via web-based OAuth,
  // preserving the userId. Same pattern as Google — Supabase handles nonce server-side.
  const handleApple = async () => {
    setError(null);
    const redirectTo = makeRedirectUri({ scheme: 'kibun', path: 'auth/callback' });
    const { data, error: authError } = await supabase.auth.linkIdentity({
      provider: 'apple',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (authError || !data?.url) {
      setError(authError?.message ?? 'Apple sign in unavailable');
      return;
    }
    try {
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type !== 'success') return; // Cancelled — no error shown, stays on screen
      const { error: sessionError } = await supabase.auth.exchangeCodeForSession(result.url);
      if (sessionError) {
        setError(sessionError.message);
        return;
      }
      // onAuthStateChange SIGNED_IN fires → setSession({ authStatus: 'registered' })
      router.replace('/(tabs)');
    } catch {
      setError('Apple sign in failed. Please try again.');
    }
  };

  const handleSkip = () => {
    router.replace('/(tabs)');
  };

  return (
    <Screen scrollable={true} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Create your account</Text>
      <Text style={styles.subtitle}>
        Link your data to an account so you never lose it
      </Text>

      {/* Social auth buttons */}
      <View style={styles.socialGroup}>
        <Pressable
          style={({ pressed }) => [styles.appleButton, pressed && styles.pressed]}
          onPress={handleApple}
          accessibilityRole="button"
          accessibilityLabel="Sign in with Apple"
        >
          <Text style={styles.appleButtonText}>Continue with Apple</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.googleButton, pressed && styles.pressed]}
          onPress={handleGoogle}
          accessibilityRole="button"
          accessibilityLabel="Sign in with Google"
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
            autoComplete="new-password"
            accessibilityLabel="Password"
            placeholder="Min. 8 characters"
            placeholderTextColor={colors.textDisabled}
          />
        </View>

        <Button
          label="Create account"
          onPress={handleEmail}
          disabled={!email.trim() || !password.trim()}
          loading={submitting}
          fullWidth
        />
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
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    lineHeight: typography.sizes.md * typography.lineHeights.relaxed,
    marginTop: -spacing.sm,
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
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
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
    color: colors.text,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    fontSize: typography.sizes.md,
    color: colors.text,
    backgroundColor: colors.background,
  },
  errorText: {
    fontSize: typography.sizes.sm,
    color: colors.error,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
  skipRow: {
    marginTop: spacing.sm,
  },
});
