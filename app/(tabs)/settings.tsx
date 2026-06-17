import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Switch,
  TextInput,
  StyleSheet,
  Linking,
  Platform,
  Image,
} from 'react-native';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen, SparkleOverlay, Shiba } from '@components/index';
import { SpringPressable } from '@components/SpringPressable';
import { useScreenScroll } from '@hooks/useScreenScroll';
import { useNotificationPrefsStore } from '@store/notificationPrefsStore';
import { useSessionStore } from '@store/sessionStore';
import { useAchievementsStore } from '@store/index';
import { ACHIEVEMENT_DEFINITIONS, ACHIEVEMENT_BADGE_IMAGES } from '@lib/achievements';
import { useUiPrefsStore, type LanguagePref } from '@store/uiPrefsStore';
import { scheduleSlotNotifications } from '@lib/notifications';
import { restorePurchases } from '@lib/revenuecat';
import { syncSubscriptionStatusToSupabase } from '@lib/profileSync';
import { requestStoreReviewDirect, openSupportFeedback } from '@lib/reviewPrompt';
import type { NotificationSlot } from '@models/index';
import {
  PRIVACY_POLICY_URL,
  TERMS_OF_USE_URL,
  MANAGE_SUBSCRIPTION_URL_IOS,
  MANAGE_SUBSCRIPTION_URL_ANDROID,
} from '@constants/legal';
import { typography, spacing, radius, shadows } from '@constants/theme';
import { useTheme, type ThemePalette } from '@theme/ThemeContext';
import { useThemedStyles } from '@hooks/useThemedStyles';

const SLOT_KEYS: { slot: NotificationSlot; i18nKey: 'morning' | 'afternoon' | 'evening' | 'preSleep' }[] = [
  { slot: 'morning', i18nKey: 'morning' },
  { slot: 'afternoon', i18nKey: 'afternoon' },
  { slot: 'evening', i18nKey: 'evening' },
  { slot: 'pre-sleep', i18nKey: 'preSleep' },
];

// Default fire times per slot (24h) — shown as the time-chip placeholder when the
// user hasn't set a custom time and smart timing isn't driving the slot.
const DEFAULT_SLOT_TIME: Record<NotificationSlot, string> = {
  morning: '09:00',
  afternoon: '14:00',
  evening: '19:00',
  'pre-sleep': '22:00',
};

const LANGUAGE_OPTIONS: LanguagePref[] = ['system', 'en', 'es'];

type TabKey = 'reminders' | 'general' | 'about';
const TABS: TabKey[] = ['reminders', 'general', 'about'];

export default function SettingsScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { t } = useTranslation('screens');
  const { onScroll } = useScreenScroll();
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [activeTab, setActiveTab] = useState<TabKey>('reminders');

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const session = useSessionStore((s) => s.session);
  const isAnonymous = !session || session.authStatus === 'anonymous';

  const unlockedIds = useAchievementsStore((s) => s.unlockedIds);
  const unlockedCount = ACHIEVEMENT_DEFINITIONS.filter((d) => unlockedIds.includes(d.id)).length;

  const language = useUiPrefsStore((s) => s.language);
  const setLanguage = useUiPrefsStore((s) => s.setLanguage);

  const slotRows = SLOT_KEYS.map(({ slot, i18nKey }) => ({
    slot,
    label: t(`settings.slots.${i18nKey}.label`),
    hint: t(`settings.slots.${i18nKey}.hint`),
  }));

  const selectedSlots = useNotificationPrefsStore((s) => s.selectedSlots);
  const streakNudgeEnabled = useNotificationPrefsStore((s) => s.streakNudgeEnabled);
  const customTimes = useNotificationPrefsStore((s) => s.customTimes);
  const adaptiveTimes = useNotificationPrefsStore((s) => s.adaptiveTimes);
  const adaptiveEnabled = useNotificationPrefsStore((s) => s.adaptiveEnabled);
  const { setSlots, setStreakNudgeEnabled, setPermissionGranted, setCustomTime, clearCustomTime, toggleAdaptive } = useNotificationPrefsStore.getState();

  const isPro = session?.subscriptionStatus === 'trial' || session?.subscriptionStatus === 'active';

  const appVersion = Constants.expoConfig?.version ?? '—';

  // Re-check permission on every screen focus — critical for detecting changes
  // after user returns from OS Settings via Linking.openSettings().
  useFocusEffect(
    useCallback(() => {
      Notifications.getPermissionsAsync().then((result) => {
        const status = result.granted ? 'granted' : result.canAskAgain ? 'undetermined' : 'denied';
        setPermissionStatus(status);
        setPermissionGranted(result.granted);
      });
    }, [])
  );

  const isDisabled = permissionStatus !== 'granted';

  const reschedule = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const {
        selectedSlots: slots, streakNudgeEnabled: nudge, customTimes: times,
        adaptiveTimes: aTimes, adaptiveEnabled: aEnabled,
      } = useNotificationPrefsStore.getState();
      try {
        await scheduleSlotNotifications(slots, nudge, times, aEnabled ? aTimes : {});
      } catch (error) {
        if (__DEV__) {
          console.error('[kibun:notif] Reschedule failed:', error);
        }
      }
    }, 300);
  }, []);

  const handleSlotToggle = (slot: NotificationSlot) => {
    const current = useNotificationPrefsStore.getState().selectedSlots;
    const updated = current.includes(slot)
      ? current.filter((s) => s !== slot)
      : [...current, slot];
    setSlots(updated);
    reschedule();
  };

  /** Validates HH:MM format and saves or clears the custom time for a slot. */
  const handleCustomTimeChange = (slot: NotificationSlot, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      clearCustomTime(slot);
      reschedule();
      return;
    }
    const valid = /^([01]\d|2[0-3]):([0-5]\d)$/.test(trimmed);
    if (valid) {
      setCustomTime(slot, trimmed);
      reschedule();
    }
  };

  const handleStreakToggle = (value: boolean) => {
    setStreakNudgeEnabled(value);
    reschedule();
  };

  const [restoreState, setRestoreState] = useState<'idle' | 'restoring' | 'restored' | 'none'>('idle');

  const handleRestore = useCallback(async () => {
    if (restoreState === 'restoring') return;
    setRestoreState('restoring');
    const status = await restorePurchases();
    if (status !== 'none') {
      useSessionStore.getState().setSubscriptionStatus(status);
      if (session?.userId) {
        syncSubscriptionStatusToSupabase(session.userId, status);
      }
      setRestoreState('restored');
    } else {
      setRestoreState('none');
    }
  }, [restoreState, session?.userId]);

  const handleManageSubscription = () => {
    const url = Platform.OS === 'ios' ? MANAGE_SUBSCRIPTION_URL_IOS : MANAGE_SUBSCRIPTION_URL_ANDROID;
    Linking.openURL(url);
  };

  return (
    <Screen scrollable={true} layout="wide" onScroll={onScroll}>
      <LinearGradient
        colors={[colors.skyStart, colors.skyEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <SparkleOverlay count={16} />
        <View style={styles.heroTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.screenTitle} accessibilityRole="header">
              {t('settings.hero.title')}
            </Text>
            <Text style={styles.heroSubtitle}>{t('settings.hero.subtitle')}</Text>
          </View>
          <Shiba variant="happy" size={96} />
        </View>
      </LinearGradient>

      {/* ── Account (always visible nav) ─────────────────────────────── */}
      <View style={styles.section}>
        <SpringPressable
          style={[styles.row, styles.rowLast]}
          onPress={() => router.push('/account' as Href)}
          accessibilityRole="button"
          accessibilityLabel={t('settings.account.a11y')}
        >
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>{t('settings.account.label')}</Text>
            <Text style={styles.rowHint}>
              {isAnonymous ? t('settings.account.notSignedIn') : t('settings.account.manage')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </SpringPressable>
      </View>

      {/* ── Tab selector ─────────────────────────────────────────────── */}
      <View style={styles.tabBar} accessibilityRole="tablist">
        {TABS.map((tab) => {
          const selected = activeTab === tab;
          return (
            <SpringPressable
              key={tab}
              style={[styles.tab, selected && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={t(`settings.tabs.${tab}`)}
            >
              <Text style={[styles.tabLabel, selected && styles.tabLabelActive]}>
                {t(`settings.tabs.${tab}`)}
              </Text>
            </SpringPressable>
          );
        })}
      </View>

      {/* ════════════ REMINDERS TAB ════════════ */}
      {activeTab === 'reminders' && (
        <>
          {isDisabled && (
            <SpringPressable
              style={styles.permissionBanner}
              onPress={() => Linking.openSettings()}
              accessibilityRole="button"
              accessibilityHint={t('settings.permissionBanner.a11yHint')}
            >
              <Text style={styles.bannerText}>{t('settings.permissionBanner.text')}</Text>
              <Text style={styles.bannerLink}>{t('settings.permissionBanner.link')}</Text>
            </SpringPressable>
          )}

          <Text style={styles.groupHeader}>{t('settings.groups.dailyReminders')}</Text>
          <View style={styles.section}>
            {slotRows.map((row, i) => {
              const isOn = selectedSlots.includes(row.slot);
              const isLast = i === slotRows.length - 1;
              const adaptiveActive = isPro && adaptiveEnabled && !!adaptiveTimes[row.slot];
              const hasCustom = !!customTimes[row.slot];
              const effectiveTime =
                customTimes[row.slot] ??
                (adaptiveActive ? adaptiveTimes[row.slot]! : DEFAULT_SLOT_TIME[row.slot]);
              const showAuto = adaptiveActive && !hasCustom;
              return (
                <View key={row.slot} style={[styles.row, isLast && styles.rowLast]}>
                  <View style={styles.rowText}>
                    <Text style={[styles.rowLabel, isDisabled && styles.textDisabled]}>
                      {row.label}
                    </Text>
                    {!isOn && (
                      <Text style={[styles.rowHint, isDisabled && styles.textDisabled]}>
                        {row.hint}
                      </Text>
                    )}
                  </View>
                  <View style={styles.rowRight}>
                    {isOn && (
                      <View style={styles.timeChip}>
                        <TextInput
                          style={[styles.timeChipInput, isDisabled && styles.textDisabled]}
                          defaultValue={customTimes[row.slot] ?? ''}
                          placeholder={effectiveTime}
                          placeholderTextColor={colors.textDisabled}
                          keyboardType="numbers-and-punctuation"
                          maxLength={5}
                          editable={!isDisabled}
                          onEndEditing={(e) => handleCustomTimeChange(row.slot, e.nativeEvent.text)}
                          accessibilityLabel={t('settings.customTimes.inputA11y', { label: row.label })}
                          accessibilityHint={t('settings.customTimes.inputA11yHint')}
                        />
                        {showAuto ? (
                          <Text style={styles.autoTag}>{t('settings.smartTiming.auto')}</Text>
                        ) : (
                          <Ionicons name="pencil" size={11} color={colors.textSecondary} />
                        )}
                      </View>
                    )}
                    <Switch
                      value={isOn}
                      onValueChange={() => handleSlotToggle(row.slot)}
                      disabled={isDisabled}
                      trackColor={{ false: colors.border, true: colors.accent }}
                      accessibilityRole="switch"
                      accessibilityLabel={t('settings.reminders.rowA11y', { label: row.label, hint: row.hint })}
                      accessibilityState={{ checked: isOn, disabled: isDisabled }}
                    />
                  </View>
                </View>
              );
            })}
          </View>

          <Text style={styles.groupHeader}>{t('settings.groups.more')}</Text>
          <View style={styles.section}>
            {/* Streak nudge */}
            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, isDisabled && styles.textDisabled]}>
                  {t('settings.streak.label')}
                </Text>
                <Text style={[styles.rowHint, isDisabled && styles.textDisabled]}>
                  {t('settings.streak.hint')}
                </Text>
              </View>
              <Switch
                value={streakNudgeEnabled}
                onValueChange={handleStreakToggle}
                disabled={isDisabled}
                trackColor={{ false: colors.border, true: colors.accent }}
                accessibilityRole="switch"
                accessibilityLabel={t('settings.streak.a11y')}
                accessibilityState={{ checked: streakNudgeEnabled, disabled: isDisabled }}
              />
            </View>

            {/* Smart timing (Pro) */}
            {isPro ? (
              <View style={[styles.row, styles.rowLast]}>
                <View style={styles.rowText}>
                  <Text style={[styles.rowLabel, isDisabled && styles.textDisabled]}>
                    {t('settings.smartTiming.label')}
                  </Text>
                  <Text style={[styles.rowHint, isDisabled && styles.textDisabled]}>
                    {t('settings.smartTiming.hint')}
                  </Text>
                </View>
                <Switch
                  value={adaptiveEnabled}
                  onValueChange={(v) => { toggleAdaptive(v); reschedule(); }}
                  disabled={isDisabled}
                  trackColor={{ false: colors.border, true: colors.accent }}
                  accessibilityRole="switch"
                  accessibilityLabel={t('settings.smartTiming.a11y')}
                  accessibilityState={{ checked: adaptiveEnabled, disabled: isDisabled }}
                />
              </View>
            ) : (
              <SpringPressable
                style={[styles.row, styles.rowLast]}
                onPress={() => router.push('/paywall' as any)}
                accessibilityRole="button"
                accessibilityLabel={t('settings.smartTiming.lockedA11y')}
              >
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>{t('settings.smartTiming.label')}</Text>
                  <Text style={styles.rowHint}>{t('settings.smartTiming.lockedHint')}</Text>
                </View>
                <View style={styles.proLockBadge}>
                  <Text style={styles.proLockBadgeText}>{t('settings.smartTiming.proBadge')}</Text>
                </View>
              </SpringPressable>
            )}
          </View>
          {isPro && adaptiveEnabled && Object.keys(adaptiveTimes).length === 0 && (
            <Text style={styles.groupFooter}>{t('settings.smartTiming.needsMore')}</Text>
          )}
        </>
      )}

      {/* ════════════ GENERAL TAB ════════════ */}
      {activeTab === 'general' && (
        <>
          <Text style={styles.groupHeader}>{t('settings.groups.achievements')}</Text>
          <View style={styles.section}>
            <View style={styles.achievementsGrid}>
              {ACHIEVEMENT_DEFINITIONS.map((def) => {
                const unlocked = unlockedIds.includes(def.id);
                return (
                  <View
                    key={def.id}
                    style={styles.achievementItem}
                    accessibilityLabel={t('home.achievementA11y', { label: def.label, description: def.description })}
                  >
                    <Image
                      source={ACHIEVEMENT_BADGE_IMAGES[def.id]}
                      style={[styles.achievementBadge, !unlocked && styles.achievementBadgeLocked]}
                    />
                    <Text style={[styles.achievementLabel, !unlocked && styles.textDisabled]} numberOfLines={1}>
                      {def.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
          <Text style={styles.groupFooter}>
            {t('settings.achievements.progress', { count: unlockedCount, total: ACHIEVEMENT_DEFINITIONS.length })}
          </Text>

          <Text style={styles.groupHeader}>{t('settings.sections.language')}</Text>
          <View style={styles.section}>
            {LANGUAGE_OPTIONS.map((option, i) => {
              const isSelected = language === option;
              const optionLabel = t(`settings.language.options.${option}`);
              return (
                <SpringPressable
                  key={option}
                  style={[styles.row, i === LANGUAGE_OPTIONS.length - 1 && styles.rowLast]}
                  onPress={() => setLanguage(option)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={t('settings.language.optionA11y', { label: optionLabel })}
                >
                  <Text style={styles.rowLabel}>{optionLabel}</Text>
                  {isSelected && <Ionicons name="checkmark" size={20} color={colors.accent} />}
                </SpringPressable>
              );
            })}
          </View>
          <Text style={styles.groupFooter}>{t('settings.language.hint')}</Text>
        </>
      )}

      {/* ════════════ ABOUT TAB ════════════ */}
      {activeTab === 'about' && (
        <>
          <View style={styles.section}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{t('settings.about.version')}</Text>
              <Text style={styles.rowHint}>{appVersion}</Text>
            </View>
            <SpringPressable
              style={styles.row}
              onPress={handleRestore}
              accessibilityRole="button"
              accessibilityLabel={t('settings.about.restoreA11y')}
              disabled={restoreState === 'restoring'}
            >
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>{t('settings.about.restore')}</Text>
                {restoreState === 'restored' && (
                  <Text style={styles.rowHint}>{t('settings.about.restored')}</Text>
                )}
                {restoreState === 'none' && (
                  <Text style={styles.rowHint}>{t('settings.about.restoreNone')}</Text>
                )}
              </View>
              <Ionicons
                name={restoreState === 'restoring' ? 'sync' : 'refresh'}
                size={18}
                color={colors.textSecondary}
              />
            </SpringPressable>
            <SpringPressable
              style={[styles.row, styles.rowLast]}
              onPress={handleManageSubscription}
              accessibilityRole="link"
              accessibilityLabel={t('settings.about.manageSubscriptionA11y')}
            >
              <Text style={styles.rowLabel}>{t('settings.about.manageSubscription')}</Text>
              <Ionicons name="open-outline" size={18} color={colors.textSecondary} />
            </SpringPressable>
          </View>

          <View style={styles.section}>
            <SpringPressable
              style={styles.row}
              onPress={() => requestStoreReviewDirect('settings')}
              accessibilityRole="button"
              accessibilityLabel={t('settings.about.rateA11y')}
            >
              <Text style={styles.rowLabel}>{t('settings.about.rate')}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </SpringPressable>
            <SpringPressable
              style={[styles.row, styles.rowLast]}
              onPress={() => openSupportFeedback('settings')}
              accessibilityRole="button"
              accessibilityLabel={t('settings.about.feedbackA11y')}
            >
              <Text style={styles.rowLabel}>{t('settings.about.feedback')}</Text>
              <Ionicons name="mail-outline" size={18} color={colors.textSecondary} />
            </SpringPressable>
          </View>

          <Text style={styles.groupHeader}>{t('settings.groups.legal')}</Text>
          <View style={styles.section}>
            <SpringPressable
              style={styles.row}
              onPress={() => Linking.openURL(TERMS_OF_USE_URL)}
              accessibilityRole="link"
              accessibilityLabel={t('settings.about.termsA11y')}
            >
              <Text style={styles.rowLabel}>{t('settings.about.terms')}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </SpringPressable>
            <SpringPressable
              style={[styles.row, styles.rowLast]}
              onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
              accessibilityRole="link"
              accessibilityLabel={t('settings.about.privacyA11y')}
            >
              <Text style={styles.rowLabel}>{t('settings.about.privacy')}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </SpringPressable>
          </View>
        </>
      )}
    </Screen>
  );
}

const createStyles = (colors: ThemePalette) => StyleSheet.create({
  screenTitle: {
    fontSize: typography.sizes.xxl,
    fontFamily: typography.fonts.display,
    color: colors.textInverse,
    letterSpacing: -0.6,
    lineHeight: 32,
  },
  heroCard: {
    ...shadows.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.sparkle,
    marginTop: 2,
  },
  // ── Tab selector ──────────────────────────────────────────────────
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 4,
    gap: 4,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    ...shadows.sm,
    backgroundColor: colors.surfaceElevated,
  },
  tabLabel: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.ui,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
  },
  tabLabelActive: {
    color: colors.text,
    fontWeight: typography.weights.semibold,
  },
  // ── Groups ────────────────────────────────────────────────────────
  groupHeader: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.ui,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
    letterSpacing: 0.8,
    marginLeft: spacing.sm,
    marginBottom: spacing.xs,
    marginTop: spacing.xs,
  },
  groupFooter: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginHorizontal: spacing.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    lineHeight: 16,
  },
  permissionBanner: {
    backgroundColor: colors.errorLight,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.errorBorder,
  },
  bannerText: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    marginBottom: 2,
  },
  bannerLink: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },
  section: {
    ...shadows.sm,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowText: {
    flex: 1,
    marginRight: spacing.md,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowLabel: {
    fontSize: typography.sizes.body,
    fontFamily: typography.fonts.ui,
    color: colors.text,
  },
  rowHint: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: 1,
  },
  textDisabled: {
    color: colors.textDisabled,
  },
  // ── Time chip (merged into each reminder slot row) ────────────────
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 70,
    justifyContent: 'flex-end',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: colors.surface,
  },
  timeChipInput: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    padding: 0,
    minWidth: 38,
    textAlign: 'right',
  },
  autoTag: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.accent,
  },
  proLockBadge: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  // ── Achievements grid ─────────────────────────────────────────────
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  achievementItem: {
    width: '25%',
    alignItems: 'center',
    gap: 6,
  },
  achievementBadge: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
  },
  achievementBadgeLocked: {
    opacity: 0.25,
  },
  achievementLabel: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.ui,
    color: colors.text,
    textAlign: 'center',
  },
  proLockBadgeText: {
    fontSize: typography.sizes.xs,
    color: colors.textInverse,
    fontWeight: typography.weights.semibold,
  },
});
