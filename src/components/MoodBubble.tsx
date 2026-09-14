import { memo, useEffect } from 'react';
import { Image, Pressable, Text, View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { MoodDefinition, MOOD_MAP, MOODS, MoodGroup } from '@constants/moods';
import { MOOD_IMAGES, normalizeMoodImageKey } from '@constants/moodImages';
import { typography, spacing, radius, motion } from '@constants/theme';
import { useTheme } from '@theme/ThemeContext';
import { getContentScale } from '@constants/layout';
import { useResponsive } from '@hooks/useResponsive';
import { useReducedMotion } from '@hooks/useReducedMotion';
import { haptics } from '@lib/haptics';
import { staggerEntering } from './Stagger';

interface MoodBubbleProps {
  mood: MoodDefinition;
  size?: 'xs' | 'smCompact' | 'sm' | 'md' | 'mdCompact' | 'lg' | 'xl';
  selected?: boolean;
  onPress?: (mood: MoodDefinition) => void;
  disabled?: boolean;
  showLabel?: boolean;
  showGradient?: boolean;
  labelColor?: string;
  /** Explicit pixel size (width + image) — bypasses the size token + tablet scale. */
  sizeOverride?: number;
  /**
   * Position in a mood grid. Supplying it gives the bubble a staggered entrance
   * on mount. Applied to this component's OWN root rather than by wrapping it in
   * a `<Stagger>`, so an 18-cell grid does not gain 18 extra layout nodes.
   */
  staggerIndex?: number;
}

const BONE_SIZES = {
  xs: { width: 46, imageSize: 46 },
  smCompact: { width: 56, imageSize: 56 },
  sm: { width: 74, imageSize: 48 },
  md: { width: 90, imageSize: 60 },
  mdCompact: { width: 78, imageSize: 78 },
  lg: { width: 110, imageSize: 76 },
  xl: { width: 140, imageSize: 96 },
} as const;

const FONT_SIZES = {
  xs: typography.sizes.xs,
  smCompact: typography.sizes.xs,
  sm: typography.sizes.xs,
  md: typography.sizes.sm,
  mdCompact: typography.sizes.sm,
  lg: typography.sizes.md,
  xl: typography.sizes.lg,
} as const;

const GROUP_GRADIENTS: Record<MoodGroup, string[]> = {
  // Positive: forest green -> apple green
  green: ['#063B12', '#0B5D1E', '#147A2A', '#24963A', '#39B54A', '#5ECC5C', '#8ADE6C', '#B8E943'],
  // Reflective: burnt orange -> warm amber
  neutral: ['#9A3412', '#C2410C', '#F59E0B'],
  // Intense: deep crimson -> vivid red
  'red-orange': ['#5F0F0F', '#7F1D1D', '#A61B1B', '#D11A1A', '#FF3B30'],
  // Tender: deep violet -> soft purple
  blue: ['#2E1065', '#A855F7'],
};

/** How far a picked bubble lifts out of the grid. */
const SELECTED_SCALE = 1.16;

const GROUP_MOOD_ORDER: Record<MoodGroup, string[]> = {
  green: MOODS.filter((m) => m.group === 'green').map((m) => m.id),
  neutral: MOODS.filter((m) => m.group === 'neutral').map((m) => m.id),
  'red-orange': MOODS.filter((m) => m.group === 'red-orange').map((m) => m.id),
  blue: MOODS.filter((m) => m.group === 'blue').map((m) => m.id),
};

// The mood face uses React Native's built-in <Image> (not expo-image): these are
// tiny, bundled, prewarmed PNGs, and expo-image was dropping its bitmap when a
// neighbouring bubble's `selected` state flipped — making the *previous* image
// vanish on the next tap. RN Image renders bundled require() assets directly with
// no memory-disk recycling, so it doesn't blank. Memoized on the stable source +
// size so selection changes never re-render it.
const MoodFace = memo(function MoodFace({
  source,
  size,
}: {
  source: NonNullable<(typeof MOOD_IMAGES)[string]>;
  size: number;
}) {
  return (
    <Image
      source={source}
      style={{ width: size, height: size }}
      resizeMode="contain"
      fadeDuration={0}
    />
  );
});

const getMoodImage = (mood: MoodDefinition) => {
  const resolvedKeys = [
    mood.imageKey,
    normalizeMoodImageKey(mood.id),
    normalizeMoodImageKey(mood.label),
  ].filter(Boolean) as string[];

  for (const key of resolvedKeys) {
    const source = MOOD_IMAGES[key];
    if (source) return source;
  }

  return null;
};

const getMoodGradientColor = (mood: MoodDefinition) => {
  const order = GROUP_MOOD_ORDER[mood.group];
  const palette = GROUP_GRADIENTS[mood.group];
  const index = order.indexOf(mood.id);

  if (index < 0 || palette.length === 0) return mood.bubbleColor;
  return palette[Math.min(index, palette.length - 1)];
};

const getMoodGradientIntensity = (mood: MoodDefinition) => {
  const order = GROUP_MOOD_ORDER[mood.group];
  const index = order.indexOf(mood.id);
  const safeIndex = index < 0 ? 0 : index;

  // Earlier moods are stronger/darker, later moods progressively softer.
  const centerOpacity = Math.max(0.62, 1 - safeIndex * 0.08);
  const midOpacity = Math.max(0.32, 0.86 - safeIndex * 0.09);

  // Group-specific spread to reinforce visual family differences.
  const radiusScaleByGroup: Record<MoodGroup, number> = {
    green: 0.58,
    neutral: 0.54,
    'red-orange': 0.62,
    blue: 0.56,
  };

  return {
    centerOpacity,
    midOpacity,
    radiusScale: radiusScaleByGroup[mood.group],
  };
};

export function MoodBubble({
  mood,
  size = 'md',
  selected = false,
  onPress,
  disabled = false,
  showLabel = true,
  showGradient = true,
  labelColor,
  sizeOverride,
  staggerIndex,
}: MoodBubbleProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width: winWidth } = useResponsive();
  // Built-in moods resolve through i18n; custom moods carry user-typed labels.
  const label = mood.id in MOOD_MAP ? t(`moods:${mood.id}.label`) : mood.label;
  // Reanimated rather than the legacy `Animated` API. This component renders 18
  // times on the check-in grid, and the legacy version drove every one of those
  // springs from the JS thread — so a re-render while picking a mood could stall
  // the selection pop. A shared value runs the whole spring on the UI thread.
  //
  // The old config was `tension: 300, friction: 10`; RN's legacy spring maps
  // those onto the same stiffness/damping physics, so `motion.spring.playful`
  // (260/9) is the token that already matches it, to within a hair.
  //
  // No cleanup call replaces the old `animation.stop()`. A UI-thread animation
  // is cancelled by the next write to the same shared value, and dies with the
  // view on unmount — there is nothing left holding a JS-side handle.
  const scale = useSharedValue(1);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const target = selected ? SELECTED_SCALE : 1;
    scale.value = reducedMotion ? target : withSpring(target, motion.spring.playful);
  }, [selected, reducedMotion, scale]);

  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const baseSizes = BONE_SIZES[size];
  const contentScale = getContentScale(winWidth);
  const width = sizeOverride ?? Math.round(baseSizes.width * contentScale);
  const imageSize = sizeOverride ?? Math.round(baseSizes.imageSize * contentScale);
  const fontSizeStyle = { fontSize: FONT_SIZES[size] };
  const gradientColor = getMoodGradientColor(mood);
  const gradientIntensity = getMoodGradientIntensity(mood);

  // Keep radial glow centered on icon with a soft fade to transparent edges.
  const PAD = 8;
  const gradCx = width / 2;
  const gradCy = PAD + imageSize / 2;
  const gradR = Math.max(width * 0.32, imageSize * gradientIntensity.radiusScale);

  return (
    <Animated.View
      entering={staggerIndex === undefined ? undefined : staggerEntering(staggerIndex, motion.staggerDense)}
      style={[
        styles.wrapper,
        selected && {
          shadowColor: mood.bubbleColor,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.35,
          shadowRadius: 18,
          // NOTE: no Android `elevation` here. Elevation on a view that also runs
          // a scale spring makes Android drop child content (the mood image blanks
          // and never redraws). iOS shadow props above are safe.
        },
        scaleStyle,
      ]}
    >
      <Pressable
        onPress={
          disabled
            ? undefined
            : onPress
              ? () => {
                  haptics.light();
                  onPress(mood);
                }
              : undefined
        }
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={({ pressed }) => [
          styles.bone,
          { width },
          // `overflow: hidden` only where the radial gradient must be clipped to
          // the rounded corners. Applying it unconditionally + the parent scale
          // spring triggers the Android child-blanking bug on the mood image.
          showGradient && styles.clip,
          selected && {
            backgroundColor: mood.tintColor,
            borderWidth: 2.5,
            borderColor: mood.bubbleColor,
          },
          disabled && styles.disabled,
          pressed && !disabled && styles.pressed,
        ]}
        accessibilityRole={onPress ? 'button' : 'text'}
        accessibilityLabel={label}
        accessibilityState={onPress ? { selected, disabled } : undefined}
      >
        {showGradient && (
          <Svg width={width} height="100%" style={StyleSheet.absoluteFill}>
            <Defs>
              <RadialGradient
                id={`rg-${mood.id}`}
                cx={gradCx}
                cy={gradCy}
                r={gradR}
                gradientUnits="userSpaceOnUse"
              >
                <Stop offset="0%" stopColor={gradientColor} stopOpacity={gradientIntensity.centerOpacity} />
                <Stop offset="46%" stopColor={gradientColor} stopOpacity={gradientIntensity.midOpacity} />
                <Stop offset="100%" stopColor={gradientColor} stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Rect width="100%" height="100%" fill={`url(#rg-${mood.id})`} />
          </Svg>
        )}
        {getMoodImage(mood) ? (
          <MoodFace source={getMoodImage(mood)!} size={imageSize} />
        ) : (
          <View
            style={[
              styles.customMoodCircle,
              {
                width: imageSize,
                height: imageSize,
                backgroundColor: mood.bubbleColor + '30',
                borderColor: mood.bubbleColor + '60',
              },
            ]}
          >
            <Text style={[styles.customMoodInitial, { fontSize: imageSize * 0.38, color: mood.textColor }]}>
              {mood.label.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        {showLabel && (
          <Text
            style={[styles.label, fontSizeStyle, { color: labelColor ?? colors.text }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {label}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'flex-start',
  },
  bone: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: 0,
    gap: spacing.xs,
    borderRadius: radius.lg,
    backgroundColor: 'transparent',
  },
  clip: {
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.38,
  },
  label: {
    fontWeight: typography.weights.semibold,
    textAlign: 'center',
  },
  customMoodCircle: {
    borderRadius: 999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customMoodInitial: {
    fontWeight: '700',
  },
});
