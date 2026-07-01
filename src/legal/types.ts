export type LegalSectionContent = {
  heading: string;
  body: string;
};

export type LegalDocumentContent = {
  slug: string;
  title: string;
  lastUpdated: string;
  sections: LegalSectionContent[];
  relatedSlug?: string;
  relatedLabel?: string;
  footerSlugs?: Array<{ slug: string; label: string }>;
};

export type LegalContactConfig = {
  privacyEmail: string;
  supportEmail: string;
  companyName: string;
  appName: string;
};

export type LegalLocale = 'en' | 'es';
