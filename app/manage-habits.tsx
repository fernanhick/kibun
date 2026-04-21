import { useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '@components/index';
import { SparkleOverlay } from '@components/SparkleOverlay';
import { useHabitsStore } from '@store/habitsStore';
import { colors, spacing, typography, radius } from '@constants/theme';
import type { HabitTrackingType } from '@models/index';

const PRESET_HABITS: { name: string; icon: string; trackingType: HabitTrackingType }[] = [
  { name: 'Sleep quality', icon: '😴', trackingType: 'scale' },
  { name: 'Exercise',      icon: '🏃', trackingType: 'boolean' },
  { name: 'Meditated',     icon: '🧘', trackingType: 'boolean' },
  { name: 'Socialised',    icon: '👫', trackingType: 'boolean' },
  { name: 'Alcohol',       icon: '🍺', trackingType: 'boolean' },
];

export default function ManageHabitsScreen() {
  const router = useRouter();
  const habits = useHabitsStore((s) => s.habits);
  const addHabit = useHabitsStore((s) => s.addHabit);
  const deleteHabit = useHabitsStore((s) => s.deleteHabit);

  const [customName, setCustomName] = useState('');
  const [customIcon, setCustomIcon] = useState('');
  const [customType, setCustomType] = useState<HabitTrackingType>('boolean');
  const [showCustomForm, setShowCustomForm] = useState(false);

  const existingNames = new Set(habits.map((h) => h.name.toLowerCase()));

  const handleAddPreset = (preset: (typeof PRESET_HABITS)[number]) => {
    if (existingNames.has(preset.name.toLowerCase())) return;
    addHabit(preset);
  };

  const handleAddCustom = () => {
    const name = customName.trim();
    const icon = customIcon.trim() || '✓';
    if (name.length < 2) return;
    addHabit({ name, icon, trackingType: customType });
    setCustomName('');
    setCustomIcon('');
    setCustomType('boolean');
    setShowCustomForm(false);
  };

  const handleDelete = (habitId: string, name: string) => {
    Alert.alert('Delete habit', `Remove "${name}" and all its logs?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteHabit(habitId) },
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
        <Text style={styles.heroTitle}>My Habits</Text>
        <Text style={styles.heroSubtitle}>Track daily behaviours alongside your mood</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
        {habits.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Your habits</Text>
            {habits.map((h) => (
              <View key={h.id} style={styles.habitRow}>
                <Text style={styles.habitIcon}>{h.icon}</Text>
                <View style={styles.habitInfo}>
                  <Text style={styles.habitName}>{h.name}</Text>
                  <Text style={styles.habitType}>
                    {h.trackingType === 'scale' ? '1–5 scale' : 'Yes / No'}
                  </Text>
                </View>
                <Pressable
                  onPress={() => handleDelete(h.id, h.name)}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete ${h.name}`}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.textSecondary} />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Quick add</Text>
          <View style={styles.presetGrid}>
            {PRESET_HABITS.map((p) => {
              const exists = existingNames.has(p.name.toLowerCase());
              return (
                <Pressable
                  key={p.name}
                  onPress={() => handleAddPreset(p)}
                  disabled={exists}
                  style={[styles.presetChip, exists && styles.presetChipDisabled]}
                  accessibilityRole="button"
                  accessibilityLabel={exists ? `${p.name} already added` : `Add ${p.name}`}
                  accessibilityState={{ disabled: exists }}
                >
                  <Text style={styles.presetIcon}>{p.icon}</Text>
                  <Text style={[styles.presetLabel, exists && styles.presetLabelDisabled]}>
                    {p.name}
                  </Text>
                  {!exists && <Ionicons name="add" size={14} color={colors.primary} />}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Custom habit</Text>
          {!showCustomForm ? (
            <Pressable
              style={styles.addCustomButton}
              onPress={() => setShowCustomForm(true)}
              accessibilityRole="button"
              accessibilityLabel="Add a custom habit"
            >
              <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
              <Text style={styles.addCustomText}>Add custom habit</Text>
            </Pressable>
          ) : (
            <View style={styles.customForm}>
              <View style={styles.customInputRow}>
                <TextInput
                  style={[styles.input, styles.iconInput]}
                  value={customIcon}
                  onChangeText={setCustomIcon}
                  placeholder="🌟"
                  placeholderTextColor={colors.textDisabled}
                  maxLength={2}
                  accessibilityLabel="Habit emoji icon"
                />
                <TextInput
                  style={[styles.input, styles.nameInput]}
                  value={customName}
                  onChangeText={setCustomName}
                  placeholder="Habit name"
                  placeholderTextColor={colors.textDisabled}
                  maxLength={30}
                  accessibilityLabel="Habit name"
                />
              </View>
              <View style={styles.typeRow}>
                {(['boolean', 'scale'] as HabitTrackingType[]).map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => setCustomType(t)}
                    style={[styles.typePill, customType === t && styles.typePillSelected]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: customType === t }}
                  >
                    <Text style={[styles.typeText, customType === t && styles.typeTextSelected]}>
                      {t === 'boolean' ? 'Yes / No' : '1–5 Scale'}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.customActions}>
                <Pressable
                  style={styles.cancelBtn}
                  onPress={() => setShowCustomForm(false)}
                  accessibilityRole="button"
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.addBtn,
                    customName.trim().length < 2 && styles.addBtnDisabled,
                  ]}
                  onPress={handleAddCustom}
                  disabled={customName.trim().length < 2}
                  accessibilityRole="button"
                  accessibilityLabel="Add habit"
                >
                  <Text style={styles.addBtnText}>Add</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
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
    alignItems: 'flex-start',
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
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1.2,
    borderColor: '#DCE9FF',
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  habitIcon: {
    fontSize: 22,
  },
  habitInfo: {
    flex: 1,
  },
  habitName: {
    fontSize: typography.sizes.body,
    fontFamily: typography.fonts.ui,
    color: colors.text,
  },
  habitType: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  presetGrid: {
    gap: spacing.sm,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1.5,
    borderColor: '#C8DCFF',
    borderRadius: radius.lg,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
  },
  presetChipDisabled: {
    borderColor: '#E8EEF8',
    backgroundColor: '#F5F8FF',
  },
  presetIcon: {
    fontSize: 20,
  },
  presetLabel: {
    flex: 1,
    fontSize: typography.sizes.body,
    fontFamily: typography.fonts.ui,
    color: colors.text,
  },
  presetLabelDisabled: {
    color: colors.textDisabled,
  },
  addCustomButton: {
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
  addCustomText: {
    fontSize: typography.sizes.body,
    color: colors.primary,
    fontFamily: typography.fonts.ui,
  },
  customForm: {
    backgroundColor: '#F7FBFF',
    borderWidth: 1.5,
    borderColor: '#C8DCFF',
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  customInputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#C8DCFF',
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    fontSize: typography.sizes.body,
    color: colors.text,
    backgroundColor: '#FFFFFF',
  },
  iconInput: {
    width: 48,
    textAlign: 'center',
  },
  nameInput: {
    flex: 1,
  },
  typeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  typePill: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: '#D0DDFF',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  typePillSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  typeText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.ui,
    color: colors.text,
  },
  typeTextSelected: {
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
  customActions: {
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
  addBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  addBtnDisabled: {
    backgroundColor: colors.border,
  },
  addBtnText: {
    fontSize: typography.sizes.body,
    color: colors.textInverse,
    fontWeight: typography.weights.semibold,
  },
});
