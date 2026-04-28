import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, radius } from '@constants/theme';

type BackButtonVariant = 'light' | 'onHero';

interface BackButtonProps {
  /** Override default behaviour (router.back() with /(tabs) fallback). */
  onPress?: () => void;
  /** `light` for plain screens, `onHero` for white-on-gradient hero cards. */
  variant?: BackButtonVariant;
  /** Visible label — defaults to "Home" so users see exactly where the button goes. */
  label?: string;
  style?: StyleProp<ViewStyle>;
}

export function BackButton({
  onPress,
  variant = 'light',
  label = 'Home',
  style,
}: BackButtonProps) {
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const isHero = variant === 'onHero';
  const fg = isHero ? colors.textInverse : colors.text;
  const bg = isHero ? 'rgba(255,255,255,0.22)' : colors.surface;
  const border = isHero ? 'rgba(255,255,255,0.4)' : colors.border;

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Go to ${label.toLowerCase()}`}
      hitSlop={8}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, borderColor: border },
        pressed && { opacity: 0.7 },
        style,
      ]}
    >
      <Ionicons name="chevron-back" size={18} color={fg} />
      <Text style={[styles.label, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 6,
    paddingLeft: 6,
    paddingRight: 12,
    borderRadius: radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.ui,
  },
});
