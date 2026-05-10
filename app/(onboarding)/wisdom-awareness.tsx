import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { WisdomScreen } from '@components/WisdomScreen';

export default function WisdomAwarenessScreen() {
  const router = useRouter();
  const { t } = useTranslation('onboarding');
  return (
    <WisdomScreen
      step={4}
      total={14}
      mascot="calm"
      headline={t('wisdomAwareness.headline')}
      body={t('wisdomAwareness.body')}
      onContinue={() => router.push('/(onboarding)/profile-personal')}
    />
  );
}
