import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Button } from '@components/index';
import { useSessionStore } from '@store/sessionStore';
import { useOnboardingGateStore } from '@store/onboardingGateStore';
import { supabase } from '@lib/supabase';
import { colors, typography, spacing, radius } from '@constants/theme';

export default function AccountScreen() {
  const router = useRouter();
  const session = useSessionStore((s) => s.session);
  const isAnonymous = !session || session.authStatus === 'anonymous';
  const subscriptionStatus = session?.subscriptionStatus ?? 'none';

  const [email, setEmail] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Load email for registered users
  useEffect(() => {
    if (isAnonymous || !supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
  }, [isAnonymous]);

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your mood data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!supabase || deleting) return;
            setDeleting(true);
            try {
              const { error } = await supabase.rpc('delete_user');
              if (error) throw error;
              await supabase.auth.signOut();
              useOnboardingGateStore.setState({ complete: false, paywallSeen: false });
              router.replace('/(onboarding)/first-mood');
            } catch (err) {
              if (__DEV__) console.error('[kibun:account] Delete account failed:', err);
              Alert.alert('Error', 'Failed to delete account. Please try again.');
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

  return (
    <Screen scrollable={false}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="Go back"
          accessibilityRole="button"
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle} accessibilityRole="header">
          Account
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
          <Text style={styles.stateTitle}>Not signed in</Text>
          <Text style={styles.stateSubtitle}>
            Your mood data is stored on this device only. Create an account to keep it safe across devices.
          </Text>
          <Button
            label="Create account"
            onPress={() => router.push('/register')}
            fullWidth
          />
        </View>
      ) : (
        /* ── Registered state ────────────────────────────────────────── */
        <View style={styles.registeredContent}>
          <View style={styles.accountCard}>
            <Ionicons
              name="checkmark-circle-outline"
              size={40}
              color={colors.primary}
              accessibilityElementsHidden
            />
            <View style={styles.accountInfo}>
              <Text style={styles.accountTitle}>Connected account</Text>
              {email ? (
                <Text style={styles.accountEmail}>{email}</Text>
              ) : (
                <ActivityIndicator size="small" color={colors.textSecondary} />
              )}
            </View>
          </View>

          <Text style={styles.sectionHeader} accessibilityRole="header">
            SUBSCRIPTION
          </Text>
          <View style={styles.section}>
            <View style={styles.subscriptionRow}>
              <Text style={styles.subscriptionLabel}>Status</Text>
              <SubscriptionBadge status={subscriptionStatus} />
            </View>
            {(subscriptionStatus === 'expired' || subscriptionStatus === 'none') && (
              <Pressable
                style={styles.upgradeRow}
                onPress={() => router.push('/paywall')}
                accessibilityRole="button"
                accessibilityLabel="Manage subscription"
              >
                <Text style={styles.upgradeText}>Manage subscription</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.primary} />
              </Pressable>
            )}
          </View>

          <View style={styles.signOutSection}>
            <Button
              label={signingOut ? 'Signing out...' : 'Sign out'}
              onPress={handleSignOut}
              variant="ghost"
              disabled={signingOut || deleting}
              fullWidth
            />
            <Text style={styles.signOutHint}>
              Signing out will end your session. Your mood data will remain on this device.
            </Text>
          </View>

          <View style={styles.dangerSection}>
            <Text style={styles.dangerHeader} accessibilityRole="header">DANGER ZONE</Text>
            <View style={styles.dangerCard}>
              <Pressable
                style={styles.deleteRow}
                onPress={handleDeleteAccount}
                disabled={deleting}
                accessibilityRole="button"
                accessibilityLabel="Delete account"
              >
                <View style={styles.deleteTextGroup}>
                  <Text style={styles.deleteTitle}>
                    {deleting ? 'Deleting...' : 'Delete Account'}
                  </Text>
                  <Text style={styles.deleteSubtitle}>Permanently removes all your data</Text>
                </View>
                {deleting
                  ? <ActivityIndicator size="small" color={colors.error} />
                  : <Ionicons name="trash-outline" size={20} color={colors.error} />}
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </Screen>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function SubscriptionBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; style: object; textStyle: object }> = {
    trial:   { label: 'Free trial', style: styles.badgeTrial,   textStyle: styles.badgeTrialText },
    active:  { label: 'Active',     style: styles.badgeActive,  textStyle: styles.badgeActiveText },
    expired: { label: 'Expired',    style: styles.badgeExpired, textStyle: styles.badgeExpiredText },
    none:    { label: 'No plan',    style: styles.badgeNone,    textStyle: styles.badgeNoneText },
  };
  const { label, style, textStyle } = config[status] ?? config.none;
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
