import type { LegalDocumentContent, LegalLocale } from '@/src/legal/types';
import { EN_LEGAL_DOCUMENTS } from '@/src/legal/content/en';

const LOCALE_CONTENT: Record<LegalLocale, Record<string, LegalDocumentContent>> = {
  en: EN_LEGAL_DOCUMENTS,
  es: EN_LEGAL_DOCUMENTS,
};

export function getLegalDocument(slug: string, locale: LegalLocale = 'en'): LegalDocumentContent | null {
  return LOCALE_CONTENT[locale]?.[slug] ?? LOCALE_CONTENT.en[slug] ?? null;
}

export function listLegalDocumentSlugs(locale: LegalLocale = 'en'): string[] {
  return Object.keys(LOCALE_CONTENT[locale] ?? LOCALE_CONTENT.en);
}
