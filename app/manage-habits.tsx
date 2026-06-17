import { useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen, BackButton, HabitIcon } from '@components/index';
import { EmptyState } from '@components/EmptyState';
import { SparkleOverlay } from '@components/SparkleOverlay';
import { useHabitsStore } from '@store/habitsStore';
import { PRESET_HABITS, findPreset, HABIT_ICONS, DEFAULT_HABIT_ICON } from '@lib/habitPresets';
import { spacing, typography, radius } from '@constants/theme';
import { useTheme, type ThemePalette } from '@theme/ThemeContext';
import { useThemedStyles } from '@hooks/useThemedStyles';
import { haptics } from '@lib/haptics';
import type { Habit, HabitTrackingType } from '@models/index';

export default function ManageHabitsScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { t } = useTranslation('screens');
  const habits = useHabitsStore((s) => s.habits);
  const addHabit = useHabitsStore((s) => s.addHabit);
  const deleteHabit = useHabitsStore((s) => s.deleteHabit);

  const [customName, setCustomName] = useState('');
  const [customIcon, setCustomIcon] = useState(DEFAULT_HABIT_ICON);
  const [customType, setCustomType] = useState<HabitTrackingType>('boolean');
  const [showCustomForm, setShowCustomForm] = useState(false);

  const existingNames = new Set(habits.map((h) => h.name.toLowerCase()));

  const handleAddPreset = (preset: (typeof PRESET_HABITS)[number]) => {
    if (existingNames.has(preset.name.toLowerCase())) return;
    addHabit(preset);
  };

  const handleAddCustom = () => {
    const name = customName.trim();
    const icon = customIcon || DEFAULT_HABIT_ICON;
    if (name.length < 2) return;
    addHabit({ name, icon, trackingType: customType });
    setCustomName('');
    setCustomIcon(DEFAULT_HABIT_ICON);
    setCustomType('boolean');
    setShowCustomForm(false);
  };

  const handleDelete = (habitId: string, name: string) => {
    Alert.alert(t('manageHabits.deleteTitle'), t('manageHabits.deleteMessage', { name }), [
      { text: t('common:actions.cancel'), style: 'cancel' },
      {
        text: t('manageHabits.deleteAction'),
        style: 'destructive',
        onPress: () => {
          haptics.heavy();
          deleteHabit(habitId);
        },
      },
    ]);
  };

  const getHabitDisplayName = (name: string) => {
    const preset = findPreset(name);
    return preset ? t(`manageHabits.preset.${preset.key}`) : name;
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
          <BackButton variant="onHero" />
        </View>
        <Text style={styles.heroTitle}>{t('manageHabits.heroTitle')}</Text>
        <Text style={styles.heroSubtitle}>{t('manageHabits.heroSubtitle')}</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
        {habits.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('manageHabits.yourHabits')}</Text>
            <View style={styles.habitGrid}>
              {habits.map((h) => (
                <HabitCard
                  key={h.id}
                  habit={h}
                  displayName={getHabitDisplayName(h.name)}
                  onDelete={() => handleDelete(h.id, h.name)}
                />
              ))}
            </View>
          </View>
        )}

        {habits.length === 0 && !showCustomForm && (
          <EmptyState
            illustration="sapling"
            title={t('manageHabits.empty.title')}
            description={t('manageHabits.empty.description')}
            ctaLabel={t('manageHabits.empty.cta')}
            onCtaPress={() => setShowCustomForm(true)}
          />
        )}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('manageHabits.quickAdd')}</Text>
          <View style={styles.presetGrid}>
            {PRESET_HABITS.map((p) => {
              const exists = existingNames.has(p.name.toLowerCase());
              const presetLabel = t(`manageHabits.preset.${p.key}`);
              return (
                <Pressable
                  key={p.key}
                  onPress={() => handleAddPreset(p)}
                  disabled={exists}
                  style={[styles.presetChip, exists && styles.presetChipDisabled]}
                  accessibilityRole="button"
                  accessibilityLabel={exists ? t('manageHabits.alreadyAddedA11y', { name: presetLabel }) : t('manageHabits.addA11y', { name: presetLabel })}
                  accessibilityState={{ disabled: exists }}
                >
                  <HabitIcon icon={p.icon} size={18} color={colors.primary} circle circleSize={34} />
                  <Text style={[styles.presetLabel, exists && styles.presetLabelDisabled]}>
                    {presetLabel}
                  </Text>
                  {!exists && <Ionicons name="add" size={14} color={colors.primary} />}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('manageHabits.customHabit')}</Text>
          {!showCustomForm ? (
            <Pressable
              style={styles.addCustomButton}
              onPress={() => setShowCustomForm(true)}
              accessibilityRole="button"
              accessibilityLabel={t('manageHabits.addCustomA11y')}
            >
              <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
              <Text style={styles.addCustomText}>{t('manageHabits.addCustom')}</Text>
            </Pressable>
          ) : (
            <View style={styles.customForm}>
              <TextInput
                style={[styles.input, styles.nameInput]}
                value={customName}
                onChangeText={setCustomName}
                placeholder={t('manageHabits.namePlaceholder')}
                placeholderTextColor={colors.textDisabled}
                maxLength={30}
                accessibilityLabel={t('manageHabits.nameA11y')}
              />
              <Text style={styles.iconPickerLabel}>{t('manageHabits.chooseIcon')}</Text>
              <View style={styles.iconGrid}>
                {HABIT_ICONS.map((iconKey) => {
                  const selected = customIcon === iconKey;
                  return (
                    <Pressable
                      key={iconKey}
                      onPress={() => {
                        haptics.light();
                        setCustomIcon(iconKey);
                      }}
                      style={[styles.iconOption, selected && styles.iconOptionSelected]}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={t('manageHabits.iconA11y')}
                    >
                      <HabitIcon
                        icon={iconKey}
                        size={20}
                        color={selected ? colors.textInverse : colors.primary}
                      />
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.typeRow}>
                {(['boolean', 'scale'] as HabitTrackingType[]).map((type) => (
                  <Pressable
                    key={type}
                    onPress={() => setCustomType(type)}
                    style={[styles.typePill, customType === type && styles.typePillSelected]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: customType === type }}
                  >
                    <Text style={[styles.typeText, customType === type && styles.typeTextSelected]}>
                      {type === 'boolean' ? t('manageHabits.booleanType') : t('manageHabits.scaleType')}
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
                  <Text style={styles.cancelText}>{t('common:actions.cancel')}</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.addBtn,
                    customName.trim().length < 2 && styles.addBtnDisabled,
                  ]}
                  onPress={handleAddCustom}
                  disabled={customName.trim().length < 2}
                  accessibilityRole="button"
                  accessibilityLabel={t('manageHabits.addHabitA11y')}
                >
                  <Text style={styles.addBtnText}>{t('manageHabits.add')}</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

function HabitCard({
  habit,
  displayName,
  onDelete,
}: {
  habit: Habit;
  displayName: string;
  onDelete: () => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useTranslation('screens');

  return (
    <View style={styles.habitCard}>
      <View style={styles.habitCardTop}>
        <HabitIcon icon={habit.icon} size={20} color={colors.primary} circle circleSize={36} />
        <Pressable
          onPress={onDelete}
          hitSlop={10}
          style={({ pressed }) => [styles.habitCardDelete, pressed && styles.habitCardDeletePressed]}
          accessibilityRole="button"
          accessibilityLabel={t('manageHabits.deleteA11y', { name: displayName })}
        >
          <Ionicons name="trash-outline" size={16} color={colors.textSecondary} />
        </Pressable>
      </View>
      <Text style={styles.habitCardName} numberOfLines={2}>
        {displayName}
      </Text>
      <Text style={styles.habitCardType}>
        {habit.trackingType === 'scale'
          ? t('manageHabits.scaleType')
          : t('manageHabits.booleanType')}
      </Text>
    </View>
  );
}

const createStyles = (colors: ThemePalette) => StyleSheet.create({
  root: {
    flex: 1,
  },
  heroCard: {
    borderRadius: radius.xxl,
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
  habitGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  habitCard: {
    width: '48%',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1.2,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 2,
  },
  habitCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  habitCardDelete: {
    padding: 4,
    borderRadius: radius.full,
  },
  habitCardDeletePressed: {
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  habitCardName: {
    fontSize: typography.sizes.body,
    fontFamily: typography.fonts.ui,
    color: colors.text,
  },
  habitCardType: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  presetGrid: {
    gap: spacing.sm,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
  },
  presetChipDisabled: {
    borderColor: colors.borderLight,
    backgroundColor: colors.background,
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
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderStyle: 'dashed',
    backgroundColor: colors.surface,
  },
  addCustomText: {
    fontSize: typography.sizes.body,
    color: colors.primary,
    fontFamily: typography.fonts.ui,
  },
  customForm: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    fontSize: typography.sizes.body,
    color: colors.text,
    backgroundColor: colors.surfaceElevated,
  },
  nameInput: {
    alignSelf: 'stretch',
  },
  iconPickerLabel: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.ui,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  iconOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
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
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
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
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
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
