import { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen, Button } from '@components/index';
import { Shiba } from '@components/Shiba';
import { MOOD_MAP, MoodId } from '@constants/moods';
import { colors, typography, spacing, radius } from '@constants/theme';
import { useMoodEntryStore } from '@store/index';

export default function JournalReflectScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    entryId: string;
    prompt: string;
    moodId: string;
  }>();

  const [response, setResponse] = useState('');
  const [saving, setSaving] = useState(false);

  const mood = params.moodId ? MOOD_MAP[params.moodId as MoodId] : null;
  const prompt = params.prompt ?? '';
  const entryId = params.entryId ?? '';

  const handleSave = async () => {
    if (saving || !response.trim()) return;
    setSaving(true);
    await useMoodEntryStore.getState().updateJournalResponse(entryId, prompt, response.trim());
    router.replace('/(tabs)');
  };

  const handleSkip = () => {
    router.replace('/(tabs)');
  };

  return (
    <Screen scrollable={false} contentContainerStyle={styles.content}>
      <LinearGradient
        colors={[colors.skyStart, colors.skyEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.shibaRow}>
          <Shiba
            variant={mood?.group === 'green' ? 'happy' : mood?.group === 'neutral' ? 'neutral' : 'sad'}
            size={100}
            floating
          />
        </View>
        <View style={styles.promptContainer}>
          <Text style={styles.promptLabel}>Reflect</Text>
          <Text style={styles.promptText}>{prompt}</Text>
        </View>
      </LinearGradient>

      <View style={styles.inputSection}>
        <TextInput
          style={styles.input}
          value={response}
          onChangeText={setResponse}
          placeholder="Write freely — this is just for you."
          placeholderTextColor={colors.textDisabled}
          multiline
          textAlignVertical="top"
          accessibilityLabel="Journal response"
          autoFocus
        />
      </View>

      <View style={styles.actions}>
        <Button
          label="Save reflection"
          onPress={handleSave}
          variant="sunrise"
          loading={saving}
          disabled={saving || !response.trim()}
          fullWidth
        />
        <Button
          label="Skip for now"
          onPress={handleSkip}
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
  hero: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    padding: spacing.lg,
    gap: spacing.md,
  },
  shibaRow: {
    alignItems: 'center',
  },
  promptContainer: {
    gap: spacing.xs,
  },
  promptLabel: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.ui,
    color: colors.sparkle ?? colors.textInverse,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  promptText: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.display,
    color: colors.textInverse,
    lineHeight: 28,
  },
  inputSection: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 22,
    borderWidth: 1.2,
    borderColor: '#DCE9FF',
    padding: spacing.md,
  },
  input: {
    fontSize: typography.sizes.md,
    color: colors.text,
    minHeight: 140,
    lineHeight: 24,
  },
  actions: {
    gap: spacing.sm,
  },
});
