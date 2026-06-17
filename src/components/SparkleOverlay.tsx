import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface SparkleOverlayProps {
  variant?: 'hero' | 'card' | 'screen';
  count?: number;
}

// Subtle diamonds only — the filled stars (★ ✴ ✶) read as "kids glitter".
const SYMBOLS = ['✦', '✧'];

// Per-variant ceilings + opacity ranges. Callers still pass `count`, but it's
// capped here so the whole app reads as an ambient premium shimmer rather than
// a confetti spray. Tune these two knobs to dial the effect app-wide.
const VARIANT = {
  hero:   { cap: 9,  defaultCount: 9,  minOp: 0.10, maxOp: 0.26, maxSize: 14 },
  card:   { cap: 5,  defaultCount: 5,  minOp: 0.05, maxOp: 0.12, maxSize: 12 },
  screen: { cap: 12, defaultCount: 12, minOp: 0.04, maxOp: 0.10, maxSize: 11 },
} as const;

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function pct(value: number): `${number}%` {
  return `${value}%`;
}

export function SparkleOverlay({ variant = 'hero', count }: SparkleOverlayProps) {
  const cfg = VARIANT[variant];
  const sparkleCount = Math.min(count ?? cfg.defaultCount, cfg.cap);
  const sparkles = React.useMemo(
    () =>
      Array.from({ length: sparkleCount }, (_, i) => ({
        id: `${variant}-${i}`,
        symbol: SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        top: pct(rand(4, 90)),
        left: pct(rand(4, 92)),
        size: Math.round(rand(7, cfg.maxSize)),
        opacity: rand(cfg.minOp, cfg.maxOp),
      })),
    [sparkleCount, variant]
  );

  const tintStyle =
    variant === 'card'
      ? styles.cardSparkle
      : variant === 'screen'
        ? styles.screenSparkle
        : styles.heroSparkle;

  return (
    <View
      pointerEvents="none"
      style={styles.wrap}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {sparkles.map((s) => (
        <Text
          key={s.id}
          style={[
            styles.sparkle,
            tintStyle,
            {
              top: s.top,
              left: s.left,
              fontSize: s.size,
              opacity: s.opacity,
            },
          ]}
        >
          {s.symbol}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
  },
  sparkle: {
    position: 'absolute',
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
  },
  heroSparkle: {
    color: 'rgba(255,255,255,0.5)',
  },
  cardSparkle: {
    color: 'rgba(76,122,106,0.22)',
  },
  screenSparkle: {
    color: 'rgba(76,122,106,0.16)',
  },
});
