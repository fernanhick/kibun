import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { spacing, radius } from '@constants/theme';
import { useTheme } from '@theme/ThemeContext';

interface Props {
  current: number;
  total: number;
  /** 'light' for hero gradients (white dots), 'dark' for plain backgrounds. */
  tone?: 'light' | 'dark';
  style?: StyleProp<ViewStyle>;
}

export function OnboardingProgress({ current, total, tone = 'light', style }: Props) {
  const { t } = useTranslation('screens');
  const { colors } = useTheme();
  const filledColor = tone === 'light' ? colors.textInverse : colors.primary;
  // The on-background empty dot was hardcoded `rgba(76,122,106,0.25)` — the
  // RETIRED sage brand (#4C7A6A), the same literal SparkleOverlay was caught
  // holding and purged. It never tracked the theme, so it read as a muddy
  // green-grey on the blush-cream ground and all but vanished in dark mode.
  // `border` is the token for "present but subordinate" and resolves in both.
  const emptyColor =
    tone === 'light' ? 'rgba(255,255,255,0.35)' : colors.border;

  return (
    <View
      style={[styles.row, style]}
      accessibilityRole="progressbar"
      accessibilityLabel={t('components.onboardingProgress.a11y', { current, total })}
      accessibilityValue={{ min: 1, max: total, now: current }}
    >
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            { backgroundColor: i < current ? filledColor : emptyColor },
          ]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
  },
  dot: {
    // Explicit px rather than spacing.xs: a dot's DIAMETER is a size, not a
    // gap, and borrowing the spacing scale for it left a six-step pager
    // rendering as near-invisible specks. 8dp is the smallest that still reads
    // as a step at arm's length.
    width: 8,
    height: 8,
    borderRadius: radius.full,
  },
});
