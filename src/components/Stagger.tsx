import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { motion } from '@constants/theme';

// ─── Stagger ──────────────────────────────────────────────────────────────────
// Spends the `motion.stagger` token, which the design system defined — with a
// comment about the readable band and everything — and which no screen had ever
// called. Collections in this app mounted fully formed, which reads as a data
// dump; a short cascade reads as the list assembling itself.
//
// Reduce Motion needs NO gate here, and adding one would be wrong. Reanimated
// layout animations default to `ReduceMotion.System`, which threads the
// accessibility setting straight into the animation config so the element snaps
// to its final values instead of travelling. (The imperative animations
// elsewhere in this app genuinely do need the `useReducedMotion` hook — a bare
// `withSpring` carries no such default.)

/**
 * Ceiling on the cascade, in ms. Without it a long list — habit correlations
 * grow with the user's habit count — would leave its tail waiting seconds. The
 * cap is on total delay rather than on step count so it holds at any step size.
 */
const MAX_DELAY = 480;

/**
 * Entrance for item `index` of a collection.
 *
 * @param step Per-item delay. Defaults to `motion.stagger`; pass
 *   `motion.staggerDense` for grids of roughly a dozen cells or more.
 */
export function staggerEntering(index: number, step: number = motion.stagger) {
  return (
    FadeInDown.delay(Math.min(index * step, MAX_DELAY))
      .duration(motion.timing.medium)
      // FadeInDown travels 25px by default, which is most of a small grid cell's
      // height — the bubbles appeared to fall in from the row above. 12px still
      // gives the motion a direction without the item leaving its own slot.
      .withInitialValues({ transform: [{ translateY: 12 }] })
  );
}

interface StaggerProps {
  /** Position in the collection. Drives the delay; 0 enters immediately. */
  index: number;
  step?: number;
  style?: StyleProp<ViewStyle>;
  /**
   * Forwarded so this wrapper can REPLACE an existing labelled `<View>` at a
   * call site rather than nesting inside one — a stagger should not cost the
   * tree an extra node.
   */
  accessibilityLabel?: string;
  children: ReactNode;
}

export function Stagger({ index, step, style, accessibilityLabel, children }: StaggerProps) {
  return (
    <Animated.View
      entering={staggerEntering(index, step)}
      style={style}
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </Animated.View>
  );
}
