import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { RenderProps } from 'react-native-spotlight-tour';
import { colors, typography, spacing, radius, shadows } from '@constants/theme';

interface TourTooltipProps extends RenderProps {
  text: string;
  emoji?: string;
  total: number;
}

export function TourTooltip({ text, emoji = '✨', current, next, stop, isLast, total }: TourTooltipProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.body}>{text}</Text>
      <View style={styles.footer}>
        <View style={styles.dots}>
          {Array.from({ length: total }).map((_, i) => (
            <View key={i} style={[styles.dot, i === current && styles.dotActive]} />
          ))}
        </View>
        <View style={styles.actions}>
          <Pressable onPress={stop} hitSlop={8}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
          <Pressable onPress={next} style={styles.nextBtn}>
            <Text style={styles.nextText}>{isLast ? 'Got it!' : 'Next →'}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: colors.chipBorder,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    maxWidth: 260,
    gap: spacing.sm,
    ...shadows.md,
  },
  emoji: {
    fontSize: 24,
    textAlign: 'center',
  },
  body: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.body,
    color: colors.text,
    lineHeight: typography.sizes.md * typography.lineHeights.normal,
    textAlign: 'center',
  },
  footer: {
    gap: spacing.sm,
  },
  dots: {
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 18,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.ui,
    color: colors.textSecondary,
  },
  nextBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
  },
  nextText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.ui,
    color: colors.textInverse,
  },
});
