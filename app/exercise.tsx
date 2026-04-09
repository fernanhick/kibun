import { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import { Screen, Button } from '@components/index';
import { colors, typography, spacing, radius } from '@constants/theme';

// ─── Box Breathing ────────────────────────────────────────────────────────────

const PHASE_DURATION_MS = 4000;
const PHASE_LABELS = ['Inhale', 'Hold', 'Exhale', 'Hold'];

function BoxBreathing() {
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0.6);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [cycle, setCycle] = useState(1);
  const [done, setDone] = useState(false);
  const TOTAL_CYCLES = 4;
  const router = useRouter();

  useEffect(() => {
    // Animate circle: expand on inhale/hold-in, contract on exhale/hold-out
    scale.value = withRepeat(
      withSequence(
        withTiming(1,   { duration: PHASE_DURATION_MS, easing: Easing.inOut(Easing.ease) }), // inhale
        withTiming(1,   { duration: PHASE_DURATION_MS, easing: Easing.linear }),              // hold
        withTiming(0.5, { duration: PHASE_DURATION_MS, easing: Easing.inOut(Easing.ease) }), // exhale
        withTiming(0.5, { duration: PHASE_DURATION_MS, easing: Easing.linear }),              // hold
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
  }, []);

  // Phase label ticker
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
        <Text style={styles.doneEmoji}>✨</Text>
        <Text style={styles.doneTitle}>Well done!</Text>
        <Text style={styles.doneSubtitle}>You completed 4 cycles of box breathing.</Text>
        <Button label="Back to home" onPress={() => router.replace('/(tabs)')} variant="sunrise" fullWidth />
      </View>
    );
  }

  return (
    <View style={styles.breathingContainer}>
      <Text style={styles.exerciseDescription}>
        Follow the circle. Breathe in rhythm — {TOTAL_CYCLES} cycles.
      </Text>
      <View style={styles.circleWrapper}>
        <Animated.View style={[styles.breathingCircle, circleStyle]} />
        <View style={styles.phaseOverlay}>
          <Text style={styles.phaseLabel}>{PHASE_LABELS[phaseIndex]}</Text>
          <Text style={styles.cycleCount}>Cycle {Math.min(cycle, TOTAL_CYCLES)} / {TOTAL_CYCLES}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Grounding (5-4-3-2-1) ────────────────────────────────────────────────────

const GROUNDING_STEPS = [
  { count: 5, sense: 'see',   prompt: 'Name 5 things you can see right now.' },
  { count: 4, sense: 'touch', prompt: 'Name 4 things you can physically touch.' },
  { count: 3, sense: 'hear',  prompt: 'Name 3 things you can hear.' },
  { count: 2, sense: 'smell', prompt: 'Name 2 things you can smell.' },
  { count: 1, sense: 'taste', prompt: 'Name 1 thing you can taste.' },
];

function Grounding() {
  const [step, setStep] = useState(0);
  const router = useRouter();

  const current = GROUNDING_STEPS[step];
  const isLast = step === GROUNDING_STEPS.length - 1;

  return (
    <View style={styles.groundingContainer}>
      <Text style={styles.exerciseDescription}>
        The 5-4-3-2-1 grounding technique brings you back to the present moment.
      </Text>
      <View style={styles.groundingCard}>
        <Text style={styles.groundingCount}>{current.count}</Text>
        <Text style={styles.groundingPrompt}>{current.prompt}</Text>
        <Text style={styles.groundingProgress}>Step {step + 1} of {GROUNDING_STEPS.length}</Text>
      </View>
      <Button
        label={isLast ? 'Finish' : 'Continue'}
        onPress={() => {
          if (isLast) {
            router.replace('/(tabs)');
          } else {
            setStep((s) => s + 1);
          }
        }}
        variant="sunrise"
        fullWidth
      />
    </View>
  );
}

// ─── Gratitude ────────────────────────────────────────────────────────────────

const GRATITUDE_PROMPTS = [
  'Something that made you smile today.',
  'A person who brings you comfort.',
  'Something in your body that is working well.',
];

function Gratitude() {
  const [values, setValues] = useState<string[]>(['', '', '']);
  const router = useRouter();

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
      <Text style={styles.exerciseDescription}>
        List three things you are grateful for right now.
      </Text>
      {GRATITUDE_PROMPTS.map((prompt, i) => (
        <View key={i} style={styles.gratitudeRow}>
          <Text style={styles.gratitudeNumber}>{i + 1}.</Text>
          <TextInput
            style={styles.gratitudeInput}
            value={values[i]}
            onChangeText={(t) => handleChange(i, t)}
            placeholder={prompt}
            placeholderTextColor={colors.textDisabled}
            accessibilityLabel={`Gratitude item ${i + 1}`}
          />
        </View>
      ))}
      <Button
        label="Done"
        onPress={() => router.replace('/(tabs)')}
        variant="sunrise"
        disabled={!allFilled}
        fullWidth
      />
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

const EXERCISE_META: Record<string, { title: string; emoji: string }> = {
  box_breathing: { title: 'Box Breathing', emoji: '🫁' },
  grounding:     { title: 'Grounding',     emoji: '🌱' },
  gratitude:     { title: 'Gratitude',     emoji: '🙏' },
};

export default function ExerciseScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ type: string }>();
  const type = params.type ?? 'box_breathing';
  const meta = EXERCISE_META[type] ?? EXERCISE_META['box_breathing'];

  const renderExercise = () => {
    if (type === 'grounding') return <Grounding />;
    if (type === 'gratitude') return <Gratitude />;
    return <BoxBreathing />;
  };

  return (
    <Screen scrollable contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>{meta.emoji}</Text>
        <Text style={styles.headerTitle}>{meta.title}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn} accessibilityLabel="Close">
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
  headerEmoji: {
    fontSize: 28,
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
    fontSize: 48,
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
  // Grounding
  groundingContainer: {
    gap: spacing.lg,
  },
  groundingCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
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
  // Gratitude
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
