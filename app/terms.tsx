import { LegalPageLayout, LegalSection } from '@/src/components/legal/LegalPageLayout';

export default function TermsScreen() {
  return (
    <LegalPageLayout title="Terms of Service" lastUpdated="June 25, 2026">
      <LegalSection heading="Agreement">
        These Terms of Service (&quot;Terms&quot;) govern your use of Penny Pantry, a grocery receipt
        scanning and budgeting application. By creating an account or using the app, you agree to
        these Terms.
      </LegalSection>

      <LegalSection heading="The service">
        Penny Pantry helps you scan grocery receipts, track spending, compare prices, and manage
        shopping lists. Some features require an internet connection. Community pricing features
        depend on contributions from users and may not be available in all areas.
      </LegalSection>

      <LegalSection heading="Accounts">
        You are responsible for maintaining the confidentiality of your account credentials. You
        must provide accurate information when signing up. You may use guest mode without an account,
        but your data will only be stored on that device.
      </LegalSection>

      <LegalSection heading="Acceptable use">
        You agree not to: misuse the app or attempt to access systems without authorization; submit
        false or fraudulent price data; scrape or overload our services; or use the app for any
        unlawful purpose. We may suspend accounts that violate these Terms.
      </LegalSection>

      <LegalSection heading="Community pricing">
        When you scan receipts, anonymized item prices may be contributed to a shared database to
        help other users compare prices. You grant us a non-exclusive license to use this anonymized
        data to operate and improve community pricing features. You retain ownership of your local
        receipt data on your device.
      </LegalSection>

      <LegalSection heading="Penny Pantry Pro">
        Pro features may require a paid subscription. Pricing is shown in the app (currently
        $4.99/month or $49.99/year). Subscriptions, billing, and refunds are handled through the
        applicable app store when payment is enabled. During the MVP period, Pro may be available as
        a local mock without real payment processing.
      </LegalSection>

      <LegalSection heading="Disclaimer">
        Price comparisons, OCR results, and spending insights are provided for informational
        purposes only. We do not guarantee accuracy of scanned prices, store names, or community
        data. Always verify prices at the store before purchasing.
      </LegalSection>

      <LegalSection heading="Limitation of liability">
        To the fullest extent permitted by law, Penny Pantry and its operators are not liable for
        indirect, incidental, or consequential damages arising from your use of the app. Our total
        liability is limited to the amount you paid us in the twelve months before the claim, or
        $50, whichever is greater.
      </LegalSection>

      <LegalSection heading="Termination">
        You may stop using the app at any time. We may discontinue or modify features with reasonable
        notice where practicable.
      </LegalSection>

      <LegalSection heading="Changes">
        We may update these Terms. Continued use after changes constitutes acceptance of the revised
        Terms.
      </LegalSection>

      <LegalSection heading="Contact">
        For questions about these Terms, contact us through the support email in your app store
        listing or your project administrator.
      </LegalSection>
    </LegalPageLayout>
  );
}
