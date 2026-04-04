import { View, Text, StyleSheet } from 'react-native';
import { Shiba } from './Shiba';
import { colors, typography, spacing } from '@constants/theme';

interface SplashScreenViewProps {
  onFinish: () => void;
}

export function SplashScreenView({ onFinish }: SplashScreenViewProps) {
  return (
    <View style={styles.container}>
      <Shiba
        variant="happy"
        size={160}
        loop={false}
        autoPlay
        onFinish={onFinish}
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
