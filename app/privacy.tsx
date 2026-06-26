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
        Receipt and grocery data: When you scan a receipt, we process the image to extract store
        names, line items, prices, and dates. Receipt images and parsed data are stored locally on
        your device (SQLite on native apps; browser storage on web). If you are signed in and use
        features that require a server (such as family list sharing), selected grocery data may also
        be stored in our Supabase database.{'\n\n'}
        Usage and app data: We collect information about how you use the app, including receipt scan
        counts, pantry items, price alerts, shopping lists, store preferences, and in-app settings.
        This helps us enforce plan limits, deliver features, and improve reliability.{'\n\n'}
        Subscription information: If you subscribe to Penny Pantry Pro, we record your subscription
        tier, plan (monthly or annual), trial status, and renewal dates. On the web, billing is
        processed by Stripe; on iOS and Android, subscriptions are managed through RevenueCat and
        the applicable app store. We also support a local 7-day Pro trial managed in the app when
        store billing is not active.{'\n\n'}
        Device and local storage: We use AsyncStorage and SQLite (on native) to persist your
        receipts, lists, pantry, preferences, and trial state on your device.{'\n\n'}
        Community pricing (optional): When configured, anonymized item names, prices, store names,
        and purchase dates may be contributed to a shared community database to power price
        comparison and inflation trends. This data is not linked to your email or name.
      </LegalSection>

      <LegalSection heading="How we use your information">
        We use your information to:{'\n'}
        • Provide receipt scanning, price tracking, shopping lists, pantry management, and budget
        insights{'\n'}
        • Authenticate your account and keep you signed in{'\n'}
        • Sync lists and data with family members when you use household features (Pro){'\n'}
        • Process and manage subscriptions and trials{'\n'}
        • Send notifications you opt into (such as price alerts and budget reminders){'\n'}
        • Operate community pricing and store comparison features{'\n'}
        • Diagnose errors, prevent abuse, and improve app performance{'\n\n'}
        We do not sell your personal information.
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
        that require a server (such as family sync, web subscriptions, or account recovery).
        Receipt images sent for scanning are transmitted to our servers or receipt scanning
        providers for processing; we do not retain receipt images on our servers after processing
        is complete unless you explicitly save them locally.
      </LegalSection>

      <LegalSection heading="Data accuracy">
        Information displayed in the app — including scanned receipt data, price comparisons, and
        savings estimates — may be incomplete or inaccurate. OCR and third-party price feeds can
        contain errors. We process data as received and do not guarantee its accuracy. You are
        responsible for reviewing information before relying on it.
      </LegalSection>

      <LegalSection heading="Third-party services">
        We use trusted providers to operate the app. They process data only as needed to provide
        their services:{'\n\n'}
        • Supabase — authentication, database, and cloud sync for signed-in features{'\n'}
        • Google — optional sign-in via Google OAuth; on-device OCR via ML Kit on native builds
        when used{'\n'}
        • DeepRead — primary receipt OCR and text extraction{'\n'}
        • OpenAI and/or DeepSeek — optional AI-assisted receipt parsing when configured on our
        servers{'\n'}
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

      <LegalSection heading="Subscriptions and billing">
        Penny Pantry Pro is available at $3.99 per month or $39.99 per year. A 7-day free trial may
        be offered: on the web and when store billing is not active, this trial is managed locally
        in the app without payment and automatically returns to the Free plan when it ends. On iOS
        and Android, store-managed free trials may apply when available through the App Store or
        Google Play; those trials are billed by Apple or Google if not cancelled before they end.{'\n\n'}
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
        You can use Penny Pantry as a guest without creating an account; guest data stays on that
        device only. You may sign out at any time, disable notifications in Settings, and manage
        subscription billing through the methods above.{'\n\n'}
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
        Local data remains on your device until you delete it or uninstall the app. Account and
        subscription records are kept while your account is active and for a reasonable period
        afterward for legal, billing, and security purposes. Community pricing contributions may be
        retained in anonymized form to support price trends.
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
