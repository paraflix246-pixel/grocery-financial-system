import { LegalPageLayout, LegalSection } from '@/src/components/legal/LegalPageLayout';

export default function PrivacyScreen() {
  return (
    <LegalPageLayout title="Privacy Policy" lastUpdated="June 25, 2026">
      <LegalSection heading="Introduction">
        Penny Pantry (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is a grocery receipt and
        budgeting app. This Privacy Policy explains what information we collect, how we use it, and
        the choices you have. By using Penny Pantry, you agree to this policy.
      </LegalSection>

      <LegalSection heading="Information we collect">
        Account information: If you create an account, we use Supabase to store your email address
        and authentication credentials. We do not sell your email address.{'\n\n'}
        Receipt data on your device: Receipts, shopping lists, budgets, and pantry items are stored
        locally on your phone or browser (SQLite or equivalent local storage). We do not upload full
        receipt images or complete receipt text to our servers.{'\n\n'}
        Community pricing data: When you scan or save a receipt, you may contribute anonymized item
        names, prices, store names, and dates to our shared community database. This data is not
        linked to your email or name. A random device identifier is used only to reduce spam.{'\n\n'}
        Usage data: We may collect basic diagnostic information (such as errors or performance
        metrics) to improve the app.
      </LegalSection>

      <LegalSection heading="How we use your information">
        We use your information to: provide receipt scanning and budgeting features; power community
        price comparison and inflation trends; authenticate your account; and improve app reliability
        and features. We do not sell your personal information.
      </LegalSection>

      <LegalSection heading="Third-party services">
        We use trusted providers to operate the app, including:{'\n'}
        • Supabase — authentication and community price database{'\n'}
        • Google — optional sign-in (if you choose &quot;Continue with Google&quot;){'\n'}
        • DeepRead, OpenAI, or similar — receipt OCR and text cleanup (images are sent for
        processing; we do not store images on our servers after processing){'\n'}
        • Vercel — hosting our web app and API routes{'\n'}
        • Optional price data providers (Kroger, SerpApi, Open Food Facts) when configured
      </LegalSection>

      <LegalSection heading="Data retention">
        Local receipt data remains on your device until you delete it or uninstall the app. Community
        price contributions are retained to power price trends for all users. You may request
        deletion of your account by contacting us.
      </LegalSection>

      <LegalSection heading="Your choices">
        You can use Penny Pantry as a guest without creating an account. You can sign out at any
        time. You can disable notifications in Settings. Community price sharing occurs when you scan
        receipts; if Supabase is not configured, no community data is sent.
      </LegalSection>

      <LegalSection heading="Children">
        Penny Pantry is not directed at children under 13. We do not knowingly collect personal
        information from children under 13.
      </LegalSection>

      <LegalSection heading="Security">
        We use industry-standard practices including encrypted connections (HTTPS) and Row Level
        Security on our database. No method of transmission or storage is 100% secure.
      </LegalSection>

      <LegalSection heading="Changes">
        We may update this Privacy Policy from time to time. We will post the revised policy in the
        app with an updated date.
      </LegalSection>

      <LegalSection heading="Contact">
        For privacy questions, contact us through the support email listed in the Google Play or App
        Store listing, or via your project administrator.
      </LegalSection>
    </LegalPageLayout>
  );
}
