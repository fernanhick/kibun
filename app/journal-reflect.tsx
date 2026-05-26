import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, Keyboard } from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen, Button } from '@components/index';
import { MOOD_MAP, MoodId, MoodDefinition } from '@constants/moods';
import { MOOD_IMAGES, normalizeMoodImageKey } from '@constants/moodImages';
import { colors, typography, spacing } from '@constants/theme';
import { useMoodEntryStore } from '@store/index';

function resolveMoodImage(mood: MoodDefinition | null) {
  if (!mood) return null;
  const keys = [
    mood.imageKey,
    normalizeMoodImageKey(mood.id),
    normalizeMoodImageKey(mood.label),
  ].filter(Boolean) as string[];
  for (const key of keys) {
    const src = MOOD_IMAGES[key];
    if (src) return src;
  }
  return null;
}

export default function JournalReflectScreen() {
  const router = useRouter();
  const { t } = useTranslation('screens');
  const params = useLocalSearchParams<{
    entryId: string;
    prompt: string;
    moodId: string;
  }>();

  const [response, setResponse] = useState('');
  const [saving, setSaving] = useState(false);

  const mood = params.moodId ? MOOD_MAP[params.moodId as MoodId] ?? null : null;
  const moodImage = resolveMoodImage(mood);
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
      <Pressable style={styles.body} onPress={Keyboard.dismiss}>
        <LinearGradient
          colors={[colors.pink, colors.pinkEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.moodRow}>
            {moodImage ? (
              <Image
                source={moodImage}
                style={styles.moodImage}
                contentFit="contain"
                cachePolicy="memory-disk"
                recyclingKey={mood ? `mood-${mood.id}` : undefined}
                accessibilityLabel={mood?.label}
              />
            ) : null}
          </View>
          <View style={styles.promptContainer}>
            <Text style={styles.promptLabel}>{t('journalReflect.promptLabel')}</Text>
            <Text style={styles.promptText}>{prompt}</Text>
          </View>
        </LinearGradient>

        <View style={styles.inputSection}>
          <TextInput
            style={styles.input}
            value={response}
            onChangeText={setResponse}
            placeholder={t('journalReflect.placeholder')}
            placeholderTextColor={colors.textDisabled}
            multiline
            textAlignVertical="top"
            accessibilityLabel={t('journalReflect.a11y')}
          />
        </View>

        <View style={styles.actions}>
          <Button
            label={t('journalReflect.save')}
            onPress={handleSave}
            variant="sunrise"
            loading={saving}
            disabled={saving || !response.trim()}
            fullWidth
          />
          <Button
            label={t('journalReflect.skip')}
            onPress={handleSkip}
            variant="ghost"
            fullWidth
          />
        </View>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  body: {
    flex: 1,
    gap: spacing.lg,
  },
  hero: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    padding: spacing.lg,
    gap: spacing.md,
  },
  moodRow: {
    alignItems: 'center',
  },
  moodImage: {
    width: 160,
    height: 160,
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
    borderColor: colors.pinkBorder,
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
