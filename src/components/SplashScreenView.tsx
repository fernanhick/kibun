import { useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';
import { colors, typography, spacing } from '@constants/theme';

interface SplashScreenViewProps {
  onFinish: () => void;
}

export function SplashScreenView({ onFinish }: SplashScreenViewProps) {
  const animRef = useRef<LottieView>(null);

  return (
    <View style={styles.container}>
      <LottieView
        ref={animRef}
        source={require('../assets/lottie/shiba-happy.json')}
        style={styles.mascot}
        autoPlay
        loop={false}
        onAnimationFinish={onFinish}
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
