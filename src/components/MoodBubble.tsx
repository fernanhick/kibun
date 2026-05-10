import { useRef, useEffect } from 'react';
import { Animated, Pressable, Text, StyleSheet, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { MoodDefinition, MOOD_MAP } from '@constants/moods';
import { typography } from '@constants/theme';

interface MoodBubbleProps {
  mood: MoodDefinition;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  selected?: boolean;
  onPress?: (mood: MoodDefinition) => void;
  disabled?: boolean;
}

const BONE_SIZES = {
  sm: { width: 74, imageSize: 48 },
  md: { width: 90, imageSize: 60 },
  lg: { width: 110, imageSize: 76 },
  xl: { width: 140, imageSize: 96 },
} as const;

const FONT_SIZES = {
  sm: typography.sizes.xs,
  md: typography.sizes.sm,
  lg: typography.sizes.md,
  xl: typography.sizes.lg,
} as const;

export function MoodBubble({
  mood,
  size = 'md',
  selected = false,
  onPress,
  disabled = false,
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

  // Gradient anchored on the paw center; clamped so it never reaches the container edge
  const PAD = 8;
  const gradCx = width / 2;
  const gradCy = PAD + imageSize / 2;
  const gradR = Math.min(imageSize * 0.75, width / 2 - 4);

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
        <Svg width={width} height="100%" style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient
              id={`rg-${mood.id}`}
              cx={gradCx}
              cy={gradCy}
              r={gradR}
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0%" stopColor={mood.bubbleColor} stopOpacity="1" />
              <Stop offset="60%" stopColor={mood.bubbleColor} stopOpacity="1" />
              <Stop offset="100%" stopColor={mood.bubbleColor} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#rg-${mood.id})`} />
        </Svg>
        <Image
          source={require('../../assets/paw.png')}
          style={{ width: imageSize, height: imageSize }}
          resizeMode="contain"
        />
        <Text
          style={[styles.label, fontSizeStyle, { color: mood.textColor }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {label}
        </Text>
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
    paddingVertical: 8,
    paddingHorizontal: 0,
    gap: 1,
    borderRadius: 16,
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
