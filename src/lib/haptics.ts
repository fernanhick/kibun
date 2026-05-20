import { AccessibilityInfo, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

let cachedReduceMotion = false;
let initialized = false;

function ensureInit() {
  if (initialized) return;
  initialized = true;
  AccessibilityInfo.isReduceMotionEnabled().then((v) => {
    cachedReduceMotion = v;
  });
  AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => {
    cachedReduceMotion = v;
  });
}

function fire(run: () => Promise<unknown>) {
  ensureInit();
  if (cachedReduceMotion) return;
  if (Platform.OS === 'web') return;
  run().catch(() => {});
}

export const haptics = {
  selection: () => fire(() => Haptics.selectionAsync()),
  light: () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  medium: () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  heavy: () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
  success: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
