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

import ptCommon from './locales/pt/common.json';
import ptOnboarding from './locales/pt/onboarding.json';
import ptScreens from './locales/pt/screens.json';
import ptMoods from './locales/pt/moods.json';
import ptDates from './locales/pt/dates.json';
import ptNotifications from './locales/pt/notifications.json';

import deCommon from './locales/de/common.json';
import deOnboarding from './locales/de/onboarding.json';
import deScreens from './locales/de/screens.json';
import deMoods from './locales/de/moods.json';
import deDates from './locales/de/dates.json';
import deNotifications from './locales/de/notifications.json';

export const SUPPORTED_LANGUAGES = ['en', 'es', 'pt', 'de'] as const;
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
  pt: {
    common: ptCommon,
    onboarding: ptOnboarding,
    screens: ptScreens,
    moods: ptMoods,
    dates: ptDates,
    notifications: ptNotifications,
  },
  de: {
    common: deCommon,
    onboarding: deOnboarding,
    screens: deScreens,
    moods: deMoods,
    dates: deDates,
    notifications: deNotifications,
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
