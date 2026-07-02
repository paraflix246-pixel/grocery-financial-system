import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import i18next from 'i18next';

import en from '@/src/i18n/en.json';
import es from '@/src/i18n/es.json';

const SHEET_KEYS = [
  'notificationCenter.title',
  'notificationCenter.markAllRead',
  'notificationCenter.clearAll',
  'notificationCenter.deleteOne',
  'notificationCenter.emptyTitle',
  'notificationCenter.emptyBody',
] as const;

async function createT(locale: 'en' | 'es') {
  const i = i18next.createInstance();
  const data = locale === 'en' ? en : es;
  await i.init({
    resources: { [locale]: { translation: data } },
    lng: locale,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    compatibilityJSON: 'v4',
  });
  return i.t.bind(i);
}

describe('notificationCenter i18n keys', () => {
  for (const locale of ['en', 'es'] as const) {
    it(`resolves NotificationCenterSheet keys for ${locale}`, async () => {
      const t = await createT(locale);
      for (const key of SHEET_KEYS) {
        assert.notEqual(t(key), key, `missing translation for ${key}`);
      }
    });
  }
});
