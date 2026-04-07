import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from './locales/en';
import hi from './locales/hi';
import gu from './locales/gu';

export const LANGUAGE_KEY = '@foodbridge_language';

export const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇺🇸', nativeLabel: 'English' },
  { code: 'hi', label: 'Hindi', flag: '🇮🇳', nativeLabel: 'हिंदी' },
  { code: 'gu', label: 'Gujarati', flag: '🇮🇳', nativeLabel: 'ગુજરાતી' },
];

const languageDetector: any = {
  type: 'languageDetector',
  async: true,
  detect: async (callback: (lang: string) => void) => {
    try {
      const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
      callback(saved || 'en');
    } catch {
      callback('en');
    }
  },
  init: () => {},
  cacheUserLanguage: async (lang: string) => {
    try { await AsyncStorage.setItem(LANGUAGE_KEY, lang); } catch {}
  },
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      gu: { translation: gu },
    },
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });

export default i18n;
