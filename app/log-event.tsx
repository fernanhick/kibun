import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen, Button } from '@components/index';
import { SparkleOverlay } from '@components/SparkleOverlay';
import { useLifeEventsStore } from '@store/index';
import { colors, spacing, typography, radius } from '@constants/theme';
import type { LifeEventCategory } from '@models/index';

const CATEGORIES: { value: LifeEventCategory; label: string; emoji: string; color: string }[] = [
  { value: 'work',         label: 'Work',         emoji: '💼', color: '#5C7CFA' },
  { value: 'social',       label: 'Social',       emoji: '👥', color: '#F06595' },
  { value: 'health',       label: 'Health',       emoji: '🏥', color: '#51CF66' },
  { value: 'travel',       label: 'Travel',       emoji: '✈️', color: '#339AF0' },
  { value: 'relationship', label: 'Relationship', emoji: '❤️', color: '#FF6B6B' },
  { value: 'personal',     label: 'Personal',     emoji: '🌟', color: '#CC5DE8' },
];

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

export default function LogEventScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string }>();
  const today = new Date().toISOString().split('T')[0];
  const eventDate = params.date ?? today;

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<LifeEventCategory | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const addEvent = useLifeEventsStore((s) => s.addEvent);

  const canSave = title.trim().length > 0 && category !== null;

  const handleSave = () => {
    if (!canSave || saving) return;
    setSaving(true);
    addEvent({ title: title.trim(), category: category!, eventDate, notes: notes.trim() || undefined });
    router.back();
  };

  return (
    <Screen scrollable={false} contentContainerStyle={styles.root}>
      <LinearGradient
        colors={[colors.pink, colors.pinkEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <SparkleOverlay count={12} />
        <View style={styles.heroHeader}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={12}
          >
            <Ionicons name="close" size={22} color={colors.textInverse} />
          </Pressable>
        </View>
        <View style={styles.heroBadge}>
          <Ionicons name="calendar-outline" size={12} color={colors.textInverse} />
          <Text style={styles.heroBadgeText}>{formatDisplayDate(eventDate)}</Text>
        </View>
        <Text style={styles.heroTitle}>Log a Life Event</Text>
        <Text style={styles.heroSubtitle}>Tag moments that shape your mood patterns</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>What happened?</Text>
          <TextInput
            style={styles.titleInput}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Big presentation, First date, Doctor visit"
            placeholderTextColor={colors.textDisabled}
            returnKeyType="done"
            maxLength={80}
            accessibilityLabel="Event title"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Category</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((cat) => {
              const selected = category === cat.value;
              return (
                <Pressable
                  key={cat.value}
                  onPress={() => setCategory(cat.value)}
                  style={[
                    styles.categoryChip,
                    selected && { borderColor: cat.color, backgroundColor: cat.color + '18' },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={cat.label}
                >
                  <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                  <Text style={[styles.categoryLabel, selected && { color: cat.color }]}>
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Notes (optional)</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Any extra context..."
            placeholderTextColor={colors.textDisabled}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            maxLength={300}
            accessibilityLabel="Event notes"
          />
        </View>

        <View style={styles.actions}>
          <Button
            label="Save event"
            onPress={handleSave}
            variant="sunrise"
            fullWidth
            loading={saving}
            disabled={!canSave || saving}
          />
          <Button
            label="Cancel"
            onPress={() => router.back()}
            variant="ghost"
            fullWidth
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    gap: 0,
  },
  heroCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
  heroHeader: {
    alignItems: 'flex-end',
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
    paddingVertical: 5,
  },
  heroBadgeText: {
    color: colors.textInverse,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  heroTitle: {
    fontSize: typography.sizes.xxl,
    fontFamily: typography.fonts.display,
    color: colors.textInverse,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.sparkle,
    textAlign: 'center',
    paddingBottom: spacing.sm,
  },
  form: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.ui,
    color: colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  titleInput: {
    borderWidth: 1.5,
    borderColor: '#C8DCFF',
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    fontSize: typography.sizes.md,
    color: colors.text,
    backgroundColor: '#F7FBFF',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: '#D0DDFF',
    backgroundColor: colors.surface,
  },
  categoryEmoji: {
    fontSize: 16,
  },
  categoryLabel: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    fontFamily: typography.fonts.ui,
  },
  notesInput: {
    borderWidth: 1.5,
    borderColor: '#C8DCFF',
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    fontSize: typography.sizes.md,
    color: colors.text,
    backgroundColor: '#F7FBFF',
    minHeight: 80,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
