import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { PickerOption } from '@models/index';
import { colors, typography, spacing, radius } from '@constants/theme';

interface OptionPickerProps {
  label: string;
  options: PickerOption[];
  selected: string | null;
  onSelect: (value: string) => void;
  accessibilityLabel?: string;
}

export function OptionPicker({
  label,
  options,
  selected,
  onSelect,
  accessibilityLabel,
}: OptionPickerProps) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <View
        style={styles.chipsRow}
        accessibilityRole="radiogroup"
        accessibilityLabel={accessibilityLabel ?? label}
      >
        {options.map((option) => {
          const isSelected = selected === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onSelect(option.value)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              style={[styles.chip, isSelected ? styles.chipSelected : styles.chipUnselected]}
              accessibilityRole="radio"
              // WCAG: 'radio' role uses .checked (not .selected) — see 02-02-AUDIT.md M1
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={option.label}
            >
              <Text style={[styles.chipText, isSelected ? styles.chipTextSelected : styles.chipTextUnselected]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.primaryDark,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
  },
  chipSelected: {
    backgroundColor: colors.warmCtaStart,
    borderWidth: 1,
    borderColor: colors.warmCtaEnd,
  },
  chipUnselected: {
    backgroundColor: colors.chipSurface,
    borderWidth: 1,
    borderColor: colors.chipBorder,
  },
  chipText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  chipTextSelected: {
    color: colors.textInverse,
  },
  chipTextUnselected: {
    color: colors.text,
  },
});
