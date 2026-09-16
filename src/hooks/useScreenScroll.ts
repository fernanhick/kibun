import { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';

// ─── useScreenScroll ──────────────────────────────────────────────────────────
// Tracks a screen's vertical scroll offset on the UI thread.
//
// This used to own the tab bar's hide-on-scroll behaviour: a
// `TabBarVisibilityProvider` published a `hidden` shared value, this handler
// drove it past a 12px threshold with springs, and FloatingTabBar translated
// itself off-screen by it.
//
// That went away with the floating pill — the bar is docked now and never
// hides, so nothing consumed `hidden` any more. The provider, the context and
// the threshold logic were left computing springs on every scroll frame across
// all four tabs for a value no one read, so they are gone.
//
// What remains is the offset itself, which is cheap (one shared-value write per
// frame) and is the part a screen might actually want. Note that the four tab
// screens still wire `onScroll` through `<Screen>` without reading `scrollY` —
// that plumbing is inert and can be removed if nothing claims it.
export function useScreenScroll() {
  const scrollY = useSharedValue(0);

  const onScroll = useAnimatedScrollHandler(
    {
      onScroll: (event) => {
        scrollY.value = event.contentOffset.y;
      },
    },
    [scrollY],
  );

  return { scrollY, onScroll };
}
