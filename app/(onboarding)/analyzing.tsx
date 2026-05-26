import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { Screen, Shiba } from '@components/index';
import { SparkleOverlay } from '@components/SparkleOverlay';
import { colors, typography, spacing, radius, shadows } from '@constants/theme';
import { useReducedMotion } from '@hooks/useReducedMotion';
import { haptics } from '@lib/haptics';
import { useOnboardingGateStore } from '@store/onboardingGateStore';

const STEP_KEYS = ['profile', 'reminders', 'insights', 'plan'] as const;
const STEP_DURATION_MS = 700;
// 900ms gives the last "plan" step room to land before handoff to plan-snapshot.
const POST_FINISH_HOLD_MS = 900;
const TOTAL_DURATION_MS = STEP_DURATION_MS * STEP_KEYS.length + POST_FINISH_HOLD_MS;

const RING_SIZE = 76;
const RING_STROKE = 6;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function AnalyzingScreen() {
  const router = useRouter();
  const { t } = useTranslation('onboarding');
  const reducedMotion = useReducedMotion();
  const [activeStep, setActiveStep] = useState(0);
  const snapshot = useOnboardingGateStore((s) => s.personalizationSnapshot);

  // Templated step labels — fall back to generic strings when a field is missing
  // (e.g. user reaches analyzing without going through notification-permission).
  const stepLabels = useMemo(() => {
    const profile = snapshot?.profile;
    const name = profile?.name?.trim() || null;
    const sleep = profile?.sleepHours
      ? t(`profilePhysical.sleepOpt.${profile.sleepHours}`)
      : null;
    const exercise = profile?.exercise
      ? t(`profilePhysical.exerciseOpt.${profile.exercise}`)
      : null;
    const topGoal = profile?.goals?.[0]
      ? t(`profileGoals.options.${profile.goals[0]}`)
      : null;

    return {
      profile: sleep && exercise
        ? t('analyzing.stepsPersonal.profile', { sleep, exercise })
        : t('analyzing.steps.profile'),
      reminders: t('analyzing.steps.reminders'),
      insights: topGoal
        ? t('analyzing.stepsPersonal.insights', { goal: topGoal })
        : t('analyzing.steps.insights'),
      plan: name
        ? t('analyzing.stepsPersonal.plan', { name })
        : t('analyzing.steps.plan'),
    };
  }, [snapshot, t]);

  const progress = useSharedValue(0);
  const shibaScale = useSharedValue(1);

  const ringAnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_CIRCUMFERENCE * (1 - progress.value),
  }));

  const shibaAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: shibaScale.value }],
  }));

  // Drive the progress ring from 0 → 1 over the full duration.
  useEffect(() => {
    if (reducedMotion) {
      progress.value = 1;
      return;
    }
    progress.value = withTiming(1, {
      duration: TOTAL_DURATION_MS,
      easing: Easing.out(Easing.cubic),
    });
    return () => cancelAnimation(progress);
  }, [reducedMotion]);

  // Gentle bouncy mascot pulse while analyzing.
  useEffect(() => {
    if (reducedMotion) return;
    shibaScale.value = withRepeat(
      withSequence(
        withSpring(1.06, { damping: 10, stiffness: 200 }),
        withSpring(1, { damping: 14, stiffness: 180 }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(shibaScale);
  }, [reducedMotion]);

  // Advance the active-step indicator on a fixed cadence.
  useEffect(() => {
    const timers = STEP_KEYS.map((_, i) =>
      setTimeout(() => {
        setActiveStep(i + 1);
        haptics.selection();
      }, STEP_DURATION_MS * (i + 1)),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  // After all steps + a short hold, hand off to the personalized plan-snapshot
  // screen, which then routes to /paywall. Direct-to-paywall (instead of via
  // (tabs)) avoids a flicker through the tabs gate.
  useEffect(() => {
    const handoff = setTimeout(() => {
      haptics.success();
      router.replace('/(onboarding)/plan-snapshot');
    }, TOTAL_DURATION_MS);
    return () => clearTimeout(handoff);
  }, [router]);

  return (
    <Screen
      scrollable={false}
      edgePadding="large"
      contentContainerStyle={styles.content}
    >
      <LinearGradient
        colors={[colors.skyStart, colors.skyEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <SparkleOverlay count={18} />
        <View style={styles.ringWrap}>
          <Svg width={RING_SIZE} height={RING_SIZE}>
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              stroke="rgba(255,255,255,0.28)"
              strokeWidth={RING_STROKE}
              fill="transparent"
            />
            <AnimatedCircle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              stroke={colors.textInverse}
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              animatedProps={ringAnimatedProps}
              fill="transparent"
              originX={RING_SIZE / 2}
              originY={RING_SIZE / 2}
              rotation={-90}
            />
          </Svg>
          <Animated.View style={[styles.shibaOnRing, shibaAnimatedStyle]}>
            <Shiba variant="excited" size={56} loop hideOnTabRoutes={false} />
          </Animated.View>
        </View>
        <Text style={styles.title}>{t('analyzing.title')}</Text>
        <Text style={styles.subtitle}>{t('analyzing.subtitle')}</Text>
      </LinearGradient>

      <View style={styles.stepsCard}>
        {STEP_KEYS.map((key, i) => (
          <StepRow
            key={key}
            label={stepLabels[key]}
            state={
              i < activeStep ? 'done' : i === activeStep ? 'active' : 'pending'
            }
            indexDelayMs={i * STEP_DURATION_MS}
            reducedMotion={reducedMotion}
          />
        ))}
      </View>
    </Screen>
  );
}

interface StepRowProps {
  label: string;
  state: 'pending' | 'active' | 'done';
  indexDelayMs: number;
  reducedMotion: boolean;
}

function StepRow({ label, state, indexDelayMs, reducedMotion }: StepRowProps) {
  const enterOpacity = useSharedValue(0);
  const enterTranslate = useSharedValue(8);

  useEffect(() => {
    if (reducedMotion) {
      enterOpacity.value = 1;
      enterTranslate.value = 0;
      return;
    }
    enterOpacity.value = withDelay(
      indexDelayMs,
      withTiming(1, { duration: 320, easing: Easing.out(Easing.quad) }),
    );
    enterTranslate.value = withDelay(
      indexDelayMs,
      withTiming(0, { duration: 320, easing: Easing.out(Easing.quad) }),
    );
  }, [indexDelayMs, reducedMotion]);

  const rowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: enterOpacity.value,
    transform: [{ translateY: enterTranslate.value }],
  }));

  const isDone = state === 'done';
  const isActive = state === 'active';
  const labelColor = isDone || isActive ? colors.text : colors.textSecondary;

  return (
    <Animated.View style={[styles.stepRow, rowAnimatedStyle]}>
      <View
        style={[
          styles.stepDot,
          isDone && styles.stepDotDone,
          isActive && styles.stepDotActive,
        ]}
      >
        {isDone ? (
          <Ionicons name="checkmark" size={14} color={colors.textInverse} />
        ) : isActive ? (
          <View style={styles.stepActivePulse} />
        ) : null}
      </View>
      <Text style={[styles.stepLabel, { color: labelColor }]}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.xxl,
    gap: spacing.lg,
    flex: 1,
    justifyContent: 'flex-start',
  },
  heroCard: {
    ...shadows.md,
    borderRadius: 28,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  shibaOnRing: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontFamily: typography.fonts.display,
    color: colors.textInverse,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: typography.sizes.body,
    color: colors.sparkle,
    textAlign: 'center',
    lineHeight: 22,
  },
  stepsCard: {
    ...shadows.sm,
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    backgroundColor: colors.chipSurface,
    borderWidth: 1,
    borderColor: colors.chipBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  stepDotDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  stepActivePulse: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  stepLabel: {
    flex: 1,
    fontSize: typography.sizes.body,
    fontFamily: typography.fonts.ui,
  },
});
