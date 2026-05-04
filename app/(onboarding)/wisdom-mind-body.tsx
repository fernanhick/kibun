import { useRouter } from 'expo-router';
import { WisdomScreen } from '@components/WisdomScreen';

export default function WisdomMindBodyScreen() {
  const router = useRouter();
  return (
    <WisdomScreen
      step={8}
      total={14}
      mascot="happy"
      headline="Your body keeps the score."
      body="Sleep, movement, and breath shape your mood as much as any thought you'll ever have. Caring for one cares for the other."
      onContinue={() => router.push('/(onboarding)/profile-social')}
    />
  );
}
