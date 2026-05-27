import { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { Screen, Button } from '@components/index';
import { colors, typography, spacing, radius } from '@constants/theme';
import { EXERCISE_CHIP_IMAGES, type ExerciseType } from '@constants/exercises';
import { useReducedMotion } from '@hooks/useReducedMotion';
import { haptics } from '@lib/haptics';

// ─── Box Breathing ────────────────────────────────────────────────────────────

const PHASE_DURATION_MS = 4000;
const PHASE_KEYS = ['inhale', 'hold', 'exhale', 'hold'] as const;

function BoxBreathing() {
  const { t } = useTranslation('screens');
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0.6);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [cycle, setCycle] = useState(1);
  const [done, setDone] = useState(false);
  const TOTAL_CYCLES = 4;
  const router = useRouter();
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      scale.value = 1;
      opacity.value = 1;
      return;
    }
    scale.value = withRepeat(
      withSequence(
        withTiming(1,   { duration: PHASE_DURATION_MS, easing: Easing.inOut(Easing.ease) }),
        withTiming(1,   { duration: PHASE_DURATION_MS, easing: Easing.linear }),
        withTiming(0.5, { duration: PHASE_DURATION_MS, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.5, { duration: PHASE_DURATION_MS, easing: Easing.linear }),
      ),
      TOTAL_CYCLES,
      false,
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(1,   { duration: PHASE_DURATION_MS }),
        withTiming(0.85,{ duration: PHASE_DURATION_MS }),
        withTiming(0.6, { duration: PHASE_DURATION_MS }),
        withTiming(0.75,{ duration: PHASE_DURATION_MS }),
      ),
      TOTAL_CYCLES,
      false,
    );
    return () => {
      cancelAnimation(scale);
      cancelAnimation(opacity);
    };
  }, [reducedMotion]);

  useEffect(() => {
    if (done) haptics.success();
  }, [done]);

  useEffect(() => {
    if (done) return;
    const interval = setInterval(() => {
      setPhaseIndex((prev) => {
        const next = (prev + 1) % 4;
        if (next === 0) {
          setCycle((c) => {
            const newCycle = c + 1;
            if (newCycle > TOTAL_CYCLES) {
              setDone(true);
              clearInterval(interval);
            }
            return newCycle;
          });
        }
        return next;
      });
    }, PHASE_DURATION_MS);
    return () => clearInterval(interval);
  }, [done]);

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  if (done) {
    return (
      <View style={styles.doneContainer}>
        <Ionicons name="sparkles" size={40} color={colors.primary} style={styles.doneEmoji} />
        <Text style={styles.doneTitle}>{t('exercise.boxBreathing.doneTitle')}</Text>
        <Text style={styles.doneSubtitle}>
          {t('exercise.boxBreathing.doneSubtitle', { count: TOTAL_CYCLES })}
        </Text>
        <Button label={t('exercise.continue')} onPress={() => router.back()} variant="sunrise" fullWidth />
      </View>
    );
  }

  return (
    <View style={styles.breathingContainer}>
      <Text style={styles.exerciseDescription}>
        {t('exercise.boxBreathing.description', { count: TOTAL_CYCLES })}
      </Text>
      <View style={styles.circleWrapper}>
        <Animated.View style={[styles.breathingCircle, circleStyle]} />
        <View style={styles.phaseOverlay}>
          <Text style={styles.phaseLabel}>{t(`exercise.boxBreathing.phases.${PHASE_KEYS[phaseIndex]}`)}</Text>
          <Text style={styles.cycleCount}>
            {t('exercise.boxBreathing.cycle', { n: Math.min(cycle, TOTAL_CYCLES), total: TOTAL_CYCLES })}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── Step-list exercise (Grounding, Savoring, Energy Boost, Mindful Pause, Body Scan, Self Compassion) ──

interface StepListExerciseProps {
  i18nKey: string;             // e.g. 'exercise.grounding'
  showCount?: boolean;          // grounding & energyBoost show a numbered card
  countMode?: 'reverse' | 'index'; // grounding: 5,4,3,2,1; energyBoost: 1..n
}

function StepListExercise({ i18nKey, showCount = false, countMode = 'index' }: StepListExerciseProps) {
  const { t } = useTranslation('screens');
  const [step, setStep] = useState(0);
  const router = useRouter();

  const steps = t(`${i18nKey}.steps`, { returnObjects: true }) as string[];
  const isLast = step === steps.length - 1;
  const count = countMode === 'reverse' ? steps.length - step : step + 1;

  return (
    <View style={styles.groundingContainer}>
      <Text style={styles.exerciseDescription}>{t(`${i18nKey}.description`)}</Text>
      <View style={styles.groundingCard}>
        {showCount && <Text style={styles.groundingCount}>{count}</Text>}
        <Text style={styles.groundingPrompt}>{steps[step]}</Text>
        <Text style={styles.groundingProgress}>
          {t('exercise.step', { n: step + 1, total: steps.length })}
        </Text>
      </View>
      <Button
        label={isLast ? t('exercise.finish') : t('exercise.continue')}
        onPress={() => {
          if (isLast) router.back();
          else setStep((s) => s + 1);
        }}
        variant="sunrise"
        fullWidth
      />
    </View>
  );
}

// ─── Prompt-list exercise (Gratitude, Joy Capture, Curiosity, Comfort List) ───

interface PromptListExerciseProps {
  i18nKey: string;
}

function PromptListExercise({ i18nKey }: PromptListExerciseProps) {
  const { t } = useTranslation('screens');
  const router = useRouter();
  const prompts = t(`${i18nKey}.prompts`, { returnObjects: true }) as string[];
  const [values, setValues] = useState<string[]>(() => prompts.map(() => ''));

  const handleChange = (index: number, text: string) => {
    setValues((prev) => {
      const next = [...prev];
      next[index] = text;
      return next;
    });
  };

  const allFilled = values.every((v) => v.trim().length > 0);

  return (
    <View style={styles.gratitudeContainer}>
      <Text style={styles.exerciseDescription}>{t(`${i18nKey}.description`)}</Text>
      {prompts.map((prompt, i) => (
        <View key={i} style={styles.gratitudeRow}>
          <Text style={styles.gratitudeNumber}>{i + 1}.</Text>
          <TextInput
            style={styles.gratitudeInput}
            value={values[i]}
            onChangeText={(text) => handleChange(i, text)}
            placeholder={prompt}
            placeholderTextColor={colors.textDisabled}
            accessibilityLabel={t(`${i18nKey}.itemA11y`, { n: i + 1 })}
          />
        </View>
      ))}
      <Button label={t('exercise.done')} onPress={() => router.back()} variant="sunrise" disabled={!allFilled} fullWidth />
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

const EXERCISE_TYPES: ExerciseType[] = [
  'box_breathing',
  'grounding',
  'gratitude',
  'joy_capture',
  'savoring',
  'energy_boost',
  'curiosity',
  'mindful_pause',
  'body_scan',
  'self_compassion',
  'comfort_list',
];

function resolveExerciseType(input: string): ExerciseType {
  return (EXERCISE_TYPES as string[]).includes(input)
    ? (input as ExerciseType)
    : 'box_breathing';
}

export default function ExerciseScreen() {
  const router = useRouter();
  const { t } = useTranslation(['screens', 'moods']);
  const params = useLocalSearchParams<{ type: string }>();
  const type = resolveExerciseType(params.type ?? 'box_breathing');

  const renderExercise = () => {
    switch (type) {
      case 'grounding':       return <StepListExercise i18nKey="exercise.grounding"       showCount countMode="reverse" />;
      case 'gratitude':       return <PromptListExercise i18nKey="exercise.gratitude" />;
      case 'joy_capture':     return <PromptListExercise i18nKey="exercise.joyCapture" />;
      case 'savoring':        return <StepListExercise i18nKey="exercise.savoring" />;
      case 'energy_boost':    return <StepListExercise i18nKey="exercise.energyBoost"     showCount countMode="index" />;
      case 'curiosity':       return <PromptListExercise i18nKey="exercise.curiosity" />;
      case 'mindful_pause':   return <StepListExercise i18nKey="exercise.mindfulPause" />;
      case 'body_scan':       return <StepListExercise i18nKey="exercise.bodyScan" />;
      case 'self_compassion': return <StepListExercise i18nKey="exercise.selfCompassion" />;
      case 'comfort_list':    return <PromptListExercise i18nKey="exercise.comfortList" />;
      default:                return <BoxBreathing />;
    }
  };

  // Title comes from the same i18n bundle used in mood-confirm so the exercise
  // name shown here matches the chip the user tapped.
  const title = t(`screens:moodConfirm.exercises.options.${type}`);

  return (
    <Screen scrollable contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Image
          source={EXERCISE_CHIP_IMAGES[type]}
          style={styles.headerIllustration}
          contentFit="contain"
          accessibilityIgnoresInvertColors
        />
        <Text style={styles.headerTitle}>{title}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn} accessibilityLabel={t('screens:exercise.closeA11y')}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>

      {renderExercise()}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  headerIllustration: {
    width: 48,
    height: 48,
  },
  headerTitle: {
    flex: 1,
    fontSize: typography.sizes.xl,
    fontFamily: typography.fonts.display,
    color: colors.text,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  closeText: {
    fontSize: 18,
    color: colors.textSecondary,
  },
  exerciseDescription: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  // Box Breathing
  breathingContainer: {
    gap: spacing.lg,
    alignItems: 'center',
  },
  circleWrapper: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breathingCircle: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.primary,
    opacity: 0.6,
  },
  phaseOverlay: {
    alignItems: 'center',
    gap: 4,
  },
  phaseLabel: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fonts.display,
    color: colors.textInverse,
  },
  cycleCount: {
    fontSize: typography.sizes.sm,
    color: 'rgba(255,255,255,0.8)',
  },
  doneContainer: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
  doneEmoji: {
    marginBottom: spacing.sm,
  },
  doneTitle: {
    fontSize: typography.sizes.xxl,
    fontFamily: typography.fonts.display,
    color: colors.text,
  },
  doneSubtitle: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  // Step list / Grounding
  groundingContainer: {
    gap: spacing.lg,
  },
  groundingCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: '#DCE9FF',
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  groundingCount: {
    fontSize: 64,
    fontFamily: typography.fonts.display,
    color: colors.primary,
    lineHeight: 72,
  },
  groundingPrompt: {
    fontSize: typography.sizes.lg,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 26,
    fontFamily: typography.fonts.ui,
  },
  groundingProgress: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  // Prompt list / Gratitude
  gratitudeContainer: {
    gap: spacing.md,
  },
  gratitudeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  gratitudeNumber: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.ui,
    color: colors.primary,
    width: 24,
  },
  gratitudeInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#C8DCFF',
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    fontSize: typography.sizes.md,
    color: colors.text,
    backgroundColor: '#F7FBFF',
  },
});
