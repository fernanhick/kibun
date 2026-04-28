import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Button, BackButton } from '@components/index';
import { supabase } from '@lib/supabase';
import { colors, typography, spacing, radius } from '@constants/theme';

type Mode = 'change' | 'set';

function friendlyAuthError(message: string): string {
  if (/invalid.*login.*credentials|invalid.*email.*password|invalid.*credentials/i.test(message)) {
    return 'Incorrect current password.';
  }
  if (/same.*previous|password.*reuse/i.test(message)) {
    return 'New password must differ from current.';
  }
  if (/password.*length|should be at least|at least.*character/i.test(message)) {
    return 'Password must be at least 8 characters.';
  }
  if (/too many requests|rate.*limit/i.test(message)) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  if (/network.*failed|fetch.*failed|failed to fetch/i.test(message)) {
    return 'Connection error. Please check your internet and try again.';
  }
  return message;
}

export default function ChangePasswordScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('change');
  const [ineligible, setIneligible] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!supabase) {
      setIneligible(true);
      setLoading(false);
      return;
    }
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      const user = data.user;
      if (!user || user.is_anonymous) {
        router.back();
        return;
      }
      if (!user.email) {
        setIneligible(true);
        setLoading(false);
        return;
      }
      setEmail(user.email);
      const hasEmailIdentity = user.identities?.some((i) => i.provider === 'email') ?? false;
      setMode(hasEmailIdentity ? 'change' : 'set');
      setLoading(false);
    });
    return () => {
      cancelled = true;
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    };
  }, [router]);

  const clearMessages = () => {
    if (error) setError(null);
    if (info) setInfo(null);
  };

  const handleSubmit = async () => {
    if (!supabase || !email || submitting) return;

    const nextNew = newPassword.trim();
    const nextConfirm = confirmPassword.trim();
    const nextCurrent = currentPassword.trim();

    if (mode === 'change' && !nextCurrent) {
      setError('Please enter your current password.');
      return;
    }
    if (!nextNew || !nextConfirm) {
      setError('Please fill in both password fields.');
      return;
    }
    if (nextNew.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (nextNew !== nextConfirm) {
      setError('Passwords do not match.');
      return;
    }
    if (mode === 'change' && nextNew === nextCurrent) {
      setError('New password must differ from current.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setInfo(null);

    if (mode === 'change') {
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email,
        password: nextCurrent,
      });
      if (reauthError) {
        setError(friendlyAuthError(reauthError.message));
        setSubmitting(false);
        return;
      }
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: nextNew });
    if (updateError) {
      setError(friendlyAuthError(updateError.message));
      setSubmitting(false);
      return;
    }

    if (mode === 'set') {
      setInfo(`Password set. You can now sign in with ${email} and this password.`);
    } else {
      setInfo('Password updated.');
    }
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    redirectTimer.current = setTimeout(() => {
      router.back();
    }, mode === 'set' ? 1500 : 1200);
  };

  const handleForgot = async () => {
    if (!supabase || !email) return;
    clearMessages();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email);
    if (resetError) {
      setError(friendlyAuthError(resetError.message));
    } else {
      setInfo('Password reset email sent. Check your inbox.');
    }
  };

  const title = mode === 'set' ? 'Set a password' : 'Change password';
  const primaryLabel = mode === 'set' ? 'Set password' : 'Update password';

  const primaryDisabled =
    submitting ||
    !newPassword.trim() ||
    !confirmPassword.trim() ||
    (mode === 'change' && !currentPassword.trim());

  return (
    <Screen scrollable={true} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle} accessibilityRole="header">
          {title}
        </Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : ineligible ? (
        <View style={styles.centered}>
          <Text style={styles.ineligibleText}>
            Password sign-in needs an email address on file for this account. Please contact support if you need help.
          </Text>
          <Button label="Go back" onPress={() => router.back()} variant="ghost" fullWidth />
        </View>
      ) : (
        <View style={styles.body}>
          <View style={styles.accountCard}>
            <Ionicons
              name="mail-outline"
              size={20}
              color={colors.textSecondary}
              accessibilityElementsHidden
            />
            <Text style={styles.accountEmail} numberOfLines={1}>
              {email}
            </Text>
          </View>

          {mode === 'set' && (
            <Text style={styles.subtitle}>
              Add a password so you can sign in with your email as a backup to Google or Apple sign-in.
            </Text>
          )}

          <View style={styles.form}>
            {mode === 'change' && (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Current password</Text>
                <TextInput
                  style={styles.input}
                  value={currentPassword}
                  onChangeText={(text) => {
                    setCurrentPassword(text);
                    clearMessages();
                  }}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="current-password"
                  textContentType="password"
                  accessibilityLabel="Current password"
                  placeholder="Enter current password"
                  placeholderTextColor={colors.textDisabled}
                />
              </View>
            )}

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>New password</Text>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={(text) => {
                  setNewPassword(text);
                  clearMessages();
                }}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
                accessibilityLabel="New password"
                placeholder="Min. 8 characters"
                placeholderTextColor={colors.textDisabled}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Confirm new password</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  clearMessages();
                }}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
                accessibilityLabel="Confirm new password"
                placeholder="Re-enter new password"
                placeholderTextColor={colors.textDisabled}
              />
            </View>

            <Button
              label={primaryLabel}
              onPress={handleSubmit}
              variant="sunrise"
              disabled={primaryDisabled}
              loading={submitting}
              fullWidth
            />

            {mode === 'change' && (
              <Pressable
                onPress={handleForgot}
                style={styles.forgotRow}
                accessibilityRole="button"
                accessibilityLabel="Forgot current password"
              >
                <Text style={styles.forgotText}>Forgot current password?</Text>
              </Pressable>
            )}
          </View>

          {error !== null && (
            <Text style={styles.errorText} accessibilityRole="alert">
              {error}
            </Text>
          )}
          {info !== null && (
            <Text style={styles.infoText} accessibilityLiveRegion="polite">
              {info}
            </Text>
          )}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  ineligibleText: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.sizes.md * typography.lineHeights.relaxed,
  },
  body: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  accountEmail: {
    flex: 1,
    fontSize: typography.sizes.body,
    color: colors.text,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: typography.sizes.sm * typography.lineHeights.relaxed,
  },
  form: {
    gap: spacing.md,
    marginTop: spacing.xs,
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
});
