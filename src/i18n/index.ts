import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import 'intl-pluralrules';

import enCommon from './locales/en/common.json';
import enOnboarding from './locales/en/onboarding.json';
import enScreens from './locales/en/screens.json';
import enMoods from './locales/en/moods.json';
import enDates from './locales/en/dates.json';
import enNotifications from './locales/en/notifications.json';

import esCommon from './locales/es/common.json';
import esOnboarding from './locales/es/onboarding.json';
import esScreens from './locales/es/screens.json';
import esMoods from './locales/es/moods.json';
import esDates from './locales/es/dates.json';
import esNotifications from './locales/es/notifications.json';

export const SUPPORTED_LANGUAGES = ['en', 'es'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const resources = {
  en: {
    common: enCommon,
    onboarding: enOnboarding,
    screens: enScreens,
    moods: enMoods,
    dates: enDates,
    notifications: enNotifications,
  },
  es: {
    common: esCommon,
    onboarding: esOnboarding,
    screens: esScreens,
    moods: esMoods,
    dates: esDates,
    notifications: esNotifications,
  },
} as const;

// Region-strip + supported-language fallback. Localization.getLocales() returns
// entries like { languageTag: 'es-MX', languageCode: 'es' }. Strip the region so
// es-MX, es-ES, and es-AR all map to our generic 'es' bundle.
export function getDeviceLanguage(): SupportedLanguage {
  const locales = Localization.getLocales();
  const code = locales[0]?.languageCode?.toLowerCase();
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(code ?? '')
    ? (code as SupportedLanguage)
    : 'en';
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getDeviceLanguage(),
    fallbackLng: 'en',
    ns: ['common', 'onboarding', 'screens', 'moods', 'dates', 'notifications'],
    defaultNS: 'common',
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
    returnNull: false,
  });

export default i18n;
