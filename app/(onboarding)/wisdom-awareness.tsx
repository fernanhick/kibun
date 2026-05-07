import { useRouter } from 'expo-router';
import { WisdomScreen } from '@components/WisdomScreen';

export default function WisdomAwarenessScreen() {
  const router = useRouter();
  return (
    <WisdomScreen
      step={4}
      total={14}
      mascot="calm"
      headline="Naming what you feel is the first step."
      body="Simply naming an emotion can soften how it feels. The act of noticing is its own kind of care."
      onContinue={() => router.push('/(onboarding)/profile-personal')}
    />
  );
}
