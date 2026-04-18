import { useEffect, useRef } from 'react';
import { useSpotlightTour } from 'react-native-spotlight-tour';
import { useTourStore } from '@store/tourStore';
import { useOnboardingGateStore } from '@store/onboardingGateStore';

// FORCE_TOUR_ON=true: tour fires on every Home mount (dev/testing only)
const FORCE_TOUR_ON = true;

export function useTourAutoStart() {
  const { start } = useSpotlightTour();
  const hasSeenTour = useTourStore((s) => s.hasSeenTour);
  const resetTour = useTourStore((s) => s.resetTour);
  const tourHydrated = useTourStore((s) => s._hasHydrated);
  const onboardingComplete = useOnboardingGateStore((s) => s.complete);
  const onboardingJustCompleted = useOnboardingGateStore((s) => s.onboardingJustCompleted);
  const clearOnboardingJustCompleted = useOnboardingGateStore((s) => s.clearOnboardingJustCompleted);
  const firedRef = useRef(false);

  useEffect(() => {
    if (!tourHydrated) return;
    if (!onboardingComplete) return;
    if (!FORCE_TOUR_ON && !onboardingJustCompleted && hasSeenTour) return;
    if (firedRef.current) return;
    firedRef.current = true;

    const timer = setTimeout(() => {
      if (FORCE_TOUR_ON) resetTour();
      if (onboardingJustCompleted) clearOnboardingJustCompleted();
      start();
    }, 600);
    return () => clearTimeout(timer);
  }, [tourHydrated, onboardingComplete, onboardingJustCompleted, hasSeenTour, resetTour, clearOnboardingJustCompleted, start]);
}
