import { LegalPageLayout, LegalSection } from '@/src/components/legal/LegalPageLayout';

/**
 * LEGAL: Have qualified legal counsel review and approve before production
 * or app-store submission.
 */
export default function CopyrightScreen() {
  return (
    <LegalPageLayout
      title="Copyright & DMCA Policy"
      lastUpdated="June 26, 2026"
      relatedPage={{ label: 'Terms of Service', href: '/terms' }}
      footerLinks={[
        { label: 'Privacy Policy', href: '/privacy' },
        { label: 'Privacy Requests', href: '/privacy-request' },
      ]}
    >
      <LegalSection heading="Overview">
        Penny Pantry respects intellectual property rights and expects users to do the same. This
        policy describes how to report copyright infringement and how we respond to valid notices
        under the Digital Millennium Copyright Act (DMCA) and similar laws.
      </LegalSection>

      <LegalSection heading="Reporting infringement">
        If you believe content accessible through the Service infringes your copyright, send a
        written notice to our designated agent with:{'\n'}
        • Your physical or electronic signature{'\n'}
        • Identification of the copyrighted work claimed to be infringed{'\n'}
        • Identification of the material you claim is infringing and information reasonably
        sufficient to locate it within the Service{'\n'}
        • Your contact information (address, telephone, email){'\n'}
        • A statement that you have a good-faith belief the use is not authorized by the copyright
        owner, its agent, or the law{'\n'}
        • A statement, under penalty of perjury, that the information in your notice is accurate
        and that you are authorized to act on behalf of the copyright owner
      </LegalSection>

      <LegalSection heading="Designated agent">
        DMCA notices and counter-notices should be sent to:{'\n\n'}
        privacy@pennypantry.xyz{'\n\n'}
        (Placeholder — confirm designated agent registration before production.)
      </LegalSection>

      <LegalSection heading="Counter-notification">
        If you believe material was removed or disabled by mistake or misidentification, you may
        submit a counter-notification to the designated agent with the information required by
        applicable law. We may restore removed material in accordance with the DMCA where
        appropriate.
      </LegalSection>

      <LegalSection heading="Repeat infringers">
        We may terminate or suspend accounts of users who are repeat infringers, as determined by
        us in appropriate circumstances.
      </LegalSection>
    </LegalPageLayout>
  );
}
