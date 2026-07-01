import { LegalPageLayout, LegalSection } from '@/src/components/legal/LegalPageLayout';
import { legalHref } from '@/src/legal/config';
import { getLegalDocument } from '@/src/legal/loadLegalDocument';
import type { LegalSlug } from '@/src/legal/config';
import { i18n } from '@/src/i18n';

type Props = {
  slug: LegalSlug;
};

export function LegalDocumentScreen({ slug }: Props) {
  const locale = i18n.language?.startsWith('es') ? 'es' : 'en';
  const doc = getLegalDocument(slug, locale);

  if (!doc) {
    return (
      <LegalPageLayout title="Document not found" lastUpdated="">
        <LegalSection heading="Unavailable">This legal document is not available.</LegalSection>
      </LegalPageLayout>
    );
  }

  return (
    <LegalPageLayout
      title={doc.title}
      lastUpdated={doc.lastUpdated}
      relatedPage={
        doc.relatedSlug && doc.relatedLabel
          ? { label: doc.relatedLabel, href: legalHref(doc.relatedSlug as LegalSlug) }
          : undefined
      }
      footerLinks={doc.footerSlugs?.map((link) => ({
        label: link.label,
        href: legalHref(link.slug as LegalSlug),
      }))}
    >
      {doc.sections.map((section) => (
        <LegalSection key={section.heading} heading={section.heading}>
          {section.body}
        </LegalSection>
      ))}
    </LegalPageLayout>
  );
}
