import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Screen, Button, BackButton } from '@components/index';
import { useSessionStore } from '@store/sessionStore';
import { useOnboardingGateStore } from '@store/onboardingGateStore';
import { supabase } from '@lib/supabase';
import { resetAllLocalUserData } from '@lib/localDataReset';
import { exportUserData } from '@lib/exportUserData';
import { colors, typography, spacing, radius } from '@constants/theme';

export default function AccountScreen() {
  const router = useRouter();
  const { t } = useTranslation('screens');
  const session = useSessionStore((s) => s.session);
  const isAnonymous = !session || session.authStatus === 'anonymous';
  const subscriptionStatus = session?.subscriptionStatus ?? 'none';

  const [email, setEmail] = useState<string | null>(null);
  const [hasEmailPassword, setHasEmailPassword] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingData, setDeletingData] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Load email + identity info for registered users
  useEffect(() => {
    if (isAnonymous || !supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      setHasEmailPassword(data.user?.identities?.some((i) => i.provider === 'email') ?? false);
    });
  }, [isAnonymous]);

  const handleDeleteData = () => {
    Alert.alert(
      t('account.deleteData.confirmTitle'),
      t('account.deleteData.confirmBody'),
      [
        { text: t('account.common.cancel'), style: 'cancel' },
        {
          text: t('account.deleteData.confirmAction'),
          style: 'destructive',
          onPress: async () => {
            if (!supabase || deletingData) return;
            setDeletingData(true);
            try {
              const { error } = await supabase.rpc('delete_user_data');
              if (error) throw error;
              await resetAllLocalUserData();
              useOnboardingGateStore.setState({ complete: false, paywallSeen: false });
              router.replace('/(onboarding)/first-mood');
            } catch (err) {
              if (__DEV__) console.error('[kibun:account] Delete data failed:', err);
              Alert.alert(t('account.deleteData.errorTitle'), t('account.deleteData.errorBody'));
              setDeletingData(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('account.deleteAccount.confirmTitle'),
      t('account.deleteAccount.confirmBody'),
      [
        { text: t('account.common.cancel'), style: 'cancel' },
        {
          text: t('account.deleteAccount.confirmAction'),
          style: 'destructive',
          onPress: async () => {
            if (!supabase || deleting) return;
            setDeleting(true);
            try {
              const { error } = await supabase.rpc('delete_user');
              if (error) throw error;
              await supabase.auth.signOut();
              await resetAllLocalUserData();
              useOnboardingGateStore.setState({ complete: false, paywallSeen: false });
              router.replace('/(onboarding)/first-mood');
            } catch (err) {
              if (__DEV__) console.error('[kibun:account] Delete account failed:', err);
              Alert.alert(t('account.deleteAccount.errorTitle'), t('account.deleteAccount.errorBody'));
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleSignOut = async () => {
    if (signingOut) return;
    if (!supabase) return;
    setSigningOut(true);
    try {
      // 1. Revoke push token (fire-and-forget — resolves deferred D-3 from 08-02)
      await supabase.auth.updateUser({ data: { expo_push_token: null } }).catch(() => {});

      // 2. Sign out — fires SIGNED_OUT in useAuth → clearSession()
      await supabase.auth.signOut();

      // 3. Reset onboarding gate so user re-enters onboarding flow
      useOnboardingGateStore.setState({ complete: false, paywallSeen: false });

      // 4. Navigate to onboarding
      router.replace('/(onboarding)/first-mood');
    } catch (err) {
      if (__DEV__) {
        console.error('[kibun:account] Sign out failed:', err);
      }
      setSigningOut(false);
    }
  };

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const json = await exportUserData();
      const stamp = new Date().toISOString().slice(0, 10);
      const file = new File(Paths.cache, `kibun-export-${stamp}.json`);
      file.create({ overwrite: true });
      file.write(json);

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert(t('account.export.savedTitle'), t('account.export.savedFallback', { uri: file.uri }));
        return;
      }
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/json',
        dialogTitle: t('account.export.dialogTitle'),
        UTI: 'public.json',
      });
    } catch (err) {
      if (__DEV__) console.error('[kibun:account] Export failed:', err);
      Alert.alert(t('account.export.failedTitle'), t('account.export.failedBody'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <Screen scrollable={false}>
      {/* Header */}
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle} accessibilityRole="header">
          {t('account.title')}
        </Text>
      </View>

      {isAnonymous ? (
        /* ── Anonymous state ─────────────────────────────────────────── */
        <View style={styles.centeredContent}>
          <Ionicons
            name="person-circle-outline"
            size={64}
            color={colors.textSecondary}
            accessibilityElementsHidden
          />
          <Text style={styles.stateTitle}>{t('account.anonymous.title')}</Text>
          <Text style={styles.stateSubtitle}>{t('account.anonymous.subtitle')}</Text>
          <Button
            label={t('account.anonymous.createAccount')}
            onPress={() => router.push('/register')}
            fullWidth
          />
        </View>
      ) : (
        /* ── Registered state ────────────────────────────────────────── */
        <ScrollView
          contentContainerStyle={styles.registeredContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.accountCard}>
            <Ionicons
              name="checkmark-circle-outline"
              size={40}
              color={colors.primary}
              accessibilityElementsHidden
            />
            <View style={styles.accountInfo}>
              <Text style={styles.accountTitle}>{t('account.connected')}</Text>
              {email ? (
                <Text style={styles.accountEmail}>{email}</Text>
              ) : (
                <ActivityIndicator size="small" color={colors.textSecondary} />
              )}
            </View>
          </View>

          <Text style={styles.sectionHeader} accessibilityRole="header">
            {t('account.sections.subscription')}
          </Text>
          <View style={styles.section}>
            <View style={styles.subscriptionRow}>
              <Text style={styles.subscriptionLabel}>{t('account.subscription.statusLabel')}</Text>
              <SubscriptionBadge status={subscriptionStatus} />
            </View>
            {(subscriptionStatus === 'expired' || subscriptionStatus === 'none') && (
              <Pressable
                style={styles.upgradeRow}
                onPress={() => router.push('/paywall')}
                accessibilityRole="button"
                accessibilityLabel={t('account.subscription.manageA11y')}
              >
                <Text style={styles.upgradeText}>{t('account.subscription.manage')}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.primary} />
              </Pressable>
            )}
          </View>

          <Text style={styles.sectionHeader} accessibilityRole="header">
            {t('account.sections.security')}
          </Text>
          <View style={styles.section}>
            <Pressable
              style={styles.securityRow}
              onPress={() => router.push('/change-password')}
              accessibilityRole="button"
              accessibilityLabel={hasEmailPassword ? t('account.security.changeA11y') : t('account.security.setA11y')}
            >
              <View style={styles.securityTextGroup}>
                <Text style={styles.securityLabel}>
                  {hasEmailPassword ? t('account.security.change') : t('account.security.set')}
                </Text>
                {!hasEmailPassword && (
                  <Text style={styles.securityHint}>{t('account.security.setHint')}</Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </Pressable>
          </View>

          <View style={styles.signOutSection}>
            <Button
              label={signingOut ? t('account.signOut.loading') : t('account.signOut.label')}
              onPress={handleSignOut}
              variant="ghost"
              disabled={signingOut || deleting}
              fullWidth
            />
            <Text style={styles.signOutHint}>{t('account.signOut.hint')}</Text>
          </View>

          <Text style={styles.sectionHeader} accessibilityRole="header">
            {t('account.sections.privacy')}
          </Text>
          <View style={styles.section}>
            <Pressable
              style={styles.securityRow}
              onPress={handleExport}
              disabled={exporting}
              accessibilityRole="button"
              accessibilityLabel={t('account.export.a11y')}
            >
              <View style={styles.securityTextGroup}>
                <Text style={styles.securityLabel}>
                  {exporting ? t('account.export.loading') : t('account.export.label')}
                </Text>
                <Text style={styles.securityHint}>{t('account.export.hint')}</Text>
              </View>
              {exporting
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Ionicons name="download-outline" size={20} color={colors.primary} />}
            </Pressable>
          </View>

          <View style={styles.dangerSection}>
            <Text style={styles.dangerHeader} accessibilityRole="header">{t('account.sections.danger')}</Text>
            <View style={styles.dangerCard}>
              <Pressable
                style={styles.deleteRow}
                onPress={handleDeleteData}
                disabled={deletingData || deleting}
                accessibilityRole="button"
                accessibilityLabel={t('account.deleteData.a11y')}
              >
                <View style={styles.deleteTextGroup}>
                  <Text style={styles.deleteTitle}>
                    {deletingData ? t('account.deleteData.loading') : t('account.deleteData.title')}
                  </Text>
                  <Text style={styles.deleteSubtitle}>{t('account.deleteData.subtitle')}</Text>
                </View>
                {deletingData
                  ? <ActivityIndicator size="small" color={colors.error} />
                  : <Ionicons name="document-text-outline" size={20} color={colors.error} />}
              </Pressable>
              <View style={styles.dangerDivider} />
              <Pressable
                style={styles.deleteRow}
                onPress={handleDeleteAccount}
                disabled={deleting || deletingData}
                accessibilityRole="button"
                accessibilityLabel={t('account.deleteAccount.a11y')}
              >
                <View style={styles.deleteTextGroup}>
                  <Text style={styles.deleteTitle}>
                    {deleting ? t('account.deleteAccount.loading') : t('account.deleteAccount.title')}
                  </Text>
                  <Text style={styles.deleteSubtitle}>{t('account.deleteAccount.subtitle')}</Text>
                </View>
                {deleting
                  ? <ActivityIndicator size="small" color={colors.error} />
                  : <Ionicons name="trash-outline" size={20} color={colors.error} />}
              </Pressable>
            </View>
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function SubscriptionBadge({ status }: { status: string }) {
  const { t } = useTranslation('screens');
  const styleMap: Record<string, { style: object; textStyle: object }> = {
    trial:   { style: styles.badgeTrial,   textStyle: styles.badgeTrialText },
    active:  { style: styles.badgeActive,  textStyle: styles.badgeActiveText },
    expired: { style: styles.badgeExpired, textStyle: styles.badgeExpiredText },
    none:    { style: styles.badgeNone,    textStyle: styles.badgeNoneText },
  };
  const key = (status in styleMap) ? status : 'none';
  const { style, textStyle } = styleMap[key];
  const label = t(`account.subscription.badge.${key}`);
  return (
    <View style={[styles.badge, style]}>
      <Text style={[styles.badgeText, textStyle]}>{label}</Text>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
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
  centeredContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  stateTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    textAlign: 'center',
  },
  stateSubtitle: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.sizes.md * typography.lineHeights.relaxed,
  },
  registeredContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  accountInfo: {
    flex: 1,
    gap: 2,
  },
  accountTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  accountEmail: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  sectionHeader: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    letterSpacing: 0.5,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  subscriptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  subscriptionLabel: {
    fontSize: typography.sizes.body,
    color: colors.text,
    fontWeight: typography.weights.medium,
  },
  upgradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  upgradeText: {
    fontSize: typography.sizes.body,
    color: colors.primary,
    fontWeight: typography.weights.medium,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  securityTextGroup: {
    flex: 1,
    gap: 2,
  },
  securityLabel: {
    fontSize: typography.sizes.body,
    color: colors.text,
    fontWeight: typography.weights.medium,
  },
  securityHint: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  badge: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
  },
  badgeText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  // Trial/Active: primaryDark on primaryLight — WCAG AA compliant
  badgeTrial:     { backgroundColor: colors.primaryLight },
  badgeTrialText: { color: colors.primaryDark },
  badgeActive:    { backgroundColor: colors.primaryLight },
  badgeActiveText: { color: colors.primaryDark },
  // Expired: dark text on errorLight — WCAG AA compliant (NOT colors.error as text on white)
  badgeExpired:     { backgroundColor: colors.errorLight },
  badgeExpiredText: { color: colors.text },
  // None: bordered surface
  badgeNone:     { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  badgeNoneText: { color: colors.textSecondary },
  dangerSection: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  dangerHeader: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.error,
    letterSpacing: 0.5,
  },
  dangerCard: {
    backgroundColor: colors.errorLight,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.error + '33',
    overflow: 'hidden',
  },
  deleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  deleteTextGroup: {
    flex: 1,
    gap: 2,
  },
  deleteTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.error,
  },
  deleteSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.error + 'aa',
  },
  dangerDivider: {
    height: 1,
    backgroundColor: colors.error + '33',
    marginHorizontal: spacing.md,
  },
  signOutSection: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  signOutHint: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
});
