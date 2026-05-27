import { useHabitsStore } from '@store/habitsStore';
import type { OnboardingProfile } from '@models/index';
import { PRESET_HABITS, type HabitPreset } from './habitPresets';

const HIGH_STRESS = new Set(['high', 'very-high']);
const LOW_SOCIAL = new Set(['rarely', 'few-times-week']);
const LOW_EXERCISE = new Set(['never', '1-2-week']);

function preset(key: HabitPreset['key']): HabitPreset {
  const p = PRESET_HABITS.find((h) => h.key === key);
  if (!p) throw new Error(`Missing habit preset: ${key}`);
  return p;
}

// Picks a starter habit set from the onboarding profile and inserts them via
// the habits store. Names match PRESET_HABITS so manage-habits dedupes correctly.
export function seedHabitsFromProfile(profile: OnboardingProfile): void {
  const { habits, addHabit } = useHabitsStore.getState();
  if (habits.length > 0) return;

  const goals = new Set(profile.goals);
  const picks: HabitPreset[] = [];

  picks.push(preset('sleepQuality'));

  if (
    goals.has('track-energy') ||
    goals.has('reduce-stress') ||
    LOW_EXERCISE.has(profile.exercise ?? '')
  ) {
    picks.push(preset('exercise'));
  }

  if (goals.has('reduce-stress') || HIGH_STRESS.has(profile.stressLevel ?? '')) {
    picks.push(preset('meditated'));
  }

  if (
    goals.has('understand-emotions') ||
    goals.has('self-awareness') ||
    LOW_SOCIAL.has(profile.socialFrequency ?? '')
  ) {
    picks.push(preset('socialised'));
  }

  picks.slice(0, 4).forEach((p) =>
    addHabit({ name: p.name, icon: p.icon, trackingType: p.trackingType }),
  );
}
