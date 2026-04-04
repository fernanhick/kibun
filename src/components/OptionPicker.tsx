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
    color: colors.text,
    marginBottom: spacing.sm,
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
    backgroundColor: colors.primary,
  },
  chipUnselected: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  chipText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  chipTextSelected: {
    // WCAG note: #FFFFFF on #6C63FF = ~4.0:1 — below 4.5:1 AA for text <18px.
    // Pre-existing design system constraint (same as primary Button). Flag for design audit.
    color: colors.textInverse,
  },
  chipTextUnselected: {
    color: colors.text,
  },
});
