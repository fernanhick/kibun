import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams, type Href } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen, Button } from '@components/index';
import { MoodBubble } from '@components/MoodBubble';
import { Shiba, ShibaVariant } from '@components/Shiba';
import { SparkleOverlay } from '@components/SparkleOverlay';
import { MOOD_MAP, MoodId, MoodGroup } from '@constants/moods';
import { colors, typography, spacing, radius } from '@constants/theme';
import { useMoodEntryStore, useSessionStore } from '@store/index';
import { getCheckInSlot } from '@lib/checkInSlot';
import { analyseSentiment, getMoodSentimentAlignment } from '@lib/sentiment';
import { supabase } from '@lib/supabase';
import type { SentimentResult } from '@lib/sentiment';
import type { SentimentLabel } from '@models/index';

const SHIBA_MAP: Record<MoodGroup, ShibaVariant> = {
  green: 'happy',
  neutral: 'neutral',
  'red-orange': 'sad',
  blue: 'sad',
};

// Sentiment chip config
const SENTIMENT_CONFIG: Record<SentimentLabel, { emoji: string; label: string; color: string }> = {
  positive: { emoji: '😊', label: 'Sounds positive', color: colors.success },
  neutral:  { emoji: '😐', label: 'Sounds neutral',  color: colors.textSecondary },
  negative: { emoji: '😔', label: 'Sounds difficult', color: colors.error },
};

const EXERCISE_OPTIONS: { type: string; label: string; emoji: string }[] = [
  { type: 'box_breathing', label: 'Box Breathing', emoji: '🫁' },
  { type: 'grounding',     label: 'Grounding',     emoji: '🌱' },
  { type: 'gratitude',     label: 'Gratitude',     emoji: '🙏' },
];

export default function MoodConfirmScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ moodId: string }>();
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sentiment, setSentiment] = useState<SentimentResult | null>(null);

  const session = useSessionStore((s) => s.session);
  const isPro = session?.subscriptionStatus === 'trial' || session?.subscriptionStatus === 'active';

  // Debounce sentiment analysis: run 600 ms after user stops typing
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mood = MOOD_MAP[params.moodId as MoodId];

  // Guard against invalid/missing moodId (audit-added S1)
  if (!mood) {
    router.back();
    return null;
  }

  const shibaVariant = SHIBA_MAP[mood.group];

  // Run ONNX sentiment inference 600 ms after the user stops typing.
  // Clears the chip immediately when the note is deleted.
  const handleNoteChange = (text: string) => {
    setNote(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim()) {
      setSentiment(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const result = await analyseSentiment(text);
      setSentiment(result);
    }, 600);
  };

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const alignment = sentiment
    ? getMoodSentimentAlignment(mood.group, sentiment)
    : 'neutral';

  const handleSave = async () => {
    if (submitting) return;
    setSubmitting(true);

    const entryId = Crypto.randomUUID();
    const entry = {
      id: entryId,
      moodId: mood.id,
      note: note.trim() || null,
      slot: getCheckInSlot(),
      loggedAt: new Date().toISOString(),
      sentimentLabel: sentiment?.label,
      sentimentScore: sentiment?.score,
    };

    useMoodEntryStore.getState().addEntry(entry);

    // Pro: fetch a journal reflection prompt then navigate to journal screen
    if (isPro && supabase) {
      try {
        const recent = useMoodEntryStore.getState().entries.slice(0, 5);
        const { data } = await supabase.functions.invoke('generate-journal-prompt', {
          body: {
            mood_id:       mood.id,
            mood_label:    mood.label,
            mood_group:    mood.group,
            recent_entries: recent.map((e) => ({
              mood:       e.moodId,
              slot:       e.slot,
              logged_at:  e.loggedAt,
              note:       e.note ?? undefined,
            })),
          },
        });
        if (data?.prompt) {
          router.replace({
            pathname: '/journal-reflect',
            params: { entryId, prompt: data.prompt, moodId: mood.id },
          } as unknown as Href);
          return;
        }
      } catch {
        // silently fall through to default navigation
      }
    }

    router.replace('/(tabs)');
  };

  return (
    <Screen scrollable={true} contentContainerStyle={styles.content}>
      <LinearGradient
        colors={[colors.skyStart, colors.skyEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <SparkleOverlay count={20} />
        <View style={styles.heroBadge}>
          <Ionicons name="sparkles" size={12} color={colors.textInverse} />
          <Text style={styles.heroBadgeText}>Your vibe today</Text>
        </View>
        <View style={styles.moodDisplay}>
          <MoodBubble mood={mood} size="lg" />
          <View style={styles.titleColumn}>
            <Text style={styles.moodLabel}>{mood.label}</Text>
            <Text style={styles.moodSubLabel}>This feeling matters. Let us log it.</Text>
          </View>
        </View>

        <View style={styles.shibaContainer}>
          <Shiba variant={shibaVariant} size={124} floating />
        </View>
      </LinearGradient>

      <View style={styles.noteSection}>
        <Text style={styles.noteLabel}>Add a note</Text>
        <TextInput
          style={styles.noteInput}
          value={note}
          onChangeText={handleNoteChange}
          placeholder="How are you feeling? (optional)"
          placeholderTextColor={colors.textDisabled}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          accessibilityLabel="Mood note"
        />
        {/* Sentiment chip — only shown when ONNX model is available + note is long enough */}
        {sentiment && (
          <View style={styles.sentimentRow}>
            <View style={[styles.sentimentChip, { borderColor: SENTIMENT_CONFIG[sentiment.label].color }]}>
              <Text style={styles.sentimentEmoji}>
                {SENTIMENT_CONFIG[sentiment.label].emoji}
              </Text>
              <Text style={[styles.sentimentLabel, { color: SENTIMENT_CONFIG[sentiment.label].color }]}>
                {SENTIMENT_CONFIG[sentiment.label].label}
              </Text>
            </View>
            {/* Gentle contradiction hint */}
            {alignment === 'contrary' && (
              <Text style={styles.alignmentHint}>
                {mood.group === 'green'
                  ? "Note sounds difficult \u2014 that\u2019s okay to feel."
                  : "Note sounds hopeful \u2014 that\u2019s worth noticing."}
              </Text>
            )}
          </View>
        )}
      </View>

      <View style={styles.actions}>
        {/* Exercise CTA — Pro + red-orange moods */}
        {isPro && mood.group === 'red-orange' && (
          <View style={styles.exerciseCard}>
            <Text style={styles.exerciseTitle}>Need a moment? 💛</Text>
            <Text style={styles.exerciseSubtitle}>Try a quick exercise to help reset.</Text>
            <View style={styles.exerciseRow}>
              {EXERCISE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.type}
                  style={styles.exerciseChip}
                  onPress={() =>
                    router.push({ pathname: '/exercise', params: { type: opt.type } } as unknown as Href)
                  }
                  accessibilityLabel={opt.label}
                >
                  <Text style={styles.exerciseEmoji}>{opt.emoji}</Text>
                  <Text style={styles.exerciseChipLabel}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
        <Button
          label="Save"
          onPress={handleSave}
          variant="sunrise"
          loading={submitting}
          disabled={submitting}
          fullWidth
        />
        <Button
          label="Change mood"
          onPress={() => router.back()}
          variant="ghost"
          fullWidth
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  heroCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  heroBadgeText: {
    color: colors.textInverse,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  moodDisplay: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  titleColumn: {
    flex: 1,
    marginLeft: spacing.sm,
    gap: spacing.xs,
  },
  moodLabel: {
    fontSize: typography.sizes.xxl,
    fontFamily: typography.fonts.display,
    color: colors.textInverse,
  },
  moodSubLabel: {
    fontSize: typography.sizes.sm,
    color: colors.sparkle,
    lineHeight: 20,
  },
  shibaContainer: {
    alignItems: 'center',
  },
  noteSection: {
    gap: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 22,
    padding: spacing.md,
    borderWidth: 1.2,
    borderColor: '#DCE9FF',
  },
  noteLabel: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.ui,
    color: colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  noteInput: {
    borderWidth: 1.5,
    borderColor: '#C8DCFF',
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    fontSize: typography.sizes.md,
    color: colors.text,
    backgroundColor: '#F7FBFF',
    minHeight: 100,
  },
  actions: {
    gap: spacing.sm,
  },
  exerciseCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: '#FFD8B0',
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  exerciseTitle: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.ui,
    color: colors.text,
  },
  exerciseSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  exerciseRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  exerciseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: '#FFCC80',
    borderRadius: radius.lg,
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
  },
  exerciseEmoji: {
    fontSize: 16,
  },
  exerciseChipLabel: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    fontFamily: typography.fonts.ui,
  },
  sentimentRow: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  sentimentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    borderWidth: 1,
    borderRadius: radius.full ?? 999,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
  },
  sentimentEmoji: {
    fontSize: 14,
  },
  sentimentLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  alignmentHint: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
});
