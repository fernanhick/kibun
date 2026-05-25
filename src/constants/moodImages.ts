// Shared mood image asset map.
// Lives outside MoodBubble.tsx so the root layout can prewarm these PNGs
// at startup without pulling in the component tree.

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
