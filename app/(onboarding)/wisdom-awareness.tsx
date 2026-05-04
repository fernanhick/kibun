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
      body="Studies show that simply labelling an emotion can quiet the brain's stress response. The act of noticing is already healing."
      onContinue={() => router.push('/(onboarding)/profile-personal')}
    />
  );
}
