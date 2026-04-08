import React from 'react';
import {
  Animated,
  Easing,
  ScrollView,
  View,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
// SafeAreaView must come from react-native-safe-area-context (NOT react-native).
// The app wraps its tree in SafeAreaProvider from this package in app/_layout.tsx.
// Using react-native's SafeAreaView bypasses the provider context and produces
// incorrect insets on notched iOS devices (iPhone X+, Dynamic Island) silently.
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '@constants/theme';
import { SparkleOverlay } from './SparkleOverlay';

interface ScreenProps {
  children: React.ReactNode;
  scrollable?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

export function Screen({
  children,
  scrollable = false,
  style,
  contentContainerStyle,
}: ScreenProps) {
  const driftA = React.useRef(new Animated.Value(0)).current;
  const driftB = React.useRef(new Animated.Value(0)).current;
  const driftC = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const createDrift = (value: Animated.Value, duration: number, distance: number) => {
      const forward = Animated.timing(value, {
        toValue: distance,
        duration,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      });
      const backward = Animated.timing(value, {
        toValue: 0,
        duration,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      });
      return Animated.loop(Animated.sequence([forward, backward]));
    };

    const loopA = createDrift(driftA, 12000, 8);
    const loopB = createDrift(driftB, 15000, -10);
    const loopC = createDrift(driftC, 18000, 7);

    loopA.start();
    loopB.start();
    loopC.start();

    return () => {
      loopA.stop();
      loopB.stop();
      loopC.stop();
    };
  }, [driftA, driftB, driftC]);

  return (
    <SafeAreaView style={[styles.safeArea, style]}>
      <LinearGradient
        colors={['#E9F6FF', '#F8FDFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backgroundGradient}
      />
      <View pointerEvents="none" style={styles.bgDecor}>
        <SparkleOverlay variant="screen" count={34} />
        <Animated.View style={[styles.cloud, styles.cloudOne, { transform: [{ translateX: driftA }, { scale: 0.95 }] }]}>
          <View style={styles.cloudBase} />
          <View style={[styles.cloudPuff, styles.cloudPuffLeft]} />
          <View style={[styles.cloudPuff, styles.cloudPuffRight]} />
        </Animated.View>
        <Animated.View style={[styles.cloud, styles.cloudTwo, { transform: [{ translateX: driftB }, { scale: 1.1 }] }]}>
          <View style={styles.cloudBase} />
          <View style={[styles.cloudPuff, styles.cloudPuffLeft]} />
          <View style={[styles.cloudPuff, styles.cloudPuffRight]} />
        </Animated.View>
        <Animated.View style={[styles.cloud, styles.cloudThree, { transform: [{ translateX: driftC }, { scale: 0.88 }] }]}>
          <View style={styles.cloudBase} />
          <View style={[styles.cloudPuff, styles.cloudPuffLeft]} />
          <View style={[styles.cloudPuff, styles.cloudPuffRight]} />
        </Animated.View>
      </View>
      {scrollable ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, contentContainerStyle]}>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  bgDecor: {
    ...StyleSheet.absoluteFillObject,
  },
  cloud: {
    position: 'absolute',
    width: 116,
    height: 56,
    opacity: 0.9,
  },
  cloudBase: {
    position: 'absolute',
    bottom: 0,
    left: 14,
    width: 82,
    height: 32,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.66)',
  },
  cloudPuff: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  cloudPuffLeft: {
    width: 34,
    height: 34,
    left: 8,
    bottom: 16,
  },
  cloudPuffRight: {
    width: 44,
    height: 44,
    left: 48,
    bottom: 18,
  },
  cloudOne: {
    top: 40,
    left: -10,
  },
  cloudTwo: {
    top: 94,
    right: -14,
  },
  cloudThree: {
    bottom: 26,
    left: 36,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.screenPadding,
  },
  scrollContent: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.xxl,
  },
});
