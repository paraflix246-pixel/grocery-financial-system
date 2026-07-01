import type { LegalDocumentContent } from '@/src/legal/types';
import { LEGAL_CONTACT } from '@/src/legal/config';

const { appName, privacyEmail, supportEmail } = LEGAL_CONTACT;

export const EN_LEGAL_DOCUMENTS: Record<string, LegalDocumentContent> = {
  privacy: {
    slug: 'privacy',
    title: 'Privacy Policy',
    lastUpdated: 'June 30, 2026',
    relatedSlug: 'terms',
    relatedLabel: 'Terms of Service',
    footerSlugs: [
      { slug: 'data-retention', label: 'Data Retention Policy' },
      { slug: 'cookies', label: 'Cookie Policy' },
      { slug: 'privacy-request', label: 'Privacy Requests' },
    ],
    sections: [
      {
        heading: 'Introduction',
        body: `${appName} ("we," "our," or "us") helps you scan grocery receipts, track spending, manage lists and pantry inventory, and optionally share anonymized pricing to improve store comparisons. This Privacy Policy explains what we collect, why, how long we keep it, and your rights under GDPR, CCPA/CPRA, and comparable laws.`,
      },
      {
        heading: 'Information we collect',
        body: `Account information: Email address and optional display name when you create an account. Google sign-in provides basic profile fields permitted by your Google settings. Authentication is handled by Supabase.\n\nReceipt data: When you scan a receipt, the image is sent to our servers and/or OCR providers for parsing. Parsed store names, line items, prices, and dates are stored locally on your device (SQLite on native apps; AsyncStorage-backed storage on web). You choose whether to keep the receipt image or extracted data only after each scan, and can save that preference in Settings → Privacy & Data.\n\nUsage data: Scan counts for plan limits, pantry items, price alerts, shopping lists, store preferences, and in-app settings. Spending summaries are computed on your device from your receipt data.\n\nSubscription data: Tier, plan, trial status, and renewal dates. Web billing uses Stripe; mobile uses RevenueCat and app stores when configured.\n\nCommunity pricing (opt-in): If you enable Community Price Sharing in Settings → Privacy & Data, anonymized product names, prices, store names, purchase dates, and general region (city/state) may be contributed after you save a receipt. Personal identifiers — customer names, emails, phones, home addresses, payment cards, loyalty numbers, receipt numbers, transaction IDs, auth codes, cashier IDs, and tax IDs — are stripped before contribution and never stored in the community database.`,
      },
      {
        heading: 'How we use information',
        body: `We process receipt data only for core app features: receipt history, spending analysis, pantry sync, price tracking, comparisons, sale detection, and recommendations. We do not sell personal information or use it for cross-context behavioral advertising.`,
      },
      {
        heading: 'Legal bases (EEA/UK)',
        body: `Where GDPR applies, we rely on: (a) contract — to provide the service you request; (b) legitimate interests — to secure the app and improve anonymized price trends when you opt in; (c) consent — for optional community price sharing and non-essential notifications; (d) legal obligation — where required by law.`,
      },
      {
        heading: 'Storage and security',
        body: `Penny Pantry is local-first: receipts and lists stay on your device by default. Cloud storage (Supabase) is used for signed-in features such as account auth, subscriptions, and family workspace sync when enabled.\n\nData in transit is protected with TLS (HTTPS). Local SQLite and AsyncStorage are protected by your device OS; we do not implement separate client-side encryption for receipt databases today. Supabase provides encryption at rest for cloud data. Receipt images saved locally remain on your device until you delete the receipt or uninstall the app.`,
      },
      {
        heading: 'Retention',
        body: `See our Data Retention Policy for category-specific periods. In summary: local receipt data remains until you delete individual receipts, delete all receipt history, or delete your account. Community pricing contributions are anonymized aggregates and may be retained to support price trends even after account deletion.`,
      },
      {
        heading: 'Your rights',
        body: `Depending on your location you may have the right to access, correct, delete, export, restrict, or object to processing of your personal information, and to withdraw consent where processing is consent-based.\n\nIn-app: Settings → Privacy & Data (community sharing, receipt image preference, delete all receipts). Settings → Delete account for full account removal.\n\nEmail: ${privacyEmail} or use Privacy Requests in the app.`,
      },
      {
        heading: 'Children',
        body: `${appName} is not directed to children under 13 (or 16 where applicable). We do not knowingly collect personal information from children.`,
      },
      {
        heading: 'Contact',
        body: `Privacy questions: ${privacyEmail}\nGeneral support: ${supportEmail}`,
      },
    ],
  },
  terms: {
    slug: 'terms',
    title: 'Terms of Service',
    lastUpdated: 'June 30, 2026',
    relatedSlug: 'privacy',
    relatedLabel: 'Privacy Policy',
    footerSlugs: [
      { slug: 'data-retention', label: 'Data Retention Policy' },
      { slug: 'copyright', label: 'Copyright & DMCA' },
    ],
    sections: [
      {
        heading: 'Agreement',
        body: `These Terms govern your use of ${appName}. By creating an account, subscribing, or using the service, you agree to these Terms and our Privacy Policy.`,
      },
      {
        heading: 'The service',
        body: `${appName} provides grocery receipt scanning, price tracking, budgeting tools, shopping lists, pantry management, and optional anonymized community price comparisons. OCR, third-party store prices, and community data may be incomplete or inaccurate.`,
      },
      {
        heading: 'Your content and choices',
        body: `You retain ownership of receipts and data you enter. You control whether receipt images are stored locally, whether anonymized prices are shared with the community database, and whether to delete receipts or your account at any time through Settings.`,
      },
      {
        heading: 'Acceptable use',
        body: `Do not misuse the service, attempt unauthorized access, scrape the community database, or submit fraudulent receipt data. We may suspend accounts that abuse rate limits or threaten service integrity.`,
      },
      {
        heading: 'Subscriptions',
        body: `Paid plans, trials, and billing terms are presented at purchase. Cancel through the platform where you subscribed (app store, Stripe customer portal, or RevenueCat-managed subscription).`,
      },
      {
        heading: 'Disclaimer',
        body: `The service is provided "as is." Price comparisons and spending summaries are informational only — not financial, tax, or nutritional advice.`,
      },
      {
        heading: 'Contact',
        body: `Questions about these Terms: ${supportEmail}`,
      },
    ],
  },
  cookies: {
    slug: 'cookies',
    title: 'Cookie Policy',
    lastUpdated: 'June 30, 2026',
    relatedSlug: 'privacy',
    relatedLabel: 'Privacy Policy',
    footerSlugs: [{ slug: 'data-retention', label: 'Data Retention Policy' }],
    sections: [
      {
        heading: 'Scope',
        body: `This policy applies to the ${appName} web app at pennypantry.xyz and related web routes. Native iOS and Android apps use local device storage (AsyncStorage/SQLite) rather than browser cookies for primary data.`,
      },
      {
        heading: 'Cookies and similar technologies we use',
        body: `Essential storage: Session and auth tokens for Supabase sign-in, and local persistence keys for grocery data when web SQLite is unavailable.\n\nWe do not use third-party advertising cookies or cross-site tracking pixels. We do not run Google Analytics or similar behavioral analytics SDKs in the app.`,
      },
      {
        heading: 'Managing cookies',
        body: `You can clear site data through your browser settings. Clearing storage will sign you out and remove locally stored receipts and lists on web. Auth cookies are managed by Supabase according to your browser cookie controls.`,
      },
      {
        heading: 'Contact',
        body: `Cookie or privacy questions: ${privacyEmail}`,
      },
    ],
  },
  'data-retention': {
    slug: 'data-retention',
    title: 'Data Retention Policy',
    lastUpdated: 'June 30, 2026',
    relatedSlug: 'privacy',
    relatedLabel: 'Privacy Policy',
    footerSlugs: [{ slug: 'privacy-request', label: 'Privacy Requests' }],
    sections: [
      {
        heading: 'Overview',
        body: `${appName} minimizes data retention. This policy describes how long categories of data are kept and how you can delete them.`,
      },
      {
        heading: 'Local receipt data',
        body: `Receipts, line items, and optional receipt images stored on your device are kept until you delete an individual receipt, use Delete all receipt history in Settings → Privacy & Data, delete your account, or uninstall the app.`,
      },
      {
        heading: 'Account and cloud data',
        body: `When you delete your account (Settings → Delete account), we delete your Supabase auth user and associated subscription records via our account deletion API. Local data is wiped as part of that flow. Residual backups, if any, are purged per Supabase and Stripe retention schedules.`,
      },
      {
        heading: 'Community price database',
        body: `Anonymized product pricing contributed with your opt-in consent may be retained in aggregated form to power price trends. These records do not include your account identity, receipt images, or personal identifiers.`,
      },
      {
        heading: 'OCR processing',
        body: `Receipt images transmitted for OCR are processed to return parsed data. We do not intentionally retain receipt images on our servers after processing completes; ephemeral server logs may briefly record request metadata.`,
      },
      {
        heading: 'Legal holds',
        body: `We may retain information longer when required by law, regulation, legal process, or to establish, exercise, or defend legal claims.`,
      },
      {
        heading: 'Contact',
        body: `Retention questions or deletion requests: ${privacyEmail}`,
      },
    ],
  },
};
