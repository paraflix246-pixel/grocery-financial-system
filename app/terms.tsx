import { LegalPageLayout, LegalSection } from '@/src/components/legal/LegalPageLayout';

export default function TermsScreen() {
  return (
    <LegalPageLayout
      title="Terms of Service"
      lastUpdated="June 26, 2026"
      relatedPage={{ label: 'Privacy Policy', href: '/privacy' }}
    >
      <LegalSection heading="Agreement">
        These Terms of Service (&quot;Terms&quot;) govern your access to and use of Penny Pantry, a
        grocery receipt scanning, price tracking, and budgeting application (&quot;the Service&quot;).
        By creating an account, subscribing, or using the Service, you agree to these Terms and our
        Privacy Policy. If you do not agree, do not use the Service.
      </LegalSection>

      <LegalSection heading="The service">
        Penny Pantry helps you scan grocery receipts, track spending, compare prices across stores,
        manage shopping lists and pantry inventory, set price alerts, and optionally share lists
        with family members. Some features require an internet connection. Receipt scanning,
        community pricing, and live store prices depend on third-party services and may not be
        available in all regions or for all stores.
      </LegalSection>

      <LegalSection heading="Accounts">
        You are responsible for maintaining the confidentiality of your account credentials and for
        all activity under your account. You must provide accurate information when signing up. You
        may use guest mode without an account; guest data is stored only on that device and is not
        synced or recoverable if you lose the device. You must be at least 13 years old (or the
        minimum age in your jurisdiction) to create an account. Notify us promptly if you suspect
        unauthorized access to your account.
      </LegalSection>

      <LegalSection heading="Acceptable use">
        You agree not to:{'\n'}
        • Misuse the Service or attempt to access systems, accounts, or data without authorization{'\n'}
        • Submit false, misleading, or fraudulent price or receipt data{'\n'}
        • Scrape, reverse engineer, or overload our services or third-party integrations{'\n'}
        • Use the Service for any unlawful purpose or in violation of applicable store or platform
        policies{'\n'}
        • Harass other users or interfere with family-sharing features{'\n\n'}
        We may suspend or terminate accounts that violate these Terms.
      </LegalSection>

      <LegalSection heading="Free plan">
        The Free plan includes limited access to core features, currently:{'\n'}
        • 5 receipt scans per month{'\n'}
        • Tracking for up to 2 stores{'\n'}
        • Up to 10 pantry items{'\n'}
        • 14-day price history{'\n'}
        • Basic grocery list and manual price alerts{'\n\n'}
        Limits may change with reasonable notice. Exceeding limits may require upgrading to Pro or
        waiting until the next billing period for scan resets.
      </LegalSection>

      <LegalSection heading="Penny Pantry Pro">
        Pro unlocks unlimited receipt scans, full price history, smart sale alerts, multi-store
        price comparison, household and family list sync, spending overview, cheapest-cart
        comparison, CSV export, unlimited pantry tracking, and an ad-free experience.{'\n\n'}
        Pricing is shown in the app: $3.99 per month or $39.99 per year. A 7-day free trial may be
        available without payment (app-managed on web; store-managed trials on iOS/Android when
        offered). After a trial, you will be charged unless you cancel before it ends.
      </LegalSection>

      <LegalSection heading="Subscriptions, billing, and cancellation">
        Subscriptions renew automatically at the end of each billing period unless cancelled
        before renewal.{'\n\n'}
        Web: Payments are processed by Stripe. Manage or cancel at any time via Manage subscription
        in the app (Stripe Customer Portal).{'\n'}
        iOS: Purchases are processed by Apple. Manage in Settings → Apple ID → Subscriptions.{'\n'}
        Android: Purchases are processed by Google. Manage in Google Play → Payments &amp;
        subscriptions → Subscriptions.{'\n\n'}
        Deleting the app does not cancel your subscription. Refunds are handled according to Apple,
        Google, or Stripe policies and applicable law; we do not guarantee refunds outside those
        policies. Price changes will be communicated in advance where required by the app store or
        law.
      </LegalSection>

      <LegalSection heading="Community pricing">
        When you scan receipts, anonymized item prices, store names, and dates may be contributed to
        a shared database to help users compare prices. You grant us a non-exclusive, worldwide
        license to use this anonymized data to operate and improve community pricing features. You
        retain ownership of your local receipt data on your device.
      </LegalSection>

      <LegalSection heading="Disclaimer">
        The Service provides grocery spending insights, price comparisons, and receipt parsing for
        informational purposes only. OCR results, parsed line items, community prices, and store
        data may be incomplete or inaccurate. Penny Pantry is not financial, investment, or
        professional advice. Always verify prices, quantities, and totals at the store before
        purchasing. You are solely responsible for decisions you make based on the Service.
      </LegalSection>

      <LegalSection heading="Limitation of liability">
        To the fullest extent permitted by law, Penny Pantry and its operators, affiliates, and
        suppliers are not liable for any indirect, incidental, special, consequential, or punitive
        damages, or for loss of profits, data, or goodwill, arising from your use of the Service.
        Our total liability for any claim relating to the Service is limited to the greater of (a)
        the amount you paid us in the twelve months before the claim or (b) fifty U.S. dollars
        ($50). Some jurisdictions do not allow certain limitations; in those cases, our liability
        is limited to the maximum permitted by law.
      </LegalSection>

      <LegalSection heading="Termination">
        You may stop using the Service at any time. You may cancel subscriptions through the billing
        methods above. We may suspend or terminate your access if you breach these Terms, if
        required by law, or if we discontinue the Service. We may modify or discontinue features
        with reasonable notice where practicable. Sections that by their nature should survive
        (including disclaimers, limitation of liability, and governing law) survive termination.
      </LegalSection>

      <LegalSection heading="Governing law">
        These Terms are governed by the laws of the State of Delaware, United States, without regard
        to conflict-of-law principles. Any dispute arising from these Terms or the Service shall be
        resolved in the state or federal courts located in Delaware, except where mandatory consumer
        protection laws in your country of residence require otherwise.
      </LegalSection>

      <LegalSection heading="Changes to these Terms">
        We may update these Terms from time to time. We will post the revised Terms in the app and
        on our website with an updated date. Material changes may be communicated in the app or by
        email where appropriate. Continued use after changes constitutes acceptance of the revised
        Terms.
      </LegalSection>

      <LegalSection heading="Contact">
        For questions about these Terms:{'\n'}
        support@pennypantry.xyz{'\n'}
        privacy@pennypantry.xyz{'\n\n'}
        (Placeholder addresses — confirm or replace before production store submission.)
      </LegalSection>
    </LegalPageLayout>
  );
}
