import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Linking as RNLinking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen, Button } from '@components/index';
import { supabase } from '@lib/supabase';
import { useOnboardingGateStore } from '@store/onboardingGateStore';
import { useSessionStore } from '@store/sessionStore';
import { PRIVACY_POLICY_URL, TERMS_OF_USE_URL } from '@constants/legal';
import { colors, typography, spacing, radius } from '@constants/theme';

// Required by expo-web-browser to complete any pending auth sessions on mount.
WebBrowser.maybeCompleteAuthSession();

function friendlyAuthError(message: string, mode: 'register' | 'login', t: TFunction<'screens'>): string {
  if (/same.*previous|password.*reuse/i.test(message)) {
    return t('register.errors.differentPassword');
  }
  if (/user.*already.*registered|already.*registered|email.*already.*use/i.test(message)) {
    return mode === 'register'
      ? t('register.errors.alreadyRegistered')
      : t('register.errors.incorrectCredentials');
  }
  if (/invalid.*login.*credentials|invalid.*email.*password|invalid.*credentials/i.test(message)) {
    return t('register.errors.incorrectCredentials');
  }
  if (/email.*not.*confirmed|email.*confirm|confirm.*email/i.test(message)) {
    return t('register.errors.confirmFirst');
  }
  if (/signup.*disabled/i.test(message)) {
    return t('register.errors.signupDisabled');
  }
  if (/too many requests|rate.*limit/i.test(message)) {
    return t('register.errors.tooManyRequests');
  }
  if (/network.*failed|fetch.*failed|failed to fetch/i.test(message)) {
    return t('register.errors.networkError');
  }
  if (/password.*length|should be at least|at least.*character/i.test(message)) {
    return t('register.errors.passwordTooShort');
  }
  if (/invalid.*email|email.*invalid/i.test(message)) {
    return t('register.errors.invalidEmail');
  }
  return message;
}

function validateInputs(email: string, password: string, mode: 'register' | 'login', t: TFunction<'screens'>): string | null {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return t('register.errors.invalidEmail');
  }
  if (mode === 'register' && password.trim().length < 8) {
    return t('register.errors.passwordTooShort');
  }
  return null;
}

export default function RegistrationScreen() {
  const router = useRouter();
  const { t } = useTranslation('screens');
  const params = useLocalSearchParams<{ mode?: string | string[]; source?: string | string[] }>();
  const modeParam = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  const sourceParam = Array.isArray(params.source) ? params.source[0] : params.source;
  const fromOnboarding = sourceParam === 'onboarding';
  const session = useSessionStore((s) => s.session);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
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
      setError(t('register.errors.configMissing'));
      return;
    }
    if (!email.trim() || !password.trim() || submitting) return;

    const validationError = validateInputs(email, password, mode, t);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);
    setInfoMessage(null);

    if (mode === 'register') {
      const cleanEmail = email.trim();
      const cleanPassword = password.trim();

      const { data: preSession } = await supabase.auth.getSession();
      const hasAnonymousSession = Boolean(preSession.session?.user.is_anonymous);

      if (hasAnonymousSession) {
        const { error: authError } = await supabase.auth.updateUser({
          email: cleanEmail,
          password: cleanPassword,
        });

        if (authError) {
          // "Same password as previous" means the user already set these credentials in a
          // prior partial registration on this device. Recover by signing in directly.
          if (/same.*previous|password.*reuse/i.test(authError.message)) {
            const { error: signInError } = await supabase.auth.signInWithPassword({
              email: cleanEmail,
              password: cleanPassword,
            });
            if (signInError) {
              if (/email.*confirm|confirm.*email/i.test(signInError.message)) {
                setInfoMessage(t('register.info.accountCreated'));
              } else {
                setError(friendlyAuthError(signInError.message, 'register', t));
              }
              setSubmitting(false);
              return;
            }
            // Sign-in succeeded — fall through to post-session check below
          } else if (/user.*already.*registered|already.*registered|email.*already.*use/i.test(authError.message)) {
            setError(t('register.errors.alreadyRegistered'));
            setMode('login');
            setSubmitting(false);
            return;
          } else {
            setError(friendlyAuthError(authError.message, 'register', t));
            setSubmitting(false);
            return;
          }
        } else {
          // On some projects USER_UPDATED arrives before session reflects non-anonymous state.
          // A password sign-in normalizes session state and guarantees auth listeners update.
          const { data: updatedSession } = await supabase.auth.getSession();
          if (updatedSession.session?.user.is_anonymous) {
            const { error: signInError } = await supabase.auth.signInWithPassword({
              email: cleanEmail,
              password: cleanPassword,
            });
            if (signInError) {
              if (/email.*confirm|confirm.*email/i.test(signInError.message)) {
                setInfoMessage(t('register.info.accountCreated'));
              } else {
                setError(friendlyAuthError(signInError.message, 'register', t));
              }
              setSubmitting(false);
              return;
            }
          }
        }
      } else {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: cleanEmail,
          password: cleanPassword,
        });

        if (signUpError) {
          if (/user.*already.*registered|already.*registered|email.*already.*use/i.test(signUpError.message)) {
            setError(t('register.errors.alreadyRegistered'));
            setMode('login');
          } else {
            setError(friendlyAuthError(signUpError.message, 'register', t));
          }
          setSubmitting(false);
          return;
        }

        // If email confirmation is required, Supabase returns session=null.
        if (!signUpData.session) {
          setInfoMessage(t('register.info.accountCreated'));
          setSubmitting(false);
          return;
        }
      }
    } else {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });
      if (authError) {
        if (/email.*confirm|confirm.*email/i.test(authError.message)) {
          setInfoMessage(t('register.info.confirmBeforeSignIn'));
        } else {
          setError(friendlyAuthError(authError.message, 'login', t));
        }
        setSubmitting(false);
        return;
      }
    }

    const { data: postSession } = await supabase.auth.getSession();
    if (!postSession.session || postSession.session.user.is_anonymous) {
      // If email confirmation is still pending, the session will remain anonymous/null.
      setInfoMessage(t('register.info.confirmFirstThenSignIn'));
      setSubmitting(false);
      return;
    }

    completeOnboardingForReturningUser();
    router.replace('/(tabs)');
  };

  const handleForgotPassword = async () => {
    if (!supabase) return;
    const cleanEmail = email.trim();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError(t('register.errors.enterEmailFirst'));
      return;
    }
    setError(null);
    setInfoMessage(null);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail);
    if (resetError) {
      setError(friendlyAuthError(resetError.message, 'login', t));
    } else {
      setInfoMessage(t('register.info.resetEmailSent'));
    }
  };

  // Shared OAuth handler for Google/Apple.
  // Uses signInWithOAuth for both login and signup — Supabase auto-creates users on first OAuth login.
  // Does NOT use linkIdentity (unreliable with PKCE + skipBrowserRedirect on mobile).
  const handleOAuth = async (provider: 'google' | 'apple') => {
    if (!supabase) {
      setError(t('register.errors.configMissing'));
      return;
    }
    setError(null);
    setInfoMessage(null);

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
      setError(authError?.message ?? t('register.errors.oauthUnavailable', { provider: provider === 'google' ? 'Google' : 'Apple' }));
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
      setError(t('register.errors.signInIncomplete'));
    } catch (e) {
      if (__DEV__) console.error('[kibun:oauth] exception:', e);
      setError(provider === 'google' ? t('register.errors.oauthFailedGoogle') : t('register.errors.oauthFailedApple'));
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
          {mode === 'register' ? t('register.hero.registerTitle') : t('register.hero.loginTitle')}
        </Text>
        <Text style={styles.subtitle}>
          {mode === 'register' ? t('register.hero.registerSubtitle') : t('register.hero.loginSubtitle')}
        </Text>
        {fromOnboarding && (
          <Text style={styles.infoNote}>{t('register.hero.fromOnboardingNote')}</Text>
        )}
      </LinearGradient>

      <View style={styles.sectionCard}>
        {/* Social auth buttons */}
        <View style={styles.socialGroup}>
          <Pressable
            style={({ pressed }) => [styles.appleButton, pressed && styles.pressed]}
            onPress={() => handleOAuth('apple')}
            accessibilityRole="button"
            accessibilityLabel={t('register.social.apple')}
          >
            <Text style={styles.appleButtonText}>{t('register.social.apple')}</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.googleButton, pressed && styles.pressed]}
            onPress={() => handleOAuth('google')}
            accessibilityRole="button"
            accessibilityLabel={t('register.social.google')}
          >
            <Text style={styles.googleButtonText}>{t('register.social.google')}</Text>
          </Pressable>
        </View>

        {/* Divider */}
        <View style={styles.divider} accessibilityRole="none">
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{t('register.divider')}</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Email / password form */}
        <View style={styles.form}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t('register.form.emailLabel')}</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={(text) => { setEmail(text); setError(null); setInfoMessage(null); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              accessibilityLabel={t('register.form.emailA11y')}
              placeholder={t('register.form.emailPlaceholder')}
              placeholderTextColor={colors.textDisabled}
              maxLength={254}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t('register.form.passwordLabel')}</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={(text) => { setPassword(text); setError(null); setInfoMessage(null); }}
              secureTextEntry={true}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              accessibilityLabel={t('register.form.passwordA11y')}
              placeholder={mode === 'register' ? t('register.form.passwordPlaceholderRegister') : t('register.form.passwordPlaceholderLogin')}
              placeholderTextColor={colors.textDisabled}
              maxLength={128}
            />
          </View>

          <Button
            label={mode === 'register' ? t('register.form.submitRegister') : t('register.form.submitLogin')}
            onPress={handleEmail}
            variant="sunrise"
            disabled={!email.trim() || !password.trim()}
            loading={submitting}
            fullWidth
          />

          {mode === 'login' && (
            <Pressable
              onPress={handleForgotPassword}
              style={styles.forgotRow}
              accessibilityRole="button"
              accessibilityLabel={t('register.form.forgotA11y')}
            >
              <Text style={styles.forgotText}>{t('register.form.forgot')}</Text>
            </Pressable>
          )}

          {mode === 'register' && (
            <Text style={styles.legalText}>
              {t('register.form.legalIntro')}
              <Text
                style={styles.legalLink}
                onPress={() => RNLinking.openURL(TERMS_OF_USE_URL)}
                accessibilityRole="link"
              >
                {t('register.form.termsOfUse')}
              </Text>
              {t('register.form.legalAnd')}
              <Text
                style={styles.legalLink}
                onPress={() => RNLinking.openURL(PRIVACY_POLICY_URL)}
                accessibilityRole="link"
              >
                {t('register.form.privacyPolicy')}
              </Text>
              {t('register.form.legalSuffix')}
            </Text>
          )}
        </View>

        {/* Toggle login/register */}
        <Pressable
          onPress={() => { setMode(mode === 'register' ? 'login' : 'register'); setError(null); setInfoMessage(null); }}
          style={styles.toggleRow}
        >
          <Text style={styles.toggleText}>
            {mode === 'register' ? t('register.toggle.haveAccount') : t('register.toggle.noAccount')}
          </Text>
          <Text style={styles.toggleLink}>
            {mode === 'register' ? t('register.toggle.linkLogin') : t('register.toggle.linkRegister')}
          </Text>
        </Pressable>
      </View>

      {/* Inline error display */}
      {error !== null && (
        <Text style={styles.errorText} accessibilityRole="alert">
          {error}
        </Text>
      )}

      {/* Inline info display */}
      {infoMessage !== null && (
        <Text style={styles.infoText} accessibilityLiveRegion="polite">
          {infoMessage}
        </Text>
      )}

      {/* Skip */}
      <View style={styles.skipRow}>
        <Button
          label={t('register.skip')}
          onPress={handleSkip}
          variant="ghost"
          fullWidth
          accessibilityHint={t('register.skipA11yHint')}
        />
      </View>

      {/* Dev-only: quick tester login */}
      {__DEV__ && (
        <Pressable
          onPress={async () => {
            if (!supabase) return;
            setError(null);
            setInfoMessage(null);
            setSubmitting(true);
            const { error: devErr } = await supabase.auth.signInWithPassword({
              email: 'fernanhick+kibun-review@gmail.com',
              password: 'Kibun-Review-2026!Sakura',
            });
            setSubmitting(false);
            if (devErr) {
              setError(devErr.message);
            } else {
              completeOnboardingForReturningUser();
              router.replace('/(tabs)');
            }
          }}
          style={({ pressed }) => [styles.devLoginButton, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Dev: sign in as tester"
        >
          <Text style={styles.devLoginText}>Dev: tester login</Text>
        </Pressable>
      )}
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
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 16,
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
  forgotRow: {
    alignItems: 'center',
    marginTop: -spacing.xs,
  },
  forgotText: {
    fontSize: typography.sizes.sm,
    color: colors.primary,
  },
  legalText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.sizes.xs * typography.lineHeights.relaxed,
    paddingHorizontal: spacing.sm,
    marginTop: -spacing.xs,
  },
  legalLink: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  errorText: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.errorLight,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
  },
  infoText: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
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
  devLoginButton: {
    alignSelf: 'center',
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    backgroundColor: colors.chipSurface,
  },
  devLoginText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
});
