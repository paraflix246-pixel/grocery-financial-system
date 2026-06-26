import { LegalPageLayout, LegalSection } from '@/src/components/legal/LegalPageLayout';

/**
 * LEGAL: Standard US mobile-app Terms boilerplate. Have qualified legal counsel
 * review and approve before production or app-store submission.
 */
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
        By creating an account, starting a trial, subscribing, or using the Service, you agree to
        these Terms and our Privacy Policy. If you do not agree, do not use the Service.
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
        comparison, CSV export, unlimited pantry tracking, and an ad-free experience when
        advertisements are shown on the Free plan.{'\n\n'}
        Pricing is shown in the app: $3.99 per month or $39.99 per year.
      </LegalSection>

      <LegalSection heading="Free trial">
        A 7-day Pro trial may be offered. How the trial works depends on how you access the
        Service:{'\n\n'}
        App-managed trial (web and when no store billing is active): You receive full Pro access for
        7 days with no payment required. When the trial ends, your account automatically returns
        to the Free plan. We do not charge your payment method for an app-managed trial unless you
        separately subscribe through a paid checkout flow.{'\n\n'}
        Store-managed trial (iOS App Store or Google Play, when offered): Free trials and billing
        are controlled by Apple or Google. If you start a store subscription with a promotional
        trial, you will be charged when the store trial ends unless you cancel before then through
        your device subscription settings.{'\n\n'}
        Each user is generally eligible for one app-managed trial per account or device, as
        determined by us. Trial features and eligibility may change.
      </LegalSection>

      <LegalSection heading="Subscriptions, billing, cancellation, and refunds">
        Paid subscriptions renew automatically at the end of each billing period unless cancelled
        before renewal.{'\n\n'}
        Web: Payments are processed by Stripe. Manage or cancel at any time via Manage subscription
        in the app (Stripe Customer Portal).{'\n'}
        iOS: Purchases are processed by Apple. Manage in Settings → Apple ID → Subscriptions.{'\n'}
        Android: Purchases are processed by Google. Manage in Google Play → Payments &amp;
        subscriptions → Subscriptions.{'\n\n'}
        Deleting the app does not cancel your subscription.{'\n\n'}
        Refunds: We do not process refunds directly. Refund requests for store purchases must be
        made through Apple or Google according to their policies. Web purchases are refunded
        through Stripe and applicable law. We are not obligated to provide refunds except where
        required by law or the applicable payment platform&apos;s policies. Price changes will be
        communicated in advance where required by the app store or law.
      </LegalSection>

      <LegalSection heading="Community pricing">
        When you scan receipts, anonymized item prices, store names, and dates may be contributed to
        a shared database to help users compare prices. You grant us a non-exclusive, worldwide
        license to use this anonymized data to operate and improve community pricing features. You
        retain ownership of your local receipt data on your device.
      </LegalSection>

      <LegalSection heading="No financial, tax, or investment advice">
        Penny Pantry is a grocery tracking and budgeting tool for informational purposes only. Nothing
        in the Service constitutes financial, tax, investment, accounting, or legal advice. We are
        not a financial institution, broker, or advisor. Consult qualified professionals for
        decisions about taxes, investments, or personal finances. You are solely responsible for
        how you use the information shown in the app.
      </LegalSection>

      <LegalSection heading="Price and savings disclaimer">
        We do not guarantee that you will save money, find the lowest price, or that any price,
        savings estimate, alert, or comparison is accurate, complete, or current. Prices change
        frequently in stores and online. Community prices, receipt history, third-party price feeds,
        and algorithmic comparisons may be outdated, incomplete, or wrong. Always confirm prices,
        quantities, promotions, and totals at the store before purchasing.
      </LegalSection>

      <LegalSection heading="OCR and receipt scanning">
        Receipt scanning uses optical character recognition (OCR) and automated parsing. Results may
        include errors in store names, item names, quantities, prices, dates, or totals. You should
        review and correct scanned receipts before relying on them for budgeting, alerts, or price
        tracking. We are not responsible for decisions made based on inaccurate scan results.
      </LegalSection>

      <LegalSection heading="Disclaimer of warranties">
        THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE,&quot; WITHOUT WARRANTIES
        OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY. TO THE FULLEST EXTENT PERMITTED BY LAW,
        WE DISCLAIM ALL WARRANTIES, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
        PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE
        UNINTERRUPTED, ERROR-FREE, SECURE, OR THAT OCR RESULTS, PRICES, SAVINGS ESTIMATES, OR OTHER
        DATA WILL BE ACCURATE OR RELIABLE.
      </LegalSection>

      <LegalSection heading="Limitation of liability">
        TO THE FULLEST EXTENT PERMITTED BY LAW, PENNY PANTRY AND ITS OPERATORS, AFFILIATES,
        LICENSORS, AND SUPPLIERS ARE NOT LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
        CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR FOR LOSS OF PROFITS, DATA, GOODWILL, OR
        OTHER INTANGIBLE LOSSES, ARISING FROM OR RELATED TO YOUR USE OF (OR INABILITY TO USE) THE
        SERVICE.{'\n\n'}
        OUR TOTAL LIABILITY FOR ANY CLAIM ARISING OUT OF OR RELATING TO THESE TERMS OR THE SERVICE
        IS LIMITED TO THE GREATER OF (A) THE AMOUNT YOU PAID US FOR THE SERVICE IN THE TWELVE (12)
        MONTHS BEFORE THE EVENT GIVING RISE TO THE CLAIM, OR (B) ONE HUNDRED U.S. DOLLARS ($100).
        SOME JURISDICTIONS DO NOT ALLOW CERTAIN LIMITATIONS; IN THOSE CASES, OUR LIABILITY IS
        LIMITED TO THE MAXIMUM EXTENT PERMITTED BY LAW.
      </LegalSection>

      <LegalSection heading="Indemnification">
        You agree to defend, indemnify, and hold harmless Penny Pantry and its operators,
        affiliates, and service providers from and against any claims, damages, losses, liabilities,
        costs, and expenses (including reasonable attorneys&apos; fees) arising out of or related
        to: (a) your use of the Service; (b) your violation of these Terms; (c) your violation of
        any law or third-party right; or (d) content or data you submit through the Service,
        including inaccurate receipt or price data.
      </LegalSection>

      <LegalSection heading="Dispute resolution and arbitration">
        PLEASE READ THIS SECTION CAREFULLY — IT AFFECTS YOUR LEGAL RIGHTS.{'\n\n'}
        Informal resolution: Before filing a claim, you agree to contact us at support@pennypantry.xyz
        and attempt to resolve the dispute informally for at least 30 days.{'\n\n'}
        Binding arbitration: Except for disputes that qualify for small-claims court or injunctive
        relief for intellectual property or unauthorized access, any dispute arising out of or
        relating to these Terms or the Service shall be resolved by binding arbitration administered
        by the American Arbitration Association (AAA) under its Consumer Arbitration Rules. The
        arbitration will take place in Delaware or, if you prefer and the AAA rules allow, in the
        county where you live. The arbitrator&apos;s decision will be final and binding.{'\n\n'}
        Class action waiver: YOU AND PENNY PANTRY AGREE THAT EACH MAY BRING CLAIMS AGAINST THE OTHER
        ONLY IN YOUR OR ITS INDIVIDUAL CAPACITY, AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY
        PURPORTED CLASS, COLLECTIVE, OR REPRESENTATIVE PROCEEDING.{'\n\n'}
        Opt-out: You may opt out of this arbitration agreement within 30 days of first accepting
        these Terms by emailing privacy@pennypantry.xyz with your name, account email, and a clear
        statement that you opt out of arbitration.
      </LegalSection>

      <LegalSection heading="Force majeure">
        We are not liable for any failure or delay in performing our obligations when caused by
        events beyond our reasonable control, including natural disasters, war, terrorism, labor
        disputes, internet or telecommunications failures, power outages, third-party service
        outages, or government actions.
      </LegalSection>

      <LegalSection heading="Severability">
        If any provision of these Terms is found invalid or unenforceable, that provision will be
        limited or removed to the minimum extent necessary, and the remaining provisions will remain
        in full force and effect.
      </LegalSection>

      <LegalSection heading="Entire agreement">
        These Terms, together with our Privacy Policy and any additional terms we present for
        specific features, constitute the entire agreement between you and Penny Pantry regarding
        the Service and supersede prior agreements or understandings on the same subject.
      </LegalSection>

      <LegalSection heading="Termination">
        You may stop using the Service at any time. You may cancel paid subscriptions through the
        billing methods above. We may suspend or terminate your access immediately if you breach
        these Terms, misuse the Service, submit fraudulent data, or if required by law. We may also
        modify or discontinue the Service or features with reasonable notice where practicable.
        Sections that by their nature should survive (including disclaimers, limitation of liability,
        indemnification, dispute resolution, and governing law) survive termination.
      </LegalSection>

      <LegalSection heading="Governing law">
        These Terms are governed by the laws of the State of Delaware, United States, without regard
        to conflict-of-law principles, except where mandatory consumer protection laws in your
        country of residence require otherwise. Subject to the Dispute resolution section above,
        exclusive jurisdiction for any non-arbitrable dispute lies in the state or federal courts
        located in Delaware.
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
