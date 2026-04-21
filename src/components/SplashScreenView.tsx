import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { getMascotSource } from '@constants/mascotAnimations';
import { colors, typography, spacing } from '@constants/theme';

interface SplashScreenViewProps {
  onFinish: () => void;
}

export function SplashScreenView({ onFinish }: SplashScreenViewProps) {
  useEffect(() => {
    const timer = setTimeout(onFinish, 2500);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <View style={styles.container}>
      <Image
        source={getMascotSource('happy')}
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
