import { useRouter } from 'expo-router';
import { WisdomScreen } from '@components/WisdomScreen';

export default function WisdomSmallShiftsScreen() {
  const router = useRouter();
  return (
    <WisdomScreen
      step={13}
      total={14}
      mascot="calm"
      headline="Big change rarely happens at once."
      body="Tiny moments of attention — even ten seconds a day — compound into real shifts over time. That's why we're here."
      onContinue={() => router.push('/(onboarding)/notification-permission')}
    />
  );
}
