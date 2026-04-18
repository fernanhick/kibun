// Persisted gate store — survives app kill/restart via AsyncStorage.
// _hasHydrated is transient (always false on launch) and excluded from persistence
// via partialize. Without the hydration guard, the gate incorrectly redirects
// returning users to onboarding before AsyncStorage rehydration completes.
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface OnboardingGateState {
  complete: boolean;
  paywallSeen: boolean;
  _hasHydrated: boolean;
  onboardingJustCompleted: boolean;
  setComplete: () => void;
  setPaywallSeen: () => void;
  setHasHydrated: (value: boolean) => void;
  clearOnboardingJustCompleted: () => void;
}

export const useOnboardingGateStore = create<OnboardingGateState>()(
  persist(
    (set) => ({
      complete: false,
      paywallSeen: false,
      _hasHydrated: false,
      onboardingJustCompleted: false,
      setComplete: () => set({ complete: true, onboardingJustCompleted: true }),
      setPaywallSeen: () => set({ paywallSeen: true }),
      setHasHydrated: (value) => set({ _hasHydrated: value }),
      clearOnboardingJustCompleted: () => set({ onboardingJustCompleted: false }),
    }),
    {
      name: 'kibun-onboarding-gate',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist 'complete' and 'paywallSeen' — transient flags always reset on launch
      partialize: (state) => ({ complete: state.complete, paywallSeen: state.paywallSeen }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
