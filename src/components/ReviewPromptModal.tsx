import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import * as StoreReview from 'expo-store-review';
import { Shiba } from './Shiba';
import { colors, typography, spacing, radius, shadows } from '@constants/theme';
import { useReviewPromptStore } from '@store/reviewPromptStore';
import {
  reviewPromptEvents,
  openSupportFeedback,
  type ReviewPromptSource,
} from '@lib/reviewPrompt';
import { trackEvent } from '@lib/analytics';

export function ReviewPromptModal() {
  const [visible, setVisible] = useState(false);
  const sourceRef = useRef<ReviewPromptSource>('achievement_unlock');
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    const unsubscribe = reviewPromptEvents.subscribe((source) => {
      sourceRef.current = source;
      setVisible(true);
      trackEvent('review_prompt_shown', { source });
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!visible) return;
    opacity.setValue(0);
    scale.setValue(0.9);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 18,
        bounciness: 8,
      }),
    ]).start();
  }, [visible, opacity, scale]);

  const close = () => setVisible(false);

  const handleHappy = async () => {
    const source = sourceRef.current;
    const { recordAsked, markRatedHint } = useReviewPromptStore.getState();
    recordAsked();
    markRatedHint();
    trackEvent('review_prompt_response', { source, response: 'happy' });
    close();
    try {
      const isAvailable = await StoreReview.isAvailableAsync();
      if (isAvailable) {
        trackEvent('review_store_requested', { source });
        await StoreReview.requestReview();
      }
    } catch (error) {
      if (__DEV__) console.warn('[kibun:review] requestReview failed:', error);
    }
  };

  const handleUnhappy = () => {
    const source = sourceRef.current;
    useReviewPromptStore.getState().recordAsked();
    trackEvent('review_prompt_response', { source, response: 'unhappy' });
    close();
    openSupportFeedback(source);
  };

  const handleLater = () => {
    const source = sourceRef.current;
    useReviewPromptStore.getState().recordAsked();
    trackEvent('review_prompt_response', { source, response: 'later' });
    close();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleLater}
      statusBarTranslucent
    >
      <Animated.View style={[styles.backdrop, { opacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleLater} accessibilityLabel="Dismiss" />
        <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
          <View style={styles.mascotWrap}>
            <Shiba variant="happy" size={96} floating />
          </View>
          <Text style={styles.title} accessibilityRole="header">
            How&apos;s kibun going?
          </Text>
          <Text style={styles.subtitle}>
            Your honest answer helps us make it better.
          </Text>

          <View style={styles.buttonRow}>
            <Pressable
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
              onPress={handleHappy}
              accessibilityRole="button"
              accessibilityLabel="Loving it"
            >
              <Text style={styles.primaryBtnText}>Loving it 💖</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
              onPress={handleUnhappy}
              accessibilityRole="button"
              accessibilityLabel="Not really"
            >
              <Text style={styles.secondaryBtnText}>Not really</Text>
            </Pressable>
          </View>

          <Pressable
            style={styles.tertiaryBtn}
            onPress={handleLater}
            accessibilityRole="button"
            accessibilityLabel="Maybe later"
          >
            <Text style={styles.tertiaryBtnText}>Maybe later</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    alignItems: 'center',
    ...shadows.lg,
  },
  mascotWrap: {
    marginTop: -spacing.lg,
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: typography.fonts.display,
    fontSize: typography.sizes.xl,
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: typography.fonts.body,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  buttonRow: {
    width: '100%',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  primaryBtn: {
    flex: 1,
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
  secondaryBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.button,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontFamily: typography.fonts.ui,
    fontSize: typography.sizes.body,
    color: colors.text,
  },
  tertiaryBtn: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  tertiaryBtnText: {
    fontFamily: typography.fonts.body,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  pressed: {
    opacity: 0.85,
  },
});
