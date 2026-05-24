import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '@components/Card';
import { SpringPressable } from '@components/SpringPressable';
import { colors, radius, spacing, typography } from '@constants/theme';
import type { InsightCard as InsightCardData } from '@lib/correlationInsights';

interface InsightCardProps {
  card: InsightCardData;
}

const ACCENTS: Record<InsightCardData['kind'], { border: string; tint: string }> = {
  positiveCorrelation: { border: '#AED581', tint: '#F1F8E9' },
  lowMoodNudge: { border: '#F8BBD0', tint: '#FFF5F9' },
};

export function InsightCard({ card }: InsightCardProps) {
  const router = useRouter();
  const accent = ACCENTS[card.kind];

  const inner = (
    <Card
      style={[styles.card, { borderColor: accent.border, backgroundColor: accent.tint }]}
      accessibilityRole={card.habitId ? 'button' : undefined}
      accessibilityLabel={`${card.title}. ${card.body}`}
    >
      <Text style={styles.emoji}>{card.emoji}</Text>
      <View style={styles.body}>
        <Text style={styles.title}>{card.title}</Text>
        <Text style={styles.bodyText}>{card.body}</Text>
      </View>
    </Card>
  );

  if (card.habitId) {
    return (
      <SpringPressable onPress={() => router.push('/manage-habits')} style={styles.pressable}>
        {inner}
      </SpringPressable>
    );
  }
  return <View style={styles.pressable}>{inner}</View>;
}

const styles = StyleSheet.create({
  pressable: {
    marginBottom: spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    borderRadius: radius.card,
    borderWidth: 0.5,
  },
  emoji: {
    fontSize: 32,
    lineHeight: 38,
  },
  body: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    fontFamily: typography.fonts.ui,
    fontSize: typography.sizes.body,
    color: colors.text,
  },
  bodyText: {
    fontFamily: typography.fonts.body,
    fontSize: typography.sizes.sm,
    lineHeight: typography.sizes.sm * typography.lineHeights.normal,
    color: colors.textSecondary,
  },
});
