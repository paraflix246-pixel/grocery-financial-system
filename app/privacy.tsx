import { LegalPageLayout, LegalSection } from '@/src/components/legal/LegalPageLayout';

/**
 * LEGAL: Standard US mobile-app Privacy Policy boilerplate. Have qualified legal counsel
 * review and approve before production or app-store submission.
 */
export default function PrivacyScreen() {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      lastUpdated="June 26, 2026"
      relatedPage={{ label: 'Terms of Service', href: '/terms' }}
    >
      <LegalSection heading="Introduction">
        Penny Pantry (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is a grocery finance app
        that helps you scan receipts, track prices, manage shopping lists and pantry inventory, and
        optionally sync with family members. This Privacy Policy explains what information we
        collect, how we use and store it, who we share it with, and the choices you have. By using
        Penny Pantry, you agree to this policy.
      </LegalSection>

      <LegalSection heading="Information we collect">
        Account information: When you create an account, we collect your email address and, if you
        provide it, your display name. If you sign in with Google, we receive basic profile
        information from Google (such as your name and email) as permitted by your Google account
        settings. Authentication is handled by Supabase.{'\n\n'}
        Receipt and grocery data: When you scan a receipt, the image is transmitted to our servers
        and/or receipt-scanning providers for optical character recognition (OCR) and automated
        parsing. Parsed store names, line items, prices, and dates are stored locally on your device
        (SQLite on native apps; browser storage on web). Receipt images may also be saved locally as
        part of your receipt history until you delete the receipt or uninstall the app. Receipt
        images and parsed data are not used for advertising. If you are signed in and use features
        that require a server (such as family list sharing), selected grocery data may also be stored
        in our Supabase database.{'\n\n'}
        Usage and app data: We record information needed to operate the app, including receipt scan
        counts (for plan limits), pantry items, price alerts, shopping lists, store preferences, and
        in-app settings. Spending charts and summaries are computed from your local receipt data on
        your device. We do not use third-party crash-reporting or behavioral analytics SDKs.{'\n\n'}
        Subscription information: If you subscribe to Penny Pantry Pro, we record your subscription
        tier, plan (monthly or annual), trial status, and renewal dates. On the web, billing is
        processed by Stripe; on iOS and Android, subscriptions are managed through RevenueCat and
        the applicable app store. We also support a local 7-day Pro trial managed in the app when
        store billing is not active.{'\n\n'}
        Device and local storage: We use AsyncStorage and SQLite (on native) to persist your
        receipts, lists, pantry, preferences, and trial state on your device.{'\n\n'}
        Community pricing: When our community-pricing backend is configured, item names, prices,
        store names, and purchase dates from receipt scans may be contributed automatically to a
        shared database to power price comparison and inflation trends. This data is de-identified
        and aggregated where reasonably practicable and is not linked to your email, display name,
        or account identity. A random device-scoped identifier may be used to deduplicate
        contributions.
      </LegalSection>

      <LegalSection heading="Guest mode">
        You may use Penny Pantry as a guest without creating an account (Continue as Guest on the
        sign-up or sign-in screen). Guest mode is device-only: your receipts, lists, and settings
        stay on that device, are not synced to the cloud, and cannot be recovered if you lose or
        replace the device. Creating an account later does not automatically migrate guest data
        unless you explicitly export or re-enter it.
      </LegalSection>

      <LegalSection heading="How we use your information">
        We use your information to:{'\n'}
        • Provide receipt scanning, price tracking, shopping lists, pantry management, and spending
        summaries derived from your receipt data{'\n'}
        • Authenticate your account and keep you signed in{'\n'}
        • Sync lists and data with family members when you use household features (Pro){'\n'}
        • Process and manage subscriptions and trials{'\n'}
        • Send notifications you opt into (such as price alerts and budget reminders){'\n'}
        • Operate community pricing and store comparison features when enabled{'\n'}
        • Enforce plan limits, prevent abuse, and maintain server-side receipt parsing{'\n\n'}
        We do not sell your personal information. We do not use personal information to build
        advertising profiles or deliver cross-context behavioral advertising.
      </LegalSection>

      <LegalSection heading="No professional advice">
        Information displayed in the app — including spending summaries, price comparisons, savings
        estimates, and pantry data — is for informational purposes only. It is not financial,
        accounting, tax, legal, investment, or nutritional advice. Consult qualified professionals
        for decisions in those areas.
      </LegalSection>

      <LegalSection heading="No sale of personal data">
        We do not sell, rent, or trade your personal information to third parties for their
        marketing purposes. We share data only as described in this policy — for example, with
        service providers that help us operate the app, with family members you invite, when
        required by law, or in connection with a business transfer as described below.
      </LegalSection>

      <LegalSection heading="How data is stored">
        Penny Pantry is designed local-first: your receipts, lists, and pantry data live on your
        device by default. Cloud storage through Supabase is used when you sign in and use features
        that require a server (such as family sync, web subscriptions, or account recovery).{'\n\n'}
        Receipt images: Images you scan are transmitted to our servers and/or OCR providers for
        processing. We do not intentionally retain receipt images on our servers after processing
        completes; server-side logs may briefly record request metadata. Parsed receipt data and,
        when you save a receipt, the image itself are stored locally on your device as part of your
        receipt history until you delete them.
      </LegalSection>

      <LegalSection heading="Data accuracy and automated processing">
        Information displayed in the app — including scanned receipt data, price comparisons, and
        savings estimates — may be incomplete or inaccurate. Automated OCR, receipt parsing, and
        third-party price feeds can contain errors. When configured, AI-assisted parsing (OpenAI
        and/or DeepSeek) is probabilistic and may misread or omit receipt details; outputs are not
        verified facts. We process data as received and do not guarantee its accuracy. You are
        responsible for reviewing information before relying on it.
      </LegalSection>

      <LegalSection heading="Third-party services">
        We use trusted providers to operate the app. They process data only as needed to provide
        their services:{'\n\n'}
        • Supabase — authentication, database, cloud sync for signed-in features, and community
        price records when configured{'\n'}
        • Google — optional sign-in via Google OAuth{'\n'}
        • DeepRead — primary receipt OCR and text extraction{'\n'}
        • OpenAI and/or DeepSeek — optional server-side receipt parsing and text interpretation when
        configured (may receive receipt text and, when enabled, image data){'\n'}
        • PaddleOCR and/or OCR.space — optional OCR fallback when configured{'\n'}
        • Stripe — web subscription payments and billing portal (when configured){'\n'}
        • RevenueCat — native in-app subscription management on iOS and Android{'\n'}
        • Vercel — hosting our web app and API routes{'\n'}
        • Kroger, SerpApi, and Open Food Facts — optional live or reference price data when
        configured{'\n\n'}
        Each provider has its own privacy policy. We encourage you to review those policies for
        details on how they handle data.
      </LegalSection>

      <LegalSection heading="Third-party links and content">
        The Service may link to or display content from third-party stores, websites, or services
        (such as weekly ads or product pages). We do not control those sites and are not
        responsible for their privacy practices or content. Your use of third-party services is
        governed by their own terms and policies.
      </LegalSection>

      <LegalSection heading="Advertising">
        Penny Pantry does not currently show third-party advertisements or use your data for
        ad targeting. Pro includes an ad-free experience when advertisements are shown on the Free
        plan. If we introduce advertising on the Free plan in the future, we will update this
        Privacy Policy before or when ads launch and describe what data, if any, is used for ad
        delivery or measurement.
      </LegalSection>

      <LegalSection heading="Subscriptions and billing">
        Penny Pantry Pro is available at $3.99 per month or $39.99 per year. A 7-day free trial may
        be offered:{'\n\n'}
        App-managed trial (web and when store billing is not active): You receive full Pro access
        for 7 days with no payment required. When the trial ends, your account automatically
        returns to the Free plan. We do not charge your payment method for an app-managed trial
        unless you separately subscribe through a paid checkout flow.{'\n\n'}
        Store-managed trial (iOS App Store or Google Play, when offered): Free trials and billing
        are controlled by Apple or Google. If you start a store subscription with a promotional
        trial, you will be charged when the store trial ends unless you cancel before then through
        your device subscription settings.{'\n\n'}
        Paid subscriptions auto-renew unless cancelled before the end of the current billing period.
        On the web, cancel through the Stripe Customer Portal (Manage subscription in the app). On
        iOS, cancel in Settings → Apple ID → Subscriptions. On Android, cancel in Google Play →
        Payments &amp; subscriptions → Subscriptions. Deleting the app does not cancel a
        subscription.{'\n\n'}
        Refunds for store purchases follow Apple or Google policies. Web refunds follow Stripe and
        applicable law. We do not process refunds directly except as required by law.
      </LegalSection>

      <LegalSection heading="Data sharing">
        We do not sell or rent your personal information. We share data only:{'\n'}
        • With the third-party providers listed above, to operate the service{'\n'}
        • With family members you invite, for shared lists and household sync (Pro){'\n'}
        • When required by law, legal process, or to protect rights and safety{'\n'}
        • In connection with a merger, acquisition, reorganization, or sale of assets (see Business
        transfers below)
      </LegalSection>

      <LegalSection heading="Business transfers">
        If we are involved in a merger, acquisition, financing, reorganization, bankruptcy, or sale
        of all or part of our business, your information may be transferred as part of that
        transaction. We will notify you of any change in ownership or use of your personal
        information, as required by applicable law.
      </LegalSection>

      <LegalSection heading="California privacy rights (CCPA/CPRA)">
        If you are a California resident, you may have the right to:{'\n'}
        • Know what personal information we collect, use, and disclose{'\n'}
        • Request deletion of personal information we hold about you{'\n'}
        • Correct inaccurate personal information{'\n'}
        • Opt out of the &quot;sale&quot; or &quot;sharing&quot; of personal information{'\n\n'}
        We do not sell personal information as defined by California law. Because we do not sell
        data, an opt-out of sale is not applicable, but you may still contact us to exercise your
        other rights. To submit a request, email privacy@pennypantry.xyz with the address tied to
        your account. We will verify your request and respond within the timeframes required by
        law. You may designate an authorized agent to submit requests on your behalf where permitted
        by law.
      </LegalSection>

      <LegalSection heading="Your rights and choices">
        You may sign out at any time, disable notifications in Settings, and manage subscription
        billing through the methods above. See Guest mode for how guest data is handled.{'\n\n'}
        Depending on where you live, you may have the right to access, correct, delete, or export
        your personal data, and to object to or restrict certain processing. To exercise these
        rights, contact us at the email below. We will respond within a reasonable time as required
        by applicable law.{'\n\n'}
        To delete your account and associated cloud data, email privacy@pennypantry.xyz from the
        address tied to your account. We do not currently offer in-app account deletion. Local data
        on your device can be removed by deleting items in the app or uninstalling the app.
      </LegalSection>

      <LegalSection heading="International users">
        Penny Pantry is operated from the United States. If you use the app from outside the U.S.,
        your information may be transferred to and processed in the U.S. and other countries where
        our service providers operate. Where the GDPR or similar laws apply, we rely on appropriate
        legal bases (such as contract performance, legitimate interests, and consent where required)
        and honor applicable data-subject rights described above.
      </LegalSection>

      <LegalSection heading="Children's privacy">
        Penny Pantry is not directed at children under 13 (or the minimum age required in your
        country). We do not knowingly collect personal information from children. If you believe a
        child has provided us personal information, contact us and we will delete it.
      </LegalSection>

      <LegalSection heading="Security">
        We use industry-standard measures including HTTPS encryption and database access controls
        (including Row Level Security on Supabase). No method of transmission or storage is 100%
        secure; we cannot guarantee absolute security.
      </LegalSection>

      <LegalSection heading="Data breach notification">
        If we become aware of a security incident that compromises your personal information, we will
        investigate promptly and take reasonable steps to mitigate harm. Where required by applicable
        law, we will notify affected users and regulators within the timeframes required by that
        law.
      </LegalSection>

      <LegalSection heading="Data retention">
        We retain personal information only as long as necessary to provide the Service, comply
        with legal obligations, resolve disputes, enforce our agreements, and protect security.
        Local data, including receipt images and parsed receipt data, remains on your device until
        you delete it or uninstall the app. Account and subscription records are kept while your
        account is active and for a reasonable period afterward as described above. De-identified
        community pricing contributions may be retained to support price trends.
      </LegalSection>

      <LegalSection heading="Changes to this policy">
        We may update this Privacy Policy from time to time. We will post the revised policy in the
        app and on our website with an updated &quot;Last updated&quot; date. Material changes may
        also be communicated in the app or by email where appropriate. Continued use after changes
        constitutes acceptance of the updated policy.
      </LegalSection>

      <LegalSection heading="Contact us">
        For privacy questions, data requests, or account deletion:{'\n'}
        privacy@pennypantry.xyz{'\n'}
        support@pennypantry.xyz{'\n\n'}
        (Placeholder addresses — confirm or replace before production store submission.)
      </LegalSection>
    </LegalPageLayout>
  );
}
