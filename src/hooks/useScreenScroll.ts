import { createContext, useContext, useMemo, createElement, type ReactNode } from 'react';
import {
  useAnimatedScrollHandler,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { motion } from '@constants/theme';

interface TabBarVisibility {
  hidden: SharedValue<number>;
}

const TabBarVisibilityContext = createContext<TabBarVisibility | null>(null);

export function TabBarVisibilityProvider({ children }: { children: ReactNode }) {
  const hidden = useSharedValue(0);
  const value = useMemo(() => ({ hidden }), [hidden]);
  return createElement(TabBarVisibilityContext.Provider, { value }, children);
}

export function useTabBarVisibility() {
  return useContext(TabBarVisibilityContext);
}

const HIDE_THRESHOLD = 12;
const TOP_SAFE_ZONE = 24;

export function useScreenScroll() {
  const vis = useTabBarVisibility();
  const scrollY = useSharedValue(0);

  const onScroll = useAnimatedScrollHandler<{ prev: number }>(
    {
      onScroll: (event, ctx) => {
        const y = event.contentOffset.y;
        scrollY.value = y;
        if (!vis) return;
        const prev = ctx.prev ?? 0;
        const dy = y - prev;

        if (y <= TOP_SAFE_ZONE) {
          vis.hidden.value = withTiming(0, { duration: motion.timing.fast });
        } else if (dy > HIDE_THRESHOLD && vis.hidden.value !== 1) {
          vis.hidden.value = withSpring(1, motion.spring.snappy);
        } else if (dy < -HIDE_THRESHOLD && vis.hidden.value !== 0) {
          vis.hidden.value = withSpring(0, motion.spring.snappy);
        }
        ctx.prev = y;
      },
    },
    [vis, scrollY],
  );

  return { scrollY, onScroll };
}
