import { LegalPageLayout, LegalSection } from '@/src/components/legal/LegalPageLayout';

/**
 * LEGAL: Have qualified legal counsel review and approve before production
 * or app-store submission.
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
        these Terms and our Privacy Policy. If you do not agree, do not use the Service. Our Privacy
        Policy describes how we collect and use data; these Terms govern the legal relationship
        between you and Penny Pantry.
      </LegalSection>

      <LegalSection heading="The service">
        Penny Pantry helps you scan grocery receipts, track spending, compare prices across stores,
        manage shopping lists and pantry inventory, set price alerts, and optionally share lists
        with family members. Some features require an internet connection. Receipt scanning,
        community pricing, and live store prices depend on third-party services and may not be
        available in all regions or for all stores. Features may be labeled beta or experimental
        and may change or be removed without notice.
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

      <LegalSection heading="User content and contributions">
        You may submit or generate content through the Service, including receipt images, scanned
        receipt data, price corrections, shopping lists, pantry entries, and other grocery-related
        information (&quot;User Content&quot;). When our community-pricing backend (Supabase) is
        configured, certain receipt-derived data — such as item names, prices, store names, and
        purchase dates — may be contributed automatically to a shared database to power community
        price comparison. See our Privacy Policy for how this data is handled.{'\n\n'}
        You retain ownership of your local receipt data on your device. By submitting User Content,
        you grant Penny Pantry a non-exclusive, worldwide, royalty-free, sublicensable license to
        use, store, process, reproduce, display, aggregate, and de-identify your User Content as
        needed to operate, maintain, analyze, and improve the Service, including community pricing
        and price-trend features.{'\n\n'}
        You represent and warrant that: (a) you have the right to submit the User Content you
        provide; (b) your User Content does not violate any law or third-party right; and (c) you
        will not submit others&apos; confidential, proprietary, or personal information without
        lawful authority.
      </LegalSection>

      <LegalSection heading="No professional advice">
        Penny Pantry is a grocery tracking and budgeting tool for informational purposes only.
        Nothing in the Service — including spending summaries, price comparisons, savings estimates,
        alerts, pantry suggestions, or any other output — constitutes financial, accounting, tax,
        legal, investment, or nutritional advice. We are not a financial institution, broker,
        advisor, accountant, attorney, or dietitian. The Service does not create any professional
        relationship between you and Penny Pantry. Consult qualified professionals for decisions
        about taxes, investments, personal finances, health, or nutrition. You are solely
        responsible for verifying all information and for how you use the Service.
      </LegalSection>

      <LegalSection heading="No reliance">
        You may not rely on the Service, its outputs, or any data displayed in the app as the sole
        or primary basis for financial, purchasing, budgeting, tax, investment, or nutritional
        decisions. All information is provided for general informational purposes. You must
        independently verify prices, quantities, promotions, totals, and other facts before acting
        on them.
      </LegalSection>

      <LegalSection heading="No fiduciary relationship">
        Your use of the Service does not create any fiduciary, advisory, agency, partnership, or
        joint-venture relationship between you and Penny Pantry. We owe you no duty of care beyond
        providing the Service as described in these Terms. We have no obligation to act in your best
        financial or personal interest.
      </LegalSection>

      <LegalSection heading="OCR and receipt scanning">
        Receipt scanning uses optical character recognition (OCR) and automated parsing. Results
        may include errors in store names, item names, quantities, prices, dates, or totals. OCR
        quality depends on image clarity, receipt format, and third-party processing. You must
        review and correct scanned receipts before relying on them for budgeting, alerts, price
        tracking, or community contributions. We are not responsible for decisions made based on
        inaccurate scan results.
      </LegalSection>

      <LegalSection heading="AI and automated parsing">
        When configured, the Service may use automated systems — including OpenAI and/or DeepSeek
        — to interpret receipt text and structured data. AI and automated parsing are probabilistic
        and may produce incorrect, incomplete, or inconsistent results. Automated outputs are not
        authoritative and should not be treated as verified facts. You are responsible for reviewing
        all parsed data before use.
      </LegalSection>

      <LegalSection heading="Price comparisons and savings estimates">
        We do not guarantee that you will save money, find the lowest price, or that any price,
        savings estimate, alert, or comparison is accurate, complete, or current. Prices change
        frequently in stores and online. Community prices, receipt history, and third-party price
        feeds — including data from Kroger, SerpApi, Open Food Facts, and community-contributed
        pricing — may be outdated, incomplete, estimated, or wrong. Savings figures and
        &quot;cheapest cart&quot; comparisons are illustrative only. Always confirm prices,
        quantities, promotions, and totals at the store before purchasing.
      </LegalSection>

      <LegalSection heading="Third-party services">
        The Service integrates with third-party APIs, platforms, and data providers (including but
        not limited to Supabase, Stripe, Apple, Google, RevenueCat, OCR providers, OpenAI, DeepSeek,
        Kroger, SerpApi, and Open Food Facts). We do not control and are not responsible for
        third-party services, their availability, accuracy, policies, pricing, outages, or changes.
        Your use of third-party services may be subject to their separate terms and privacy policies.
        See our Privacy Policy for data-sharing details.
      </LegalSection>

      <LegalSection heading="Service availability">
        We do not guarantee uninterrupted, timely, or error-free operation of the Service. The
        Service may be unavailable due to maintenance, updates, outages, network failures, or
        events beyond our control. We may modify, suspend, or discontinue any feature or the entire
        Service at any time, with or without notice where permitted by law.
      </LegalSection>

      <LegalSection heading="Beta and experimental features">
        Some features may be labeled beta, preview, or experimental. These features are provided
        as-is, may contain bugs, may change substantially, and may be removed without notice. Your
        use of beta or experimental features is at your own risk.
      </LegalSection>

      <LegalSection heading="Disclaimer of warranties">
        THE SERVICE AND ALL CONTENT, DATA, OCR RESULTS, AI OUTPUTS, PRICE COMPARISONS, SAVINGS
        ESTIMATES, AND COMMUNITY PRICING ARE PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE,&quot;
        WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY. TO THE FULLEST
        EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, INCLUDING IMPLIED WARRANTIES OF
        MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, QUIET ENJOYMENT, ACCURACY, AND
        NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE,
        SECURE, FREE OF VIRUSES OR HARMFUL COMPONENTS, OR THAT ANY DATA, OUTPUT, OR ESTIMATE WILL BE
        ACCURATE, COMPLETE, RELIABLE, CURRENT, OR SUITABLE FOR ANY PARTICULAR PURPOSE.
      </LegalSection>

      <LegalSection heading="Limitation of liability">
        TO THE FULLEST EXTENT PERMITTED BY LAW, PENNY PANTRY AND ITS OPERATORS, AFFILIATES,
        OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, LICENSORS, AND SUPPLIERS ARE NOT LIABLE FOR ANY
        INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR FOR LOSS OF
        PROFITS, REVENUE, DATA, GOODWILL, BUSINESS OPPORTUNITY, LOST SAVINGS, PURCHASING LOSSES, OR
        OTHER INTANGIBLE LOSSES, ARISING FROM OR RELATED TO YOUR USE OF (OR INABILITY TO USE) THE
        SERVICE, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.{'\n\n'}
        OUR TOTAL AGGREGATE LIABILITY FOR ANY AND ALL CLAIMS ARISING OUT OF OR RELATING TO THESE
        TERMS OR THE SERVICE IS LIMITED TO THE GREATER OF (A) THE AMOUNT YOU PAID US FOR THE SERVICE
        IN THE TWELVE (12) MONTHS BEFORE THE EVENT GIVING RISE TO THE CLAIM, OR (B) ONE HUNDRED U.S.
        DOLLARS ($100).{'\n\n'}
        SOME JURISDICTIONS DO NOT ALLOW THE EXCLUSION OR LIMITATION OF CERTAIN DAMAGES; IN THOSE
        CASES, OUR LIABILITY IS LIMITED TO THE MAXIMUM EXTENT PERMITTED BY LAW.
      </LegalSection>

      <LegalSection heading="Indemnification">
        You agree to defend, indemnify, and hold harmless Penny Pantry and its operators, affiliates,
        officers, directors, employees, agents, and service providers from and against any claims,
        demands, damages, losses, liabilities, costs, and expenses (including reasonable
        attorneys&apos; fees) arising out of or related to: (a) your use or misuse of the Service;
        (b) your violation of these Terms or applicable law; (c) your violation of any third-party
        right; (d) User Content or data you submit, including inaccurate, misleading, or fraudulent
        receipt or price data; or (e) any dispute between you and a third party arising from your
        use of the Service. We may assume exclusive defense and control of any matter subject to
        indemnification, and you agree to cooperate with our defense.
      </LegalSection>

      <LegalSection heading="Dispute resolution and arbitration">
        PLEASE READ THIS SECTION CAREFULLY — IT AFFECTS YOUR LEGAL RIGHTS, INCLUDING YOUR RIGHT TO
        A JURY TRIAL AND TO PARTICIPATE IN A CLASS ACTION.{'\n\n'}
        Informal resolution: Before filing a claim, you agree to contact us at support@pennypantry.xyz
        and attempt in good faith to resolve the dispute informally for at least 30 days from the
        date we receive your notice.{'\n\n'}
        Binding arbitration: Except for disputes that qualify for small-claims court or for
        injunctive or equitable relief to prevent unauthorized access, intellectual property
        infringement, or misuse of the Service, any dispute, claim, or controversy arising out of or
        relating to these Terms or the Service shall be resolved exclusively by binding arbitration
        administered by the American Arbitration Association (AAA) under its Consumer Arbitration
        Rules, as modified by this section. The Federal Arbitration Act governs the interpretation
        and enforcement of this arbitration agreement. The arbitration will take place in Delaware
        or, if you prefer and the AAA rules allow, in the county where you live. The arbitrator
        shall have exclusive authority to resolve all disputes, including arbitrability. The
        arbitrator&apos;s award may be entered in any court of competent jurisdiction.{'\n\n'}
        Class action waiver: YOU AND PENNY PANTRY AGREE THAT EACH MAY BRING CLAIMS AGAINST THE OTHER
        ONLY IN YOUR OR ITS INDIVIDUAL CAPACITY, AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY
        PURPORTED CLASS, COLLECTIVE, CONSOLIDATED, OR REPRESENTATIVE PROCEEDING. Class arbitrations
        and class actions are not permitted. If this class action waiver is found unenforceable, the
        entire arbitration agreement shall be null and void, and disputes shall be resolved in court
        as described below.{'\n\n'}
        Jury trial waiver: TO THE FULLEST EXTENT PERMITTED BY LAW, YOU AND PENNY PANTRY EACH WAIVE
        ANY RIGHT TO A TRIAL BY JURY IN ANY LEGAL PROCEEDING ARISING OUT OF OR RELATING TO THESE
        TERMS OR THE SERVICE.{'\n\n'}
        Opt-out: You may opt out of this arbitration agreement within 30 days of first accepting
        these Terms by emailing privacy@pennypantry.xyz with your name, account email, and a clear
        statement that you opt out of arbitration. Opting out does not affect other provisions of
        these Terms.
      </LegalSection>

      <LegalSection heading="Governing law and venue">
        These Terms are governed by the laws of the State of Delaware, United States, without regard
        to conflict-of-law principles, except where mandatory consumer protection laws in your
        country of residence require otherwise.{'\n\n'}
        Subject to the Dispute resolution section above, if arbitration does not apply or is found
        unenforceable, you agree that exclusive jurisdiction and venue for any judicial proceeding
        (including requests for injunctive relief) lie in the state or federal courts located in
        Delaware, and you consent to personal jurisdiction in those courts. Nothing in this section
        limits the ability of an arbitrator or court to grant relief as permitted by applicable
        arbitration rules or law.
      </LegalSection>

      <LegalSection heading="Force majeure">
        We are not liable for any failure or delay in performing our obligations when caused by
        events beyond our reasonable control, including natural disasters, epidemics, war, terrorism,
        civil unrest, labor disputes, internet or telecommunications failures, power outages,
        third-party service or API outages, supply-chain disruptions, cyberattacks, or government
        actions or regulations.
      </LegalSection>

      <LegalSection heading="Assignment">
        You may not assign or transfer these Terms or your account without our prior written consent.
        We may assign or transfer these Terms, in whole or in part, without restriction, including
        in connection with a merger, acquisition, reorganization, or sale of assets. These Terms
        bind and inure to the benefit of the parties and their permitted successors and assigns.
      </LegalSection>

      <LegalSection heading="Severability">
        If any provision of these Terms is found invalid or unenforceable, that provision will be
        limited or removed to the minimum extent necessary, and the remaining provisions will remain
        in full force and effect.
      </LegalSection>

      <LegalSection heading="Entire agreement">
        These Terms, together with our Privacy Policy and any additional terms we present for
        specific features, constitute the entire agreement between you and Penny Pantry regarding
        the Service and supersede all prior or contemporaneous agreements, representations, or
        understandings on the same subject. In the event of a conflict between these Terms and the
        Privacy Policy regarding data practices, the Privacy Policy controls for privacy matters;
        these Terms control for all other legal matters.
      </LegalSection>

      <LegalSection heading="Termination">
        You may stop using the Service at any time. You may cancel paid subscriptions through the
        billing methods above. We may suspend or terminate your access immediately, with or without
        notice, if you breach these Terms, misuse the Service, submit fraudulent or abusive data, or
        if required by law. We may also modify or discontinue the Service or features with reasonable
        notice where practicable. Upon termination, your right to use the Service ends immediately.
      </LegalSection>

      <LegalSection heading="Survival">
        The following sections survive termination or expiration of these Terms or your account:
        User content and contributions (license grant), No professional advice, No reliance, No
        fiduciary relationship, OCR and receipt scanning, AI and automated parsing, Price
        comparisons and savings estimates, Third-party services, Disclaimer of warranties,
        Limitation of liability, Indemnification, Dispute resolution and arbitration, Governing law
        and venue, and any other provisions that by their nature should survive.
      </LegalSection>

      <LegalSection heading="Changes to these Terms">
        We may update these Terms from time to time. We will post the revised Terms in the app and
        on our website with an updated date. Material changes may be communicated in the app or by
        email where appropriate. Continued use after the effective date of changes constitutes
        acceptance of the revised Terms. If you do not agree to updated Terms, you must stop using
        the Service.
      </LegalSection>

      <LegalSection heading="Contact">
        For questions about these Terms:{'\n'}
        support@pennypantry.xyz{'\n\n'}
        (Placeholder address — confirm or replace before production store submission.)
      </LegalSection>
    </LegalPageLayout>
  );
}
