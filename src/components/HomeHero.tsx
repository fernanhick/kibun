import { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { haptics } from '@lib/haptics';
import { typography, spacing, radius, motion, elevation } from '@constants/theme';
import { useTheme, type ThemeValue } from '@theme/ThemeContext';
import { useReducedMotion } from '@hooks/useReducedMotion';
import { useResponsive } from '@hooks/useResponsive';
import {
  getMascotSource,
  getMascotVariant,
  MASCOT_VARIANTS,
  type MascotVariant,
} from '@constants/mascotAnimations';
import { SparkleOverlay } from './SparkleOverlay';

// ─── HomeHero ─────────────────────────────────────────────────────────────────
// The Shiba's new home. It used to sit in the middle of the tab bar at 140px,
// which cost 63dp of permanent bottom overlap on every screen in the app and
// still rendered the character small, cropped by the notch cutout, and beside
// four navigation icons competing for attention.
//
// Here it gets to be the thing you look at first — the Finch model, where the
// character anchors the home screen and the chrome stays ordinary. Tapping it
// still cycles the mascot variants (the interaction moved with it), now with a
// Reanimated spring instead of the legacy Animated API.
interface HomeHeroProps {
  greeting: string;
  message: string;
  streak: number;
  /** Drives which mascot art is shown — the most recently logged mood. */
  lastMoodId?: string;
}

export function HomeHero({ greeting, message, streak, lastMoodId }: HomeHeroProps) {
  const theme = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation('screens');
  const reducedMotion = useReducedMotion();
  const responsive = useResponsive();

  // A new check-in resets the mascot to that mood's art, overriding whatever
  // the user last cycled to by tapping.
  //
  // The override is stamped with the mood it was chosen against rather than
  // being cleared by an effect. The old tab-bar version ran
  // `useEffect(() => setVariantOverride(null), [lastMoodId])`, which is a
  // synchronous setState inside an effect — it renders the stale mascot for one
  // frame and then re-renders, and React's own lint rule flags it. Deriving the
  // active variant during render has neither problem.
  const [override, setOverride] = useState<{ forMoodId?: string; variant: MascotVariant } | null>(
    null,
  );
  const variantOverride = override && override.forMoodId === lastMoodId ? override.variant : null;

  const pop = useSharedValue(1);
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  const handleMascotPress = () => {
    haptics.light();
    const current = variantOverride ?? getMascotVariant(lastMoodId);
    const nextIndex = (MASCOT_VARIANTS.indexOf(current) + 1) % MASCOT_VARIANTS.length;
    setOverride({ forMoodId: lastMoodId, variant: MASCOT_VARIANTS[nextIndex]! });

    if (!reducedMotion) {
      pop.value = withSequence(
        withSpring(motion.scale.pop, motion.spring.celebrate),
        withSpring(1, motion.spring.bouncy),
      );
    }
  };

  const mascotSize = responsive.select({
    phone: 108,
    phoneWide: 116,
    tablet: 140,
    tabletLg: 156,
  });

  return (
    <LinearGradient
      colors={[colors.skyStart, colors.skyEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}
    >
      <SparkleOverlay count={9} />

      <View style={styles.row}>
        <Pressable
          onPress={handleMascotPress}
          accessibilityRole="button"
          accessibilityLabel={t('tabs.mascotA11y')}
          hitSlop={8}
        >
          <Reanimated.View style={popStyle}>
            <Image
              source={getMascotSource(variantOverride ?? lastMoodId)}
              style={{ width: mascotSize, height: mascotSize }}
              contentFit="contain"
              autoplay
            />
          </Reanimated.View>
        </Pressable>

        <View style={styles.textCol}>
          <Text style={styles.greeting} accessibilityRole="header">
            {greeting}
          </Text>
          <Text style={styles.message}>{message}</Text>

          {streak > 0 && (
            <View
              style={styles.streakChip}
              accessibilityLabel={t('home.streakA11y', { count: streak })}
            >
              <Ionicons name="flame" size={13} color={colors.onPrimary} />
              <Text style={styles.streakText}>{t('home.streak', { count: streak })}</Text>
            </View>
          )}
        </View>
      </View>
    </LinearGradient>
  );
}

const createStyles = ({ colors, isDark }: ThemeValue) =>
  StyleSheet.create({
    hero: {
      borderRadius: radius.xxl,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.lg,
      marginTop: spacing.xs,
      overflow: 'hidden',
      ...elevation(2, isDark),
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    textCol: {
      flex: 1,
      gap: 6,
    },
    greeting: {
      ...typography.styles.title,
      fontFamily: typography.fonts.display,
      color: colors.onPrimary,
    },
    message: {
      ...typography.styles.callout,
      color: colors.sparkle,
    },
    // A glass chip rather than the old bordered pill. On a gradient a tinted
    // border reads as a sticker; a translucent white wash reads as depth.
    streakChip: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginTop: 2,
      paddingVertical: 5,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.badge,
      backgroundColor: isDark ? 'rgba(26,17,22,0.16)' : 'rgba(255,255,255,0.20)',
    },
    streakText: {
      ...typography.styles.caption,
      fontFamily: typography.fonts.bodyBold,
      color: colors.onPrimary,
    },
  });
