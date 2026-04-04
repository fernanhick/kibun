import type { MoodId } from '@constants/moods';

export const MOOD_RESPONSES = {
  happy:      "That's wonderful! Let's hold onto that feeling.",
  excited:    "Big energy! Something good is happening.",
  grateful:   "Gratitude is powerful — you're already practicing it.",
  calm:       "Peaceful moments are worth noticing.",
  meh:        "Not every day needs to sparkle. You showed up.",
  tired:      "Rest is productive. Your body is telling you something.",
  bored:      "Boredom is creativity waiting for a spark.",
  confused:   "Uncertainty means you're thinking — that's a good sign.",
  sad:        "It's okay to feel this way. You're not alone.",
  anxious:    "Take a breath. You're here, and that's enough.",
  frustrated: "Friction means you care. That matters.",
  angry:      "Strong feelings deserve space. Let's track them.",
  melancholy: "A quiet ache — sometimes hard to name, always valid.",
  lonely:     "Connection takes courage. Noticing the feeling is the first step.",
} satisfies Record<MoodId, string>;
