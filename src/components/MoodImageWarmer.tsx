import { memo } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { MOOD_IMAGES } from '@constants/moodImages';

// Off-screen decode warmer for the emotion PNGs.
//
// MoodBubble renders moods with React Native's built-in <Image> (not expo-image —
// see the note in MoodBubble.tsx about the Android selection-blanking bug). The
// expo-image prefetch in prewarmMoodImages() warms a cache the bubbles no longer
// read, so the first time the check-in grid mounts it decodes all 18 PNGs on the
// spot and stalls first paint for a beat.
//
// Mounting every source once through the *same* RN <Image> pipeline forces the
// native loader (Fresco on Android, RCTImageLoader on iOS) to read + decode them
// into its cache at app startup — while the user is still on earlier screens.
// Rendered at the check-in grid bubble size so the warmed bitmap is a direct
// cache hit there. Kept mounted permanently (18 tiny bitmaps) so the entries are
// never evicted before the grid is opened. Visually + a11y inert.
const SOURCES = Object.values(MOOD_IMAGES).filter(Boolean) as NonNullable<
  (typeof MOOD_IMAGES)[string]
>[];

// Matches BONE_SIZES.smCompact.imageSize — the size the MoodLogger grid uses.
const WARM_SIZE = 56;

export const MoodImageWarmer = memo(function MoodImageWarmer() {
  return (
    <View
      style={styles.host}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {SOURCES.map((source, i) => (
        <Image
          key={i}
          source={source}
          style={styles.img}
          resizeMode="contain"
          fadeDuration={0}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  // Parked far off-screen at zero opacity: the views still lay out at WARM_SIZE
  // (so decode happens) but never paint anything the user can see.
  host: {
    position: 'absolute',
    top: -9999,
    left: -9999,
    opacity: 0,
  },
  img: {
    width: WARM_SIZE,
    height: WARM_SIZE,
  },
});
