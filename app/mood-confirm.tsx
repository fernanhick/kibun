import { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen, Button } from '@components/index';
import { MoodBubble } from '@components/MoodBubble';
import { Shiba, ShibaVariant } from '@components/Shiba';
import { MOOD_MAP, MoodId, MoodGroup } from '@constants/moods';
import { colors, typography, spacing, radius } from '@constants/theme';
import { useMoodEntryStore } from '@store/index';
import { getCheckInSlot } from '@lib/checkInSlot';

const SHIBA_MAP: Record<MoodGroup, ShibaVariant> = {
  green: 'happy',
  neutral: 'neutral',
  'red-orange': 'sad',
  blue: 'sad',
};

export default function MoodConfirmScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ moodId: string }>();
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const mood = MOOD_MAP[params.moodId as MoodId];

  // Guard against invalid/missing moodId (audit-added S1)
  if (!mood) {
    router.back();
    return null;
  }

  const shibaVariant = SHIBA_MAP[mood.group];

  const handleSave = () => {
    if (submitting) return;
    setSubmitting(true);

    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2, 9),
      moodId: mood.id,
      note: note.trim() || null,
      slot: getCheckInSlot(),
      loggedAt: new Date().toISOString(),
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
          onChangeText={setNote}
          placeholder="How are you feeling? (optional)"
          placeholderTextColor={colors.textDisabled}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          accessibilityLabel="Mood note"
        />
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
});
