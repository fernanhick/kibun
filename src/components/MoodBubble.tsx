import { useRef, useEffect } from 'react';
import { Animated, Pressable, Text, StyleSheet, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { MoodDefinition, MOOD_MAP, MOODS, MoodGroup } from '@constants/moods';
import { typography, spacing, radius } from '@constants/theme';

interface MoodBubbleProps {
  mood: MoodDefinition;
  size?: 'sm' | 'md' | 'mdCompact' | 'lg' | 'xl';
  selected?: boolean;
  onPress?: (mood: MoodDefinition) => void;
  disabled?: boolean;
  showLabel?: boolean;
  showGradient?: boolean;
}

const BONE_SIZES = {
  sm: { width: 74, imageSize: 48 },
  md: { width: 90, imageSize: 60 },
  mdCompact: { width: 78, imageSize: 78 },
  lg: { width: 110, imageSize: 76 },
  xl: { width: 140, imageSize: 96 },
} as const;

const FONT_SIZES = {
  sm: typography.sizes.xs,
  md: typography.sizes.sm,
  mdCompact: typography.sizes.sm,
  lg: typography.sizes.md,
  xl: typography.sizes.lg,
} as const;

const PAW_IMAGE = require('../../assets/paw.png');
const MOOD_IMAGES: Partial<Record<string, ReturnType<typeof require>>> = {
  angry: require('../../assets/emotions/angry.png'),
  bored: require('../../assets/emotions/bored.png'),
  bright: require('../../assets/emotions/bright.png'),
  calm: require('../../assets/emotions/calm.png'),
  cheeky: require('../../assets/emotions/cheeky.png'),
  confused: require('../../assets/emotions/confused.png'),
  excited: require('../../assets/emotions/excited.png'),
  frustrated: require('../../assets/emotions/frustrated.png'),
  grateful: require('../../assets/emotions/grateful.png'),
  happy: require('../../assets/emotions/happy.png'),
  lonely: require('../../assets/emotions/lonely.png'),
  loved: require('../../assets/emotions/loved.png'),
  melancholy: require('../../assets/emotions/melancholy.png'),
  sad: require('../../assets/emotions/sad.png'),
  scared: require('../../assets/emotions/scared.png'),
  surprised: require('../../assets/emotions/surprised.png'),
  tired: require('../../assets/emotions/tired.png'),
  worried: require('../../assets/emotions/worried.png'),
};

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

const GROUP_MOOD_ORDER: Record<MoodGroup, string[]> = {
  green: MOODS.filter((m) => m.group === 'green').map((m) => m.id),
  neutral: MOODS.filter((m) => m.group === 'neutral').map((m) => m.id),
  'red-orange': MOODS.filter((m) => m.group === 'red-orange').map((m) => m.id),
  blue: MOODS.filter((m) => m.group === 'blue').map((m) => m.id),
};

const normalizeMoodImageKey = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, '_');

const getMoodImage = (mood: MoodDefinition) => {
  const idKey = normalizeMoodImageKey(mood.id);
  const labelKey = normalizeMoodImageKey(mood.label);

  const resolvedKeys = [idKey, labelKey];

  for (const key of resolvedKeys) {
    const source = MOOD_IMAGES[key];
    if (source) return source;
  }

  return PAW_IMAGE;
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
}: MoodBubbleProps) {
  const { t } = useTranslation();
  // Built-in moods resolve through i18n; custom moods carry user-typed labels.
  const label = mood.id in MOOD_MAP ? t(`moods:${mood.id}.label`) : mood.label;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.spring(scaleAnim, {
      toValue: selected ? 1.12 : 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    });
    animation.start();
    return () => animation.stop(); // Stop on unmount or before next effect run
  }, [selected]);

  const { width, imageSize } = BONE_SIZES[size];
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
      style={[
        styles.wrapper,
        selected && {
          shadowColor: mood.bubbleColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.75,
          shadowRadius: 10,
          elevation: 10,
        },
        { transform: [{ scale: scaleAnim }] },
      ]}
    >
      <Pressable
        onPress={disabled ? undefined : () => onPress?.(mood)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={({ pressed }) => [
          styles.bone,
          { width },
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
        <Image
          source={getMoodImage(mood)}
          style={{ width: imageSize, height: imageSize }}
          resizeMode="contain"
        />
        {showLabel && (
          <Text
            style={[styles.label, fontSizeStyle, { color: mood.textColor }]}
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
    overflow: 'hidden',
    backgroundColor: 'transparent',
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
});
