import { useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '@components/index';
import { SparkleOverlay } from '@components/SparkleOverlay';
import { useCustomMoodsStore } from '@store/customMoodsStore';
import { colors, spacing, typography, radius } from '@constants/theme';
import type { MoodGroup } from '@constants/moods';

const MAX_MOODS = 5;

const COLOR_PALETTE = [
  '#FF6B9D', '#C77DFF', '#7C4DFF', '#4FC3F7',
  '#4CAF50', '#FFD600', '#FF7043', '#26A69A',
  '#EC407A', '#AB47BC', '#5C6BC0', '#29B6F6',
  '#66BB6A', '#FFCA28', '#FFA726', '#EF5350',
];

const GROUP_OPTIONS: { value: MoodGroup; label: string; hint: string }[] = [
  { value: 'green',     label: 'Positive',   hint: 'Uplifting, good energy' },
  { value: 'neutral',   label: 'Neutral',     hint: 'Mixed or calm feelings' },
  { value: 'blue',      label: 'Reflective',  hint: 'Introspective, quiet' },
  { value: 'red-orange',label: 'Difficult',   hint: 'Challenging emotions' },
];

export default function CustomMoodsScreen() {
  const router = useRouter();
  const moods = useCustomMoodsStore((s) => s.moods);
  const addMood = useCustomMoodsStore((s) => s.addMood);
  const deleteMood = useCustomMoodsStore((s) => s.deleteMood);

  const [label, setLabel] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_PALETTE[0]);
  const [selectedGroup, setSelectedGroup] = useState<MoodGroup>('green');
  const [showForm, setShowForm] = useState(false);

  const atLimit = moods.length >= MAX_MOODS;

  const handleAdd = () => {
    const trimmed = label.trim();
    if (trimmed.length < 2) return;
    const ok = addMood({ label: trimmed, color: selectedColor, group: selectedGroup });
    if (ok) {
      setLabel('');
      setSelectedColor(COLOR_PALETTE[0]);
      setSelectedGroup('green');
      setShowForm(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Delete mood', `Remove "${name}" from your custom moods?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMood(id) },
    ]);
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
            accessibilityLabel="Back"
            hitSlop={12}
          >
            <Ionicons name="arrow-back" size={22} color={colors.textInverse} />
          </Pressable>
        </View>
        <Text style={styles.heroTitle}>Custom Moods</Text>
        <Text style={styles.heroSubtitle}>
          Create up to {MAX_MOODS} moods that feel uniquely yours
        </Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
        {moods.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Your custom moods</Text>
            {moods.map((m) => (
              <View key={m.id} style={styles.moodRow}>
                <View style={[styles.moodDot, { backgroundColor: m.color }]} />
                <Text style={styles.moodLabel}>{m.label}</Text>
                <Text style={styles.moodGroup}>
                  {GROUP_OPTIONS.find((g) => g.value === m.group)?.label ?? m.group}
                </Text>
                <Pressable
                  onPress={() => handleDelete(m.id, m.label)}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete ${m.label}`}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.textSecondary} />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {!atLimit && !showForm && (
          <Pressable
            style={styles.addButton}
            onPress={() => setShowForm(true)}
            accessibilityRole="button"
            accessibilityLabel="Create a new custom mood"
          >
            <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
            <Text style={styles.addButtonText}>
              Create mood ({moods.length}/{MAX_MOODS})
            </Text>
          </Pressable>
        )}

        {atLimit && (
          <View style={styles.limitRow}>
            <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.limitText}>
              You've reached the limit of {MAX_MOODS} custom moods.
            </Text>
          </View>
        )}

        {showForm && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>New mood</Text>

            <View style={styles.formBlock}>
              <Text style={styles.fieldLabel}>Name (max 12 chars)</Text>
              <TextInput
                style={styles.nameInput}
                value={label}
                onChangeText={setLabel}
                placeholder="e.g. Nostalgic"
                placeholderTextColor={colors.textDisabled}
                maxLength={12}
                accessibilityLabel="Mood name"
              />

              <Text style={styles.fieldLabel}>Colour</Text>
              <View style={styles.colorGrid}>
                {COLOR_PALETTE.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setSelectedColor(c)}
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: c },
                      selectedColor === c && styles.colorSwatchSelected,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={c}
                    accessibilityState={{ selected: selectedColor === c }}
                  >
                    {selectedColor === c && (
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    )}
                  </Pressable>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Mood type</Text>
              {GROUP_OPTIONS.map((g) => (
                <Pressable
                  key={g.value}
                  onPress={() => setSelectedGroup(g.value)}
                  style={[
                    styles.groupRow,
                    selectedGroup === g.value && styles.groupRowSelected,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedGroup === g.value }}
                >
                  <View style={styles.groupTextBlock}>
                    <Text style={[styles.groupLabel, selectedGroup === g.value && styles.groupLabelSelected]}>
                      {g.label}
                    </Text>
                    <Text style={styles.groupHint}>{g.hint}</Text>
                  </View>
                  {selectedGroup === g.value && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  )}
                </Pressable>
              ))}

              {/* Preview */}
              {label.trim().length >= 2 && (
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Preview:</Text>
                  <View style={[styles.previewBubble, { backgroundColor: selectedColor }]}>
                    <Text style={styles.previewBubbleText}>{label.trim().slice(0, 12)}</Text>
                  </View>
                </View>
              )}

              <View style={styles.formActions}>
                <Pressable
                  style={styles.cancelBtn}
                  onPress={() => { setShowForm(false); setLabel(''); }}
                  accessibilityRole="button"
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.saveBtn, label.trim().length < 2 && styles.saveBtnDisabled]}
                  onPress={handleAdd}
                  disabled={label.trim().length < 2}
                  accessibilityRole="button"
                  accessibilityLabel="Save custom mood"
                >
                  <Text style={styles.saveBtnText}>Save mood</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  heroCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
  heroHeader: { alignItems: 'flex-start' },
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
  section: { gap: spacing.sm },
  sectionLabel: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.ui,
    color: colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  moodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1.2,
    borderColor: '#DCE9FF',
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
  },
  moodDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  moodLabel: {
    flex: 1,
    fontSize: typography.sizes.body,
    fontFamily: typography.fonts.ui,
    color: colors.text,
  },
  moodGroup: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: '#C8DCFF',
    borderRadius: radius.lg,
    borderStyle: 'dashed',
    backgroundColor: '#F7FBFF',
  },
  addButtonText: {
    fontSize: typography.sizes.body,
    color: colors.primary,
    fontFamily: typography.fonts.ui,
  },
  limitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: '#FFF6EC',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#FFE4BF',
  },
  limitText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    flex: 1,
  },
  formBlock: {
    backgroundColor: '#F7FBFF',
    borderWidth: 1.5,
    borderColor: '#C8DCFF',
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  fieldLabel: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.ui,
    color: colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  nameInput: {
    borderWidth: 1.5,
    borderColor: '#C8DCFF',
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    fontSize: typography.sizes.body,
    color: colors.text,
    backgroundColor: '#FFFFFF',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  colorSwatchSelected: {
    borderColor: '#1A1A2E',
    borderWidth: 2.5,
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: '#D0DDFF',
    backgroundColor: '#FFFFFF',
  },
  groupRowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  groupTextBlock: { flex: 1 },
  groupLabel: {
    fontSize: typography.sizes.body,
    fontFamily: typography.fonts.ui,
    color: colors.text,
  },
  groupLabelSelected: { color: colors.primary },
  groupHint: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  previewLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontFamily: typography.fonts.ui,
  },
  previewBubble: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  previewBubbleText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: '#1A1A2E',
    textAlign: 'center',
  },
  formActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: '#D0DDFF',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  cancelText: {
    fontSize: typography.sizes.body,
    color: colors.textSecondary,
    fontFamily: typography.fonts.ui,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: colors.border },
  saveBtnText: {
    fontSize: typography.sizes.body,
    color: colors.textInverse,
    fontWeight: typography.weights.semibold,
  },
});
