import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { colors, typography, spacing } from '@constants/theme';

const SPLASH_IMAGE = require('../../assets/webp animation/mascot-happy.webp');

interface SplashScreenViewProps {
  onFinish: () => void;
}

export function SplashScreenView({ onFinish }: SplashScreenViewProps) {
  // The animated WebP loops indefinitely — fire onFinish after one
  // visual cycle so the app can proceed past the splash screen.
  useEffect(() => {
    const timer = setTimeout(onFinish, 3000);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <View style={styles.container}>
      <Image
        source={SPLASH_IMAGE}
        style={styles.mascot}
        contentFit="contain"
        autoplay
      />
      <Text style={styles.title}>kibun</Text>
      <Text style={styles.subtitle}>気分</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  mascot: {
    width: 250,
    height: 250,
  },
  title: {
    fontSize: typography.sizes.display,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginTop: spacing.md,
  },
  subtitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.regular,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
