import LottieView from 'lottie-react-native';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';

export type ShibaVariant = 'happy' | 'excited' | 'sad' | 'neutral';

interface ShibaProps {
  variant: ShibaVariant;
  size?: number;        // Diameter in pt — default 120
  loop?: boolean;       // default true
  autoPlay?: boolean;   // default true
  onFinish?: () => void;
  style?: StyleProp<ViewStyle>;
}

// No explicit type annotation — require() returns any, which is directly assignable to
// LottieView's source prop (AnimationObject = Record<string, unknown> in lottie-react-native
// v7). Annotating as Record<ShibaVariant, object> would produce a strict-mode error:
// object is not assignable to Record<string, unknown> (lacks index signature).
const ANIMATIONS = {
  happy:   require('../assets/lottie/shiba-happy.json'),
  excited: require('../assets/lottie/shiba-excited.json'),
  sad:     require('../assets/lottie/shiba-sad.json'),
  neutral: require('../assets/lottie/shiba-neutral.json'),
};

export function Shiba({
  variant,
  size = 120,
  loop = true,
  autoPlay = true,
  onFinish,
  style,
}: ShibaProps) {
  return (
    // Wrap LottieView in View for accessibility props. LottieViewProps does not guarantee
    // accessibilityLabel / accessibilityRole in its TypeScript interface — passing them
    // directly to LottieView is a strict-mode compile error if undeclared. View always
    // accepts all accessibility props.
    <View
      style={[{ width: size, height: size }, style]}
      accessibilityLabel={`Shiba ${variant}`}
      accessibilityRole="image"
    >
      <LottieView
        source={ANIMATIONS[variant]}
        autoPlay={autoPlay}
        loop={loop}
        onAnimationFinish={onFinish}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}
