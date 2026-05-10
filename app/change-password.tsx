import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Button, BackButton } from '@components/index';
import { supabase } from '@lib/supabase';
import { colors, typography, spacing, radius } from '@constants/theme';

type Mode = 'change' | 'set';

function friendlyAuthError(message: string, t: TFunction<'screens'>): string {
  if (/invalid.*login.*credentials|invalid.*email.*password|invalid.*credentials/i.test(message)) {
    return t('changePassword.errors.incorrectCurrent');
  }
  if (/same.*previous|password.*reuse/i.test(message)) {
    return t('changePassword.errors.mustDiffer');
  }
  if (/password.*length|should be at least|at least.*character/i.test(message)) {
    return t('changePassword.errors.tooShort');
  }
  if (/too many requests|rate.*limit/i.test(message)) {
    return t('changePassword.errors.tooManyRequests');
  }
  if (/network.*failed|fetch.*failed|failed to fetch/i.test(message)) {
    return t('changePassword.errors.networkError');
  }
  return message;
}

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { t } = useTranslation('screens');

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
      setError(t('changePassword.errors.enterCurrent'));
      return;
    }
    if (!nextNew || !nextConfirm) {
      setError(t('changePassword.errors.fillBoth'));
      return;
    }
    if (nextNew.length < 8) {
      setError(t('changePassword.errors.tooShort'));
      return;
    }
    if (nextNew !== nextConfirm) {
      setError(t('changePassword.errors.noMatch'));
      return;
    }
    if (mode === 'change' && nextNew === nextCurrent) {
      setError(t('changePassword.errors.mustDiffer'));
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
        setError(friendlyAuthError(reauthError.message, t));
        setSubmitting(false);
        return;
      }
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: nextNew });
    if (updateError) {
      setError(friendlyAuthError(updateError.message, t));
      setSubmitting(false);
      return;
    }

    if (mode === 'set') {
      setInfo(t('changePassword.info.passwordSet', { email }));
    } else {
      setInfo(t('changePassword.info.updated'));
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
      setError(friendlyAuthError(resetError.message, t));
    } else {
      setInfo(t('changePassword.info.resetEmailSent'));
    }
  };

  const title = mode === 'set' ? t('changePassword.titleSet') : t('changePassword.titleChange');
  const primaryLabel = mode === 'set' ? t('changePassword.submitSet') : t('changePassword.submitChange');

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
          <Text style={styles.ineligibleText}>{t('changePassword.ineligible')}</Text>
          <Button label={t('changePassword.goBack')} onPress={() => router.back()} variant="ghost" fullWidth />
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
            <Text style={styles.subtitle}>{t('changePassword.setSubtitle')}</Text>
          )}

          <View style={styles.form}>
            {mode === 'change' && (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{t('changePassword.fields.currentLabel')}</Text>
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
                  accessibilityLabel={t('changePassword.fields.currentA11y')}
                  placeholder={t('changePassword.fields.currentPlaceholder')}
                  placeholderTextColor={colors.textDisabled}
                />
              </View>
            )}

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t('changePassword.fields.newLabel')}</Text>
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
                accessibilityLabel={t('changePassword.fields.newA11y')}
                placeholder={t('changePassword.fields.newPlaceholder')}
                placeholderTextColor={colors.textDisabled}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t('changePassword.fields.confirmLabel')}</Text>
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
                accessibilityLabel={t('changePassword.fields.confirmA11y')}
                placeholder={t('changePassword.fields.confirmPlaceholder')}
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
                accessibilityLabel={t('changePassword.forgotA11y')}
              >
                <Text style={styles.forgotText}>{t('changePassword.forgot')}</Text>
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
