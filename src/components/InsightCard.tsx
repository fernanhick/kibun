import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Card } from '@components/Card';
import { SpringPressable } from '@components/SpringPressable';
import { radius, spacing, typography } from '@constants/theme';
import { useTheme, type ThemeValue } from '@theme/ThemeContext';
import { INSIGHT_CARD_IMAGES } from '@lib/achievements';
import type { InsightCard as InsightCardData } from '@lib/correlationInsights';

// ─── InsightCard ──────────────────────────────────────────────────────────────
// This component used to import `colors` STATICALLY from @constants/theme rather
// than through useTheme(), which pinned every one of its colours to the light
// palette — it would have rendered dark text on a pale green card in dark mode.
// It was the only component in the app with that bug (app/_layout.tsx also
// imports the static palette, but only for the ErrorBoundary fallback, which
// deliberately renders ABOVE ThemeProvider and so cannot read the context).
//
// The two hardcoded pastel accents (#AED581/#F1F8E9 and #F8BBD0/#FFF5F9) are now
// palette tints, which also puts them on the app's one-accent system:
//   positiveCorrelation → secondary (sage: growth, "this habit is working")
//   lowMoodNudge        → primary   (rose: care, "here's something to try")
interface InsightCardProps {
  card: InsightCardData;
}

export function InsightCard({ card }: InsightCardProps) {
  const router = useRouter();
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const tint =
    card.kind === 'positiveCorrelation'
      ? theme.colors.secondaryLight
      : theme.colors.primaryLight;

  const inner = (
    <Card
      variant="tinted"
      tint={tint}
      style={styles.card}
      accessibilityRole={card.habitId ? 'button' : undefined}
      accessibilityLabel={`${card.title}. ${card.body}`}
    >
      <Image
        source={INSIGHT_CARD_IMAGES[card.imageKey]}
        style={styles.illustration}
        contentFit="contain"
        accessibilityIgnoresInvertColors
      />
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

const createStyles = ({ colors }: ThemeValue) => StyleSheet.create({
  pressable: {
    marginBottom: spacing.sm,
  },
  // No border: `tinted` carries the surface on fill alone. The old version had
  // a 0.5px border AND a tint, which is the double-cue pattern the redesign
  // removed everywhere else.
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    borderRadius: radius.card,
  },
  illustration: {
    width: 56,
    height: 56,
  },
  body: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    fontFamily: typography.fonts.bodyBold,
    fontSize: typography.sizes.md,
    color: colors.text,
  },
  bodyText: {
    fontFamily: typography.fonts.body,
    fontSize: typography.sizes.sm,
    lineHeight: typography.sizes.sm * typography.lineHeights.normal,
    color: colors.textSecondary,
  },
});
