import { LegalPageLayout, LegalSection } from '@/src/components/legal/LegalPageLayout';

/**
 * LEGAL: Have qualified legal counsel review and approve before production
 * or app-store submission.
 */
export default function PrivacyRequestScreen() {
  return (
    <LegalPageLayout
      title="Privacy Requests"
      lastUpdated="June 26, 2026"
      relatedPage={{ label: 'Privacy Policy', href: '/privacy' }}
      footerLinks={[
        { label: 'Terms of Service', href: '/terms' },
        { label: 'Copyright & DMCA', href: '/copyright' },
      ]}
    >
      <LegalSection heading="Your choices">
        Depending on where you live, you may have the right to access, correct, delete, export, or
        restrict processing of your personal information. This page explains how to submit those
        requests for Penny Pantry.
      </LegalSection>

      <LegalSection heading="In-app account deletion">
        If you are signed in, you can delete your cloud account directly in the app: Settings →
        Account → Delete account. This permanently deletes your Supabase authentication account and
        associated cloud subscription records. Local data on your device (receipts, lists, pantry)
        is cleared as part of that flow, but some data may remain until you uninstall the app if
        deletion cannot complete for a specific key or database file.
      </LegalSection>

      <LegalSection heading="Email requests">
        You may also email privacy@pennypantry.xyz from the address tied to your account to
        request:{'\n'}
        • Access to personal information we hold about you{'\n'}
        • Correction of inaccurate information{'\n'}
        • Deletion of your account and associated cloud data{'\n'}
        • Export of your data in a portable format, where feasible{'\n\n'}
        Include enough information for us to verify your identity. We will respond within the
        timeframes required by applicable law.
      </LegalSection>

      <LegalSection heading="Guest mode">
        Guest data is stored only on your device and is not linked to a cloud account. To remove
        guest data, use Settings → Local data → Clear all local data, or uninstall the app.
      </LegalSection>

      <LegalSection heading="California residents">
        California residents may exercise CCPA/CPRA rights as described in our Privacy Policy.
        We do not sell personal information. Submit requests to privacy@pennypantry.xyz.
      </LegalSection>

      <LegalSection heading="Contact">
        privacy@pennypantry.xyz{'\n'}
        support@pennypantry.xyz
      </LegalSection>
    </LegalPageLayout>
  );
}
