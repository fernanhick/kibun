import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { WisdomScreen } from '@components/WisdomScreen';

export default function WisdomMindBodyScreen() {
  const router = useRouter();
  const { t } = useTranslation('onboarding');
  return (
    <WisdomScreen
      step={8}
      total={14}
      mascot="happy"
      headline={t('wisdomMindBody.headline')}
      body={t('wisdomMindBody.body')}
      onContinue={() => router.push('/(onboarding)/profile-social')}
    />
  );
}
