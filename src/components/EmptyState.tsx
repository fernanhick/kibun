import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing, radius } from '@constants/theme';
import { Button } from '@components/Button';
import { Sapling } from '@components/illustrations/Sapling';
import { ChartBars } from '@components/illustrations/ChartBars';

type Illustration = 'sapling' | 'chart';

interface EmptyStateProps {
  illustration: Illustration;
  title: string;
  description?: string;
  ctaLabel?: string;
  onCtaPress?: () => void;
  illustrationSize?: number;
}

function withAlpha(hex: string, alpha: number): string {
  const a = Math.max(0, Math.min(1, alpha));
  return hex + Math.round(a * 255).toString(16).padStart(2, '0');
}

export function EmptyState({
  illustration,
  title,
  description,
  ctaLabel,
  onCtaPress,
  illustrationSize = 140,
}: EmptyStateProps) {
  const accent = colors.accent;
  const soilTint = withAlpha(accent, 0.18);
  const trackTint = colors.border;

  let illust: React.ReactNode = null;
  switch (illustration) {
    case 'sapling':
      illust = <Sapling size={illustrationSize} accent={accent} soilTint={soilTint} />;
      break;
    case 'chart':
      illust = <ChartBars size={illustrationSize} accent={accent} trackTint={trackTint} />;
      break;
  }

  return (
    <View style={styles.wrap} accessibilityRole="summary">
      <View style={styles.illustWrap}>{illust}</View>
      <Text style={styles.title} maxFontSizeMultiplier={1.4} accessibilityRole="header">
        {title}
      </Text>
      {description ? (
        <Text style={styles.description} maxFontSizeMultiplier={1.4}>
          {description}
        </Text>
      ) : null}
      {ctaLabel && onCtaPress ? (
        <View style={styles.ctaWrap}>
          <Button label={ctaLabel} onPress={onCtaPress} variant="sunrise" size="md" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  illustWrap: {
    marginBottom: spacing.md,
  },
  title: {
    textAlign: 'center',
    fontFamily: typography.fonts.ui,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  description: {
    textAlign: 'center',
    fontFamily: typography.fonts.body,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: typography.sizes.sm * typography.lineHeights.normal,
    maxWidth: 280,
    marginBottom: spacing.md,
  },
  ctaWrap: {
    marginTop: spacing.xs,
    borderRadius: radius.button,
  },
});
