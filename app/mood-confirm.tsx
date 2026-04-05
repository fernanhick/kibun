import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen, Button } from '@components/index';
import { MoodBubble } from '@components/MoodBubble';
import { Shiba, ShibaVariant } from '@components/Shiba';
import { MOOD_MAP, MoodId, MoodGroup } from '@constants/moods';
import { colors, typography, spacing, radius } from '@constants/theme';
import { useMoodEntryStore } from '@store/index';
import { getCheckInSlot } from '@lib/checkInSlot';
import { analyseSentiment, getMoodSentimentAlignment } from '@lib/sentiment';
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

export default function MoodConfirmScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ moodId: string }>();
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sentiment, setSentiment] = useState<SentimentResult | null>(null);

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

  const handleSave = () => {
    if (submitting) return;
    setSubmitting(true);

    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2, 9),
      moodId: mood.id,
      note: note.trim() || null,
      slot: getCheckInSlot(),
      loggedAt: new Date().toISOString(),
      sentimentLabel: sentiment?.label,
      sentimentScore: sentiment?.score,
    };

    useMoodEntryStore.getState().addEntry(entry);
    router.replace('/(tabs)');
  };

  return (
    <Screen scrollable={true} contentContainerStyle={styles.content}>
      <View style={styles.moodDisplay}>
        <MoodBubble mood={mood} size="lg" />
        <Text style={styles.moodLabel}>{mood.label}</Text>
      </View>

      <View style={styles.shibaContainer}>
        <Shiba variant={shibaVariant} size={140} />
      </View>

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
        <Button
          label="Save"
          onPress={handleSave}
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
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  moodDisplay: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  moodLabel: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  shibaContainer: {
    alignItems: 'center',
  },
  noteSection: {
    gap: spacing.xs,
  },
  noteLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  noteInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    fontSize: typography.sizes.md,
    color: colors.text,
    backgroundColor: colors.background,
    minHeight: 100,
  },
  actions: {
    gap: spacing.sm,
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
