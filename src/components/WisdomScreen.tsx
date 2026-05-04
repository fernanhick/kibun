import { useEffect, useRef } from 'react';
import { Animated, Easing, View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from './Screen';
import { Button } from './Button';
import { OnboardingProgress } from './OnboardingProgress';
import { getMascotSource, type MascotVariant } from '@constants/mascotAnimations';
import { colors, typography, spacing } from '@constants/theme';

interface Props {
  step: number;
  total: number;
  mascot: MascotVariant;
  headline: string;
  body: string;
  onContinue: () => void;
}

const MASCOT_SIZE = 160;

export function WisdomScreen({ step, total, mascot, headline, body, onContinue }: Props) {
  const router = useRouter();
  const floatAnim = useRef(new Animated.Value(0)).current;

  // Same gentle bob as Shiba's `floating` prop — keeps the visual rhythm consistent.
  useEffect(() => {
    const loopAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -4,
          duration: 1700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loopAnim.start();
    return () => loopAnim.stop();
  }, [floatAnim]);

  return (
    <Screen scrollable={true} edgePadding="large" contentContainerStyle={styles.content}>
      <LinearGradient
        colors={[colors.skyStart, colors.skyEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <OnboardingProgress current={step} total={total} style={styles.progress} />
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={12}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textInverse} />
        </Pressable>
        <View style={styles.shibaWrap}>
          <Animated.View
            style={{
              width: MASCOT_SIZE,
              height: MASCOT_SIZE,
              transform: [{ translateY: floatAnim }],
            }}
            accessibilityLabel={`Mascot ${mascot}`}
            accessibilityRole="image"
          >
            <Image
              source={getMascotSource(mascot)}
              style={{ width: MASCOT_SIZE, height: MASCOT_SIZE }}
              contentFit="contain"
              autoplay
            />
          </Animated.View>
        </View>
        <Text style={styles.headline}>{headline}</Text>
        <Text style={styles.body}>{body}</Text>
      </LinearGradient>

      <Button label="Continue" onPress={onContinue} variant="sunrise" fullWidth />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.lg,
  },
  progress: {
    alignSelf: 'flex-end',
    marginBottom: spacing.xs,
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: spacing.xs,
  },
  heroCard: {
    borderRadius: 28,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  shibaWrap: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  headline: {
    fontFamily: typography.fonts.display,
    fontSize: typography.sizes.xxl,
    color: colors.textInverse,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  body: {
    fontFamily: typography.fonts.body,
    fontSize: typography.sizes.body,
    color: colors.sparkle,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: spacing.xs,
  },
});
