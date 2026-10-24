import { getLocales } from 'expo-localization';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import type { LocalePreference } from '@/stores/preferences';

import en from './en';
import ptBR from './pt-BR';

export type AppLocale = 'en' | 'pt-BR';

export const resolveLocale = (preference: LocalePreference): AppLocale => {
  if (preference !== 'system') return preference;
  return getLocales()[0]?.languageCode === 'pt' ? 'pt-BR' : 'en';
};

const i18n = createInstance();

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, 'pt-BR': { translation: ptBR } },
  lng: resolveLocale('system'),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
