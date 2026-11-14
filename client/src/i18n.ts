import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enTranslations from './locales/en.json';
import siTranslations from './locales/si.json';
import taTranslations from './locales/ta.json';
import coreFlows from './locales/coreFlows';

const resources = {
  en: { translation: { ...enTranslations, ...coreFlows.en } },
  si: { translation: { ...siTranslations, ...coreFlows.si } },
  ta: { translation: { ...taTranslations, ...coreFlows.ta } },
};

// Check if a language is saved in localStorage, default to 'en'
const savedLanguage = localStorage.getItem('app_language') || 'en';

i18n.on('languageChanged', () => {
  document.documentElement.lang = i18n.resolvedLanguage ?? 'en';
});

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLanguage,
    supportedLngs: Object.keys(resources),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already safeguards from XSS
    },
  });

export default i18n;
