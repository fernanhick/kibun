import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { SparkleOverlay } from './SparkleOverlay';
import { typography, spacing, radius, shadows, motion } from '@constants/theme';
import { useThemedStyles } from '@hooks/useThemedStyles';
import { useReducedMotion } from '@hooks/useReducedMotion';
import { useDeferredPresentation } from '@hooks/useDeferredPresentation';
import type { ThemePalette } from '@theme/ThemeContext';
import { achievementEvents, ACHIEVEMENT_BADGE_IMAGES } from '@lib/achievements';
import { maybePromptReview } from '@lib/reviewPrompt';
import { haptics } from '@lib/haptics';
import type { AchievementId } from '@models/index';

// Shorter than the review gate's: this is the reward, so it should feel like a
// consequence of the check-in rather than an unrelated interruption.
const PRESENT_DELAY_MS = 700;

// Generous, because unlike a rating ask a badge is still worth showing a little
// later — but not so long that it lands in an unrelated session.
const PENDING_TTL_MS = 5 * 60 * 1000;

/**
 * The visible half of an achievement unlock. Until this existed, unlocking one
 * produced no feedback at all — badges only ever appeared, already earned, in
 * the Settings grid — while a rating ask fired 1.5s later off a reward the user
 * had never been shown.
 *
 * Dismissing it is what releases that ask, so the order is now reward, then
 * acknowledge, then ask.
 */
export function AchievementCelebration() {
  const { t } = useTranslation('screens');
  const styles = useThemedStyles(createStyles);
  const reducedMotion = useReducedMotion();

  const [shown, setShown] = useState<AchievementId[] | null>(null);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);

  const present = useCallback((ids: AchievementId[]) => {
    haptics.success();
    setShown(ids);
  }, []);

  const { hasPending } = useDeferredPresentation<AchievementId[]>({
    subscribe: achievementEvents.subscribe,
    onPresent: present,
    delayMs: PRESENT_DELAY_MS,
    ttlMs: PENDING_TTL_MS,
    // Hold a second unlock rather than swapping the card out from under the user.
    enabled: shown === null,
  });

  useEffect(() => {
    if (!shown) return;
    opacity.value = 0;
    opacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) });

    if (reducedMotion) {
      // Apple's Reduce Motion substitutes cross-fades for movement rather than
      // removing the transition, so hold the fade and drop only the spring.
      scale.value = 1;
      return;
    }
    scale.value = 0.9;
    scale.value = withSpring(1, motion.spring.celebrate);
  }, [shown, opacity, scale, reducedMotion]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const dismiss = () => {
    setShown(null);
    // The reward has landed and been acknowledged — this is the moment the
    // rating ask was always meant to follow. The gate decides whether it earns
    // one; most of the time it will not.
    //
    // Unless another badge is already queued behind this one, in which case the
    // ask would surface on top of it. Skipping is free: the next delight moment
    // comes around soon enough.
    if (!hasPending) maybePromptReview('achievement_unlock');
  };

  const primary = shown?.[0] ?? null;
  const extra = shown ? shown.length - 1 : 0;
  const label = primary ? t(`achievements.${primary}.label`) : '';
  const description = primary ? t(`achievements.${primary}.description`) : '';

  return (
    <Modal
      visible={primary !== null}
      transparent
      animationType="none"
      onRequestClose={dismiss}
      statusBarTranslucent
    >
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={dismiss}
          accessibilityLabel={t('achievementUnlocked.cta')}
        />
        <Animated.View
          style={[styles.card, cardStyle]}
          accessibilityRole="alert"
          accessibilityLabel={t('home.achievementA11y', { label, description })}
        >
          {!reducedMotion && <SparkleOverlay variant="card" count={5} />}
          {primary && (
            <Image
              source={ACHIEVEMENT_BADGE_IMAGES[primary]}
              style={styles.badge}
              contentFit="contain"
            />
          )}
          <Text style={styles.kicker}>{t('achievementUnlocked.title')}</Text>
          <Text style={styles.title} accessibilityRole="header">{label}</Text>
          <Text style={styles.description}>{description}</Text>
          {extra > 0 && (
            <Text style={styles.more}>{t('achievementUnlocked.more', { count: extra })}</Text>
          )}

          <Pressable
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
            onPress={dismiss}
            accessibilityRole="button"
            accessibilityLabel={t('achievementUnlocked.cta')}
          >
            <Text style={styles.primaryBtnText}>{t('achievementUnlocked.cta')}</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const createStyles = (colors: ThemePalette) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.card,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    alignItems: 'center',
    overflow: 'hidden',
    ...shadows.lg,
  },
  badge: {
    width: 112,
    height: 112,
    marginBottom: spacing.sm,
  },
  kicker: {
    fontFamily: typography.fonts.ui,
    fontSize: typography.sizes.sm,
    color: colors.primary,
    textAlign: 'center',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: typography.fonts.display,
    fontSize: typography.sizes.xl,
    letterSpacing: -0.4,
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  description: {
    fontFamily: typography.fonts.body,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  more: {
    fontFamily: typography.fonts.body,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: -spacing.md,
    marginBottom: spacing.lg,
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontFamily: typography.fonts.ui,
    fontSize: typography.sizes.body,
    color: colors.textInverse,
  },
  pressed: {
    opacity: 0.85,
  },
});
