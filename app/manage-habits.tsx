import { useRef, useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, StyleSheet, Alert } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen, BackButton } from '@components/index';
import { SparkleOverlay } from '@components/SparkleOverlay';
import { useHabitsStore } from '@store/habitsStore';
import { colors, spacing, typography, radius } from '@constants/theme';
import { haptics } from '@lib/haptics';
import type { Habit, HabitTrackingType } from '@models/index';

const PRESET_HABITS: { key: string; name: string; icon: string; trackingType: HabitTrackingType }[] = [
  { key: 'sleepQuality', name: 'Sleep quality', icon: '😴', trackingType: 'scale' },
  { key: 'exercise', name: 'Exercise', icon: '🏃', trackingType: 'boolean' },
  { key: 'meditated', name: 'Meditated', icon: '🧘', trackingType: 'boolean' },
  { key: 'socialised', name: 'Socialised', icon: '👫', trackingType: 'boolean' },
  { key: 'alcohol', name: 'Alcohol', icon: '🍺', trackingType: 'boolean' },
];

export default function ManageHabitsScreen() {
  const router = useRouter();
  const { t } = useTranslation('screens');
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
    const preset = PRESET_HABITS.find((p) => p.name.toLowerCase() === name.toLowerCase());
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
            {habits.map((h) => (
              <HabitSwipeRow
                key={h.id}
                habit={h}
                displayName={getHabitDisplayName(h.name)}
                onDelete={() => handleDelete(h.id, h.name)}
              />
            ))}
          </View>
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
                  <Text style={styles.presetIcon}>{p.icon}</Text>
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
              <View style={styles.customInputRow}>
                <TextInput
                  style={[styles.input, styles.iconInput]}
                  value={customIcon}
                  onChangeText={setCustomIcon}
                  placeholder="🌟"
                  placeholderTextColor={colors.textDisabled}
                  maxLength={2}
                  accessibilityLabel={t('manageHabits.iconA11y')}
                />
                <TextInput
                  style={[styles.input, styles.nameInput]}
                  value={customName}
                  onChangeText={setCustomName}
                  placeholder={t('manageHabits.namePlaceholder')}
                  placeholderTextColor={colors.textDisabled}
                  maxLength={30}
                  accessibilityLabel={t('manageHabits.nameA11y')}
                />
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

function HabitSwipeRow({
  habit,
  displayName,
  onDelete,
}: {
  habit: Habit;
  displayName: string;
  onDelete: () => void;
}) {
  const { t } = useTranslation('screens');
  const swipeRef = useRef<Swipeable>(null);

  const renderRightActions = () => (
    <View style={styles.swipeActionsWrap}>
      <Pressable
        onPress={() => {
          swipeRef.current?.close();
          onDelete();
        }}
        style={styles.swipeDeleteButton}
        accessibilityRole="button"
        accessibilityLabel={t('manageHabits.deleteA11y', { name: displayName })}
      >
        <Ionicons name="trash-outline" size={20} color={colors.textInverse} />
        <Text style={styles.swipeDeleteLabel} maxFontSizeMultiplier={1.2}>
          {t('manageHabits.deleteAction')}
        </Text>
      </Pressable>
    </View>
  );

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={renderRightActions}
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      containerStyle={styles.swipeContainer}
    >
      <View style={styles.habitRow}>
        <Text style={styles.habitIcon}>{habit.icon}</Text>
        <View style={styles.habitInfo}>
          <Text style={styles.habitName}>{displayName}</Text>
          <Text style={styles.habitType}>
            {habit.trackingType === 'scale'
              ? t('manageHabits.scaleType')
              : t('manageHabits.booleanType')}
          </Text>
        </View>
      </View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  swipeContainer: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  swipeActionsWrap: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingLeft: spacing.sm,
  },
  swipeDeleteButton: {
    width: 84,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error,
    borderRadius: radius.lg,
    gap: 4,
  },
  swipeDeleteLabel: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.ui,
    color: colors.textInverse,
    fontWeight: typography.weights.semibold,
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
