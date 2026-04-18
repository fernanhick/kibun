import type { TourStep } from 'react-native-spotlight-tour';
import { TourTooltip } from '@components/TourTooltip';

const TOTAL_STEPS = 4;

export const KIBUN_TOUR_STEPS: TourStep[] = [
  {
    render: (props) => TourTooltip({
      ...props,
      text: "You're all set! Tap here to log your mood — it only takes a few seconds.",
      emoji: '🎉',
      total: TOTAL_STEPS,
    }),
    shape: { type: 'rectangle', padding: 8 },
    placement: 'bottom',
  },
  {
    render: (props) => TourTooltip({
      ...props,
      text: 'See all your past moods here, day by day.',
      emoji: '📅',
      total: TOTAL_STEPS,
    }),
    shape: { type: 'circle', padding: 8 },
    placement: 'top',
  },
  {
    render: (props) => TourTooltip({
      ...props,
      text: 'Discover patterns in your emotions over time.',
      emoji: '✨',
      total: TOTAL_STEPS,
    }),
    shape: { type: 'circle', padding: 8 },
    placement: 'top',
  },
  {
    render: (props) => TourTooltip({
      ...props,
      text: 'This little Shiba lives in your tab bar. Tap them any time to check in — they change with your mood!',
      emoji: '🐕',
      total: TOTAL_STEPS,
    }),
    shape: { type: 'rectangle', padding: 8 },
    placement: 'top',
  },
];
