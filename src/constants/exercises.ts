// Exercise type → bundled kawaii chip PNG.
// `grounding` has no dedicated asset yet; we reuse box-breathing as a tonal match.

export type ExerciseType =
  | 'box_breathing'
  | 'grounding'
  | 'gratitude'
  | 'joy_capture'
  | 'savoring'
  | 'energy_boost'
  | 'curiosity'
  | 'mindful_pause'
  | 'body_scan'
  | 'self_compassion'
  | 'comfort_list';

export const EXERCISE_CHIP_IMAGES: Record<ExerciseType, any> = {
  box_breathing:   require('../../assets/badges/exercise chips/box-breathing.png'),
  grounding:       require('../../assets/badges/exercise chips/box-breathing.png'),
  gratitude:       require('../../assets/badges/exercise chips/gratitude.png'),
  joy_capture:     require('../../assets/badges/exercise chips/joy-capture.png'),
  savoring:        require('../../assets/badges/exercise chips/savoring.png'),
  energy_boost:    require('../../assets/badges/exercise chips/energy-boost.png'),
  curiosity:       require('../../assets/badges/exercise chips/curiosity.png'),
  mindful_pause:   require('../../assets/badges/exercise chips/mindful-pause.png'),
  body_scan:       require('../../assets/badges/exercise chips/body-scan.png'),
  self_compassion: require('../../assets/badges/exercise chips/self-compassion.png'),
  comfort_list:    require('../../assets/badges/exercise chips/comfort-list.png'),
};
