import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { spacing } from '@constants/theme';
import { breakpoints } from '@constants/breakpoints';
import { useResponsive } from '@hooks/useResponsive';

interface TabletSplitProps {
  primary: React.ReactNode;
  secondary: React.ReactNode;
  ratio?: [number, number];
  gap?: number;
  // Below this breakpoint, the two slots stack vertically.
  collapseAt?: 'tablet' | 'tabletLg';
  style?: StyleProp<ViewStyle>;
}

export function TabletSplit({
  primary,
  secondary,
  ratio = [1, 1],
  gap = spacing.lg,
  collapseAt = 'tabletLg',
  style,
}: TabletSplitProps) {
  const { width } = useResponsive();
  const splitActive = width >= breakpoints[collapseAt];

  if (!splitActive) {
    return <View style={[{ gap }, style]}>{primary}{secondary}</View>;
  }

  return (
    <View style={[{ flexDirection: 'row', alignItems: 'flex-start', gap }, style]}>
      <View style={{ flex: ratio[0], minWidth: 0 }}>{primary}</View>
      <View style={{ flex: ratio[1], minWidth: 0 }}>{secondary}</View>
    </View>
  );
}
