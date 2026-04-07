import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { supabase } from '@lib/supabase';

export async function registerPushToken(): Promise<void> {
  if (!supabase) return;

  // Only register if permission already granted — don't prompt here
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;

  // EAS projectId required for Expo push service.
  // Primary location for SDK 52+ with EAS: expoConfig.extra.eas.projectId
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;

  if (!projectId) {
    if (__DEV__) {
      console.warn('[kibun:push] No EAS projectId — push token registration skipped');
    }
    return;
  }

  let token: string;
  try {
    const result = await Notifications.getExpoPushTokenAsync({ projectId });
    token = result.data;
  } catch (err) {
    if (__DEV__) {
      console.warn('[kibun:push] getExpoPushTokenAsync failed:', err);
    }
    return;
  }

  const { error } = await supabase.auth.updateUser({
    data: { expo_push_token: token },
  });

  if (error && __DEV__) {
    console.error('[kibun:push] Failed to save push token:', error.message);
  }
}
