// Shared mood image asset map.
// Lives outside MoodBubble.tsx so the root layout can prewarm these PNGs
// at startup without pulling in the component tree.

import { Image as RNImage } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Asset } from 'expo-asset';

export const MOOD_IMAGES: Partial<Record<string, ReturnType<typeof require>>> = {
  angry: require('../../assets/emotions/angry.png'),
  bored: require('../../assets/emotions/bored.png'),
  bright: require('../../assets/emotions/bright.png'),
  calm: require('../../assets/emotions/calm.png'),
  cheeky: require('../../assets/emotions/cheeky.png'),
  confused: require('../../assets/emotions/confused.png'),
  excited: require('../../assets/emotions/excited.png'),
  frustrated: require('../../assets/emotions/frustrated.png'),
  grateful: require('../../assets/emotions/grateful.png'),
  happy: require('../../assets/emotions/happy.png'),
  lonely: require('../../assets/emotions/lonely.png'),
  loved: require('../../assets/emotions/loved.png'),
  melancholy: require('../../assets/emotions/melancholy.png'),
  sad: require('../../assets/emotions/sad.png'),
  scared: require('../../assets/emotions/scared.png'),
  surprised: require('../../assets/emotions/surprised.png'),
  tired: require('../../assets/emotions/tired.png'),
  worried: require('../../assets/emotions/worried.png'),
};

export const normalizeMoodImageKey = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, '_');

let prewarmPromise: Promise<void> | null = null;

export function prewarmMoodImages(): Promise<void> {
  if (prewarmPromise) return prewarmPromise;

  const modules = Object.values(MOOD_IMAGES).filter(Boolean) as number[];

  prewarmPromise = (async () => {
    // Step 1 — make sure the bundled PNG bytes exist on disk. In production
    // this is essentially free; in dev it downloads from the Metro server.
    try {
      await Asset.loadAsync(modules);
    } catch {
      // Non-fatal: prefetch below will still try to fetch via the resolved URI.
    }

    // Step 2 — resolve each require() id to a URI expo-image understands,
    // then prefetch into the memory+disk cache so the first <Image> render
    // does not block on PNG decode.
    const uris = modules
      .map((mod) => RNImage.resolveAssetSource(mod as any)?.uri)
      .filter((uri): uri is string => typeof uri === 'string' && uri.length > 0);

    if (uris.length === 0) return;

    try {
      await ExpoImage.prefetch(uris, 'memory-disk');
    } catch {
      // Silent: prewarm is best-effort. If it fails the UI still works,
      // it just costs the original decode-on-first-render.
    }
  })();

  return prewarmPromise;
}
