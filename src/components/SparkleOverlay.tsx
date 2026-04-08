import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface SparkleOverlayProps {
  variant?: 'hero' | 'card' | 'screen';
  count?: number;
}

const SYMBOLS = ['✦', '✧', '✶', '★', '✴'];

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function pct(value: number): `${number}%` {
  return `${value}%`;
}

export function SparkleOverlay({ variant = 'hero', count }: SparkleOverlayProps) {
  const sparkleCount = count ?? (variant === 'screen' ? 28 : variant === 'card' ? 10 : 20);
  const sparkles = React.useMemo(
    () =>
      Array.from({ length: sparkleCount }, (_, i) => ({
        id: `${variant}-${i}`,
        symbol: SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        top: pct(rand(4, 90)),
        left: pct(rand(4, 92)),
        size: Math.round(rand(8, variant === 'screen' ? 14 : 18)),
        opacity: rand(variant === 'screen' ? 0.08 : 0.2, variant === 'screen' ? 0.2 : 0.65),
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
    <View pointerEvents="none" style={styles.wrap}>
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
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '700',
  },
  heroSparkle: {
    color: 'rgba(255,255,255,0.62)',
  },
  cardSparkle: {
    color: 'rgba(77,132,255,0.3)',
  },
  screenSparkle: {
    color: 'rgba(77,132,255,0.2)',
  },
});
