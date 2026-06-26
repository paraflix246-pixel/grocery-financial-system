import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '@/src/i18n/en.json';
import es from '@/src/i18n/es.json';

export const LOCALE_STORAGE_KEY = 'app_locale';
export type AppLocale = 'en' | 'es';
export const APP_LOCALES: AppLocale[] = ['en', 'es'];

const resources = {
  en: { translation: en },
  es: { translation: es },
};

function resolveDeviceLocale(): AppLocale {
  const code = Localization.getLocales()[0]?.languageCode ?? 'en';
  return code === 'es' ? 'es' : 'en';
}

export async function loadStoredLocale(): Promise<AppLocale> {
  try {
    const stored = await AsyncStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored === 'en' || stored === 'es') return stored;
  } catch {
    // fall through
  }
  return resolveDeviceLocale();
}

export async function persistLocale(locale: AppLocale): Promise<void> {
  await AsyncStorage.setItem(LOCALE_STORAGE_KEY, locale);
}

let initPromise: Promise<void> | null = null;

export function initI18n(): Promise<void> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const lng = await loadStoredLocale();

    if (!i18n.isInitialized) {
      await i18n.use(initReactI18next).init({
        resources,
        lng,
        fallbackLng: 'en',
        interpolation: { escapeValue: false },
        compatibilityJSON: 'v4',
      });
    } else {
      await i18n.changeLanguage(lng);
    }
  })();

  return initPromise;
}

export async function setAppLocale(locale: AppLocale): Promise<void> {
  await persistLocale(locale);
  await i18n.changeLanguage(locale);
}

export { i18n };
