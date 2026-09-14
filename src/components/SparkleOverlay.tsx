import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@theme/ThemeContext';

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
  const { isDark } = useTheme();
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

  // Sparkle tint has to follow the theme. The old values were hardcoded to the
  // retired sage brand (rgba(76,122,106,…)), which meant the `screen` and
  // `card` sparkles were both the wrong hue AND invisible in dark mode — dark
  // sage on a dark plum ground. `hero` inverts too, because the hero gradient
  // itself inverts: dark rose in light mode, light rose in dark mode.
  const tint = isDark
    ? {
        hero: 'rgba(46,24,34,0.34)',
        card: 'rgba(240,143,173,0.20)',
        screen: 'rgba(240,143,173,0.16)',
      }[variant]
    : {
        hero: 'rgba(255,255,255,0.50)',
        card: 'rgba(176,73,106,0.20)',
        screen: 'rgba(176,73,106,0.14)',
      }[variant];

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
            {
              color: tint,
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
    ...StyleSheet.absoluteFill,
  },
  sparkle: {
    position: 'absolute',
    fontWeight: '600',
  },
});
