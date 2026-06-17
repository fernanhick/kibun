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
  const emptyColor =
    tone === 'light' ? 'rgba(255,255,255,0.35)' : 'rgba(76,122,106,0.25)';

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
    width: spacing.xs,
    height: spacing.xs,
    borderRadius: radius.full,
  },
});
