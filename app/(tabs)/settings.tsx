import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Switch,
  TextInput,
  StyleSheet,
  Linking,
  Platform,
  LayoutAnimation,
  UIManager,
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
import { colors, typography, spacing, radius, shadows } from '@constants/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const SLOT_KEYS: { slot: NotificationSlot; i18nKey: 'morning' | 'afternoon' | 'evening' | 'preSleep' }[] = [
  { slot: 'morning', i18nKey: 'morning' },
  { slot: 'afternoon', i18nKey: 'afternoon' },
  { slot: 'evening', i18nKey: 'evening' },
  { slot: 'pre-sleep', i18nKey: 'preSleep' },
];

const LANGUAGE_OPTIONS: LanguagePref[] = ['system', 'en', 'es'];

type SectionKey = 'reminderTimes' | 'customTimes' | 'streakReminder' | 'smartTiming' | 'language' | 'about';

interface AccordionSectionProps {
  title: string;
  sectionKey: SectionKey;
  expanded: boolean;
  onToggle: (key: SectionKey) => void;
  children: React.ReactNode;
}

function AccordionSection({ title, sectionKey, expanded, onToggle, children }: AccordionSectionProps) {
  return (
    <View style={styles.section}>
      <SpringPressable
        style={[styles.accordionHeader, expanded && styles.accordionHeaderOpen]}
        onPress={() => onToggle(sectionKey)}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={title}
      >
        <Text style={styles.accordionTitle}>{title}</Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textSecondary}
        />
      </SpringPressable>
      {expanded && <View>{children}</View>}
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { t } = useTranslation('screens');
  const { onScroll } = useScreenScroll();
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    reminderTimes: false,
    customTimes: false,
    streakReminder: false,
    smartTiming: false,
    language: false,
    about: false,
  });

  const toggleSection = useCallback((key: SectionKey) => {
    LayoutAnimation.configureNext(LayoutAnimation.create(220, 'easeInEaseOut', 'opacity'));
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const session = useSessionStore((s) => s.session);
  const isAnonymous = !session || session.authStatus === 'anonymous';

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

      {/* ── Account row (always visible, single nav) ─────────────────── */}
      <View style={styles.section}>
        <SpringPressable
          style={styles.accordionHeader}
          onPress={() => router.push('/account' as Href)}
          accessibilityRole="button"
          accessibilityLabel={t('settings.account.a11y')}
        >
          <View style={styles.rowText}>
            <Text style={styles.accordionTitle}>{t('settings.account.label')}</Text>
            <Text style={styles.rowHint}>
              {isAnonymous ? t('settings.account.notSignedIn') : t('settings.account.manage')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </SpringPressable>
      </View>

      {/* ── Notification permission banner ──────────────────────────── */}
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

      {/* ── Reminder Times ────────────────────────────────────────────── */}
      <AccordionSection
        title={t('settings.sections.reminderTimes')}
        sectionKey="reminderTimes"
        expanded={openSections.reminderTimes}
        onToggle={toggleSection}
      >
        {slotRows.map((row) => {
          const isOn = selectedSlots.includes(row.slot);
          return (
            <View key={row.slot} style={styles.row}>
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, isDisabled && styles.textDisabled]}>
                  {row.label}
                </Text>
                <Text style={[styles.rowHint, isDisabled && styles.textDisabled]}>
                  {row.hint}
                </Text>
              </View>
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
          );
        })}
      </AccordionSection>

      {/* ── Custom Reminder Times ────────────────────────────────────── */}
      <AccordionSection
        title={t('settings.sections.customTimes')}
        sectionKey="customTimes"
        expanded={openSections.customTimes}
        onToggle={toggleSection}
      >
        {slotRows.filter((r) => selectedSlots.includes(r.slot)).map((row) => (
          <View key={row.slot} style={styles.row}>
            <View style={styles.rowText}>
              <Text style={[styles.rowLabel, isDisabled && styles.textDisabled]}>
                {row.label}
              </Text>
              <Text style={[styles.rowHint, isDisabled && styles.textDisabled]}>
                {customTimes[row.slot]
                  ? t('settings.customTimes.setTo', { time: customTimes[row.slot] })
                  : row.hint}
              </Text>
            </View>
            <TextInput
              style={[styles.timeInput, isDisabled && styles.textDisabled]}
              defaultValue={customTimes[row.slot] ?? ''}
              placeholder={t('settings.customTimes.placeholder')}
              placeholderTextColor={colors.textDisabled}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
              editable={!isDisabled}
              onEndEditing={(e) => handleCustomTimeChange(row.slot, e.nativeEvent.text)}
              accessibilityLabel={t('settings.customTimes.inputA11y', { label: row.label })}
              accessibilityHint={t('settings.customTimes.inputA11yHint')}
            />
          </View>
        ))}
        {selectedSlots.length === 0 && (
          <View style={styles.row}>
            <Text style={[styles.rowHint, { flex: 1 }]}>
              {t('settings.customTimes.empty')}
            </Text>
          </View>
        )}
      </AccordionSection>

      {/* ── Streak Reminder ──────────────────────────────────────────── */}
      <AccordionSection
        title={t('settings.sections.streakReminder')}
        sectionKey="streakReminder"
        expanded={openSections.streakReminder}
        onToggle={toggleSection}
      >
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
      </AccordionSection>

      {/* ── Smart Timing — Pro feature ───────────────────────────────── */}
      <AccordionSection
        title={t('settings.sections.smartTiming')}
        sectionKey="smartTiming"
        expanded={openSections.smartTiming}
        onToggle={toggleSection}
      >
        {isPro ? (
          <>
            <View style={styles.row}>
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
            {adaptiveEnabled && slotRows.filter((r) => selectedSlots.includes(r.slot)).map((row) => {
              const adaptiveTime = adaptiveTimes[row.slot];
              if (!adaptiveTime) return null;
              const isOverridden = !!customTimes[row.slot];
              return (
                <View key={row.slot} style={styles.row}>
                  <View style={styles.rowText}>
                    <Text style={styles.rowLabel}>{row.label}</Text>
                    <Text style={styles.rowHint}>
                      {isOverridden
                        ? t('settings.smartTiming.overridden', { time: adaptiveTime })
                        : t('settings.smartTiming.smartTime', { time: adaptiveTime })}
                    </Text>
                  </View>
                  {!isOverridden && (
                    <View style={styles.activeBadge}>
                      <Text style={styles.activeBadgeText}>{t('settings.smartTiming.active')}</Text>
                    </View>
                  )}
                </View>
              );
            })}
            {adaptiveEnabled && Object.keys(adaptiveTimes).length === 0 && (
              <View style={styles.row}>
                <Text style={[styles.rowHint, { flex: 1 }]}>
                  {t('settings.smartTiming.needsMore')}
                </Text>
              </View>
            )}
          </>
        ) : (
          <SpringPressable
            onPress={() => router.push('/paywall' as any)}
            accessibilityRole="button"
            accessibilityLabel={t('settings.smartTiming.lockedA11y')}
          >
            <View style={styles.proLockRow}>
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>{t('settings.smartTiming.label')}</Text>
                <Text style={styles.rowHint}>{t('settings.smartTiming.lockedHint')}</Text>
              </View>
              <View style={styles.proLockBadge}>
                <Text style={styles.proLockBadgeText}>{t('settings.smartTiming.proBadge')}</Text>
              </View>
            </View>
          </SpringPressable>
        )}
      </AccordionSection>

      {/* ── Language picker ──────────────────────────────────────────── */}
      <AccordionSection
        title={t('settings.sections.language')}
        sectionKey="language"
        expanded={openSections.language}
        onToggle={toggleSection}
      >
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>{t('settings.language.label')}</Text>
            <Text style={styles.rowHint}>{t('settings.language.hint')}</Text>
          </View>
        </View>
        {LANGUAGE_OPTIONS.map((option) => {
          const isSelected = language === option;
          const optionLabel = t(`settings.language.options.${option}`);
          return (
            <SpringPressable
              key={option}
              style={styles.row}
              onPress={() => setLanguage(option)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={t('settings.language.optionA11y', { label: optionLabel })}
            >
              <Text style={styles.rowLabel}>{optionLabel}</Text>
              {isSelected && (
                <Ionicons name="checkmark" size={20} color={colors.accent} />
              )}
            </SpringPressable>
          );
        })}
      </AccordionSection>

      {/* ── About section ────────────────────────────────────────────── */}
      <AccordionSection
        title={t('settings.sections.about')}
        sectionKey="about"
        expanded={openSections.about}
        onToggle={toggleSection}
      >
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
          style={styles.row}
          onPress={handleManageSubscription}
          accessibilityRole="link"
          accessibilityLabel={t('settings.about.manageSubscriptionA11y')}
        >
          <Text style={styles.rowLabel}>{t('settings.about.manageSubscription')}</Text>
          <Ionicons name="open-outline" size={18} color={colors.textSecondary} />
        </SpringPressable>
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
          style={styles.row}
          onPress={() => openSupportFeedback('settings')}
          accessibilityRole="button"
          accessibilityLabel={t('settings.about.feedbackA11y')}
        >
          <Text style={styles.rowLabel}>{t('settings.about.feedback')}</Text>
          <Ionicons name="mail-outline" size={18} color={colors.textSecondary} />
        </SpringPressable>
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
          style={styles.row}
          onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
          accessibilityRole="link"
          accessibilityLabel={t('settings.about.privacyA11y')}
        >
          <Text style={styles.rowLabel}>{t('settings.about.privacy')}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </SpringPressable>
      </AccordionSection>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenTitle: {
    fontSize: typography.sizes.xxl,
    fontFamily: typography.fonts.display,
    color: colors.textInverse,
    letterSpacing: -0.6,
    lineHeight: 32,
  },
  heroCard: {
    ...shadows.md,
    borderRadius: 22,
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
  permissionBanner: {
    backgroundColor: colors.errorLight,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: '#FFD6D1',
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
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
  },
  accordionHeaderOpen: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  accordionTitle: {
    fontSize: typography.sizes.body,
    fontFamily: typography.fonts.ui,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    letterSpacing: 0.1,
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
  rowText: {
    flex: 1,
    marginRight: spacing.md,
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
  timeInput: {
    width: 64,
    borderWidth: 1.5,
    borderColor: '#C8DCFF',
    borderRadius: radius.md,
    paddingVertical: 6,
    paddingHorizontal: 10,
    fontSize: typography.sizes.sm,
    color: colors.text,
    backgroundColor: '#F7FBFF',
    textAlign: 'center',
  },
  proLockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
  },
  proLockBadge: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  proLockBadgeText: {
    fontSize: typography.sizes.xs,
    color: colors.textInverse,
    fontWeight: typography.weights.semibold,
  },
  activeBadge: {
    backgroundColor: '#E8F5E9',
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#A5D6A7',
  },
  activeBadgeText: {
    fontSize: typography.sizes.xs,
    color: '#388E3C',
    fontWeight: typography.weights.semibold,
  },
});
