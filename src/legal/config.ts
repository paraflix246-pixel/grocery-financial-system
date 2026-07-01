import type { LegalContactConfig } from '@/src/legal/types';

/** Contact and jurisdiction metadata — update here without changing app logic. */
export const LEGAL_CONTACT: LegalContactConfig = {
  appName: 'Penny Pantry',
  companyName: 'Penny Pantry',
  privacyEmail: 'privacy@pennypantry.xyz',
  supportEmail: 'support@pennypantry.xyz',
};

export const LEGAL_SLUGS = [
  'terms',
  'privacy',
  'cookies',
  'data-retention',
  'copyright',
  'privacy-request',
] as const;

export type LegalSlug = (typeof LEGAL_SLUGS)[number];

export const LEGAL_ROUTE_BY_SLUG: Record<LegalSlug, string> = {
  terms: '/terms',
  privacy: '/privacy',
  cookies: '/cookies',
  'data-retention': '/data-retention',
  copyright: '/copyright',
  'privacy-request': '/privacy-request',
};

export function legalHref(slug: LegalSlug): `/terms` | `/privacy` | `/cookies` | `/data-retention` | `/copyright` | `/privacy-request` {
  return LEGAL_ROUTE_BY_SLUG[slug] as `/terms` | `/privacy` | `/cookies` | `/data-retention` | `/copyright` | `/privacy-request`;
}
