import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { WisdomScreen } from '@components/WisdomScreen';

export default function WisdomSmallShiftsScreen() {
  const router = useRouter();
  const { t } = useTranslation('onboarding');
  return (
    <WisdomScreen
      step={13}
      total={14}
      mascot="calm"
      headline={t('wisdomSmallShifts.headline')}
      body={t('wisdomSmallShifts.body')}
      onContinue={() => router.push('/(onboarding)/notification-permission')}
    />
  );
}
