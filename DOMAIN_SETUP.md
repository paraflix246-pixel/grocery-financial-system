# Domain setup — pennypantry.xyz

Penny Pantry uses **https://pennypantry.xyz** as the primary production web origin.  
**https://www.pennypantry.xyz** should redirect to the apex (configure in Vercel → Domains).

The Vercel project slug remains `grocery-financial-system`; only the public domain changed.

**Status (2026-06-26):** `pennypantry.xyz` and `www.pennypantry.xyz` are added to Vercel project `grocery-financial-system`. DNS at the registrar is still pending. Universal link files are in `public/.well-known/` (copied to `dist/client` on deploy) — replace `TEAMID` and SHA256 placeholders before native app links will verify.

**Git auto-deploy:** Project is **not** connected to GitHub yet (`vercel git connect` failed — Vercel GitHub App likely not installed on `paraflix246-pixel`). Production deploys today are manual CLI. See [§0 Vercel Git auto-deploy](#0-vercel--git-auto-deploy) to enable push-to-production on `master`.

---

## 0. Vercel — Git auto-deploy

Goal: every push to **`master`** triggers a **Production** deployment (replacing manual `vercel --prod`).

### Check current state

- Repo: `https://github.com/paraflix246-pixel/grocery-financial-system` (default branch: `master`)
- Vercel project: `shawaynes-projects/grocery-financial-system` (`prj_LbKYQwfkysseFTAPkVwEXiVgS7BF`)
- CLI `vercel git connect https://github.com/paraflix246-pixel/grocery-financial-system.git` returns *"Failed to connect"* — fix via dashboard below.

### Dashboard (required once)

1. **Install Vercel on GitHub** (if not already): [github.com/apps/vercel](https://github.com/apps/vercel) → Configure → grant access to **`paraflix246-pixel/grocery-financial-system`** (All repositories or select this repo).
2. **Vercel** → [grocery-financial-system](https://vercel.com/shawaynes-projects/grocery-financial-system) → **Settings** → **Git** → **Connect Git Repository** → choose `paraflix246-pixel/grocery-financial-system`.
3. Same page → **Production Branch** → and **`master`** (repo default; do not use `main` unless you rename the branch).
4. Confirm **Deploy Hooks** / automatic deploys are enabled for Production.

### CLI (after GitHub App is installed)

```bash
npx vercel link --yes --project grocery-financial-system
npx vercel git connect https://github.com/paraflix246-pixel/grocery-financial-system.git
```

### Verify

Push a commit to `master` and confirm Vercel shows a **Production** deployment with the commit SHA (not a CLI-only deploy with no Git metadata).

---

## 1. Vercel — add domain & DNS

### Dashboard (recommended)

1. Open [Vercel Dashboard](https://vercel.com) → project **grocery-financial-system** → **Settings** → **Domains**.
2. Add **pennypantry.xyz** and **www.pennypantry.xyz**.
3. Set **pennypantry.xyz** as the primary domain; redirect **www** → apex.
4. Copy the DNS records Vercel shows for your registrar.

### CLI (optional)

```bash
npx vercel domains add pennypantry.xyz
npx vercel domains add www.pennypantry.xyz
```

Requires `vercel login` and a linked project (`npx vercel link`).

### DNS records (typical)

At your domain registrar (where you bought pennypantry.xyz):

| Host | Type | Value | Notes |
|------|------|-------|-------|
| `@` (apex) | **A** | `76.76.21.21` | Required by Vercel (`vercel domains inspect pennypantry.xyz`) |
| `www` | **A** | `76.76.21.21` | Vercel-recommended for this project (or CNAME `cname.vercel-dns.com` if your registrar prefers) |

Some registrars use ALIAS/ANAME for apex instead of A — follow Vercel’s instructions for your provider.

After DNS propagates, Vercel will issue HTTPS certificates automatically.

### Vercel environment variable

In **Project → Settings → Environment Variables**, set for Production (and Preview if desired):

```
EXPO_PUBLIC_APP_URL=https://pennypantry.xyz
```

Redeploy after changing env vars so the web build picks up the new URL.

---

## 2. Expo / app config

Local `.env` and `.env.example`:

```
EXPO_PUBLIC_APP_URL=https://pennypantry.xyz
```

Used for:

- Native Google OAuth redirect (`/onboarding/upgrade`)
- Password reset email redirect (`/reset-password`)
- Family invite links (`/list/join?code=…`)

Web dev uses `window.location.origin` automatically (e.g. `http://localhost:8081`).

### Deep links (native)

`app.config.ts` configures:

- **iOS** `associatedDomains`: `applinks:pennypantry.xyz`, `applinks:www.pennypantry.xyz`
- **Android** HTTPS intent filters for both hosts

After changing these, run `npx expo prebuild` and rebuild native apps.

### Universal links (web files)

Static files live in `public/.well-known/` and are copied to `dist/client/.well-known/` during Vercel build:

| File | Purpose |
|------|---------|
| `apple-app-site-association` | iOS universal links |
| `assetlinks.json` | Android App Links verification |

**Before native deep links work**, replace placeholders in `public/.well-known/` (bundle/package ID is already `com.groceryfinancialsystem.app` in `app.config.ts` / `app.json`):

| Placeholder | File | Where to get the real value |
|-------------|------|-----------------------------|
| `TEAMID` in `appID` | `apple-app-site-association` | [Apple Developer](https://developer.apple.com/account) → **Membership** → **Team ID** (10-character alphanumeric, e.g. `AB12CD34EF`). Final `appID` format: `{TEAM_ID}.com.groceryfinancialsystem.app`. |
| `REPLACE_WITH_RELEASE_SHA256_FINGERPRINT` | `assetlinks.json` | **Play Console** → your app → **Release** → **App integrity** → **App signing key certificate** → copy **SHA-256 certificate fingerprint** (colon-separated hex). Or after an EAS production build: `eas credentials -p android` → view keystore SHA256. Use the **release/upload** cert, not debug. |

Do **not** commit fake Team IDs or fingerprints — Apple/Google verification will fail.

Verify after deploy:

```bash
curl -s https://pennypantry.xyz/.well-known/apple-app-site-association
curl -s https://pennypantry.xyz/.well-known/assetlinks.json
```

Custom URL scheme (fallback): `groceryfinancialsystem://` (from `app.json`).

---

## 3. Supabase — URL configuration

**Authentication → URL Configuration**

| Setting | Value |
|---------|-------|
| **Site URL** | `https://pennypantry.xyz` |

**Redirect URLs** — add all of:

```
https://pennypantry.xyz/**
https://www.pennypantry.xyz/**
http://localhost:8081/**
```

Optional explicit paths (if you prefer not to use wildcards):

```
http://localhost:8081/onboarding/upgrade
http://localhost:8081/reset-password
https://pennypantry.xyz/onboarding/upgrade
https://pennypantry.xyz/reset-password
https://www.pennypantry.xyz/onboarding/upgrade
https://www.pennypantry.xyz/reset-password
groceryfinancialsystem://onboarding/upgrade
groceryfinancialsystem://reset-password
exp://**
```

---

## 4. Google Cloud — OAuth client

**Google Cloud Console** → **APIs & Services** → **Google Auth Platform**

### Branding

- **App name**: Penny Pantry
- **Authorized domains**: `pennypantry.xyz`, `www.pennypantry.xyz`, `<project-ref>.supabase.co`

### OAuth client (Web)

**Authorized JavaScript origins**

```
https://pennypantry.xyz
https://www.pennypantry.xyz
http://localhost:8081
```

**Authorized redirect URI** (from Supabase → Authentication → Providers → Google):

```
https://<project-ref>.supabase.co/auth/v1/callback
```

### OAuth consent screen links

- Privacy policy: `https://pennypantry.xyz/privacy`
- Terms of service: `https://pennypantry.xyz/terms`

---

## 5. Verification checklist

- [ ] Vercel Git connected; push to `master` auto-deploys Production
- [ ] DNS resolves: `pennypantry.xyz` and `www.pennypantry.xyz` → Vercel
- [ ] HTTPS works on both; www redirects to apex
- [ ] `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json` return JSON (placeholders replaced)
- [ ] `EXPO_PUBLIC_APP_URL` set locally, on Vercel, and in EAS secrets for native builds
- [ ] Supabase Site URL + redirect URLs updated
- [ ] Google OAuth origins and Supabase callback URI configured
- [ ] Google sign-in works on web production and localhost:8081
- [ ] Password reset email lands on `/reset-password`
- [ ] Family invite links use `https://pennypantry.xyz/list/join?code=…`

---

## 6. RevenueCat — native billing (code ready)

Code integration is complete (`react-native-purchases`, `src/services/subscriptionService.ts`, paywall/subscriptions UI, init in `app/_layout.tsx`). Store products must match across App Store Connect, Google Play, and RevenueCat.

### Product IDs (create identically in both stores)

| Product ID | Tier | Billing | App Store Connect type | Play Console type |
|------------|------|---------|------------------------|-------------------|
| `pro_monthly` | Pro ($3.99/mo) | Monthly | Auto-renewable subscription | Subscription |
| `pro_yearly` | Pro ($39.99/yr) | Annual | Auto-renewable subscription | Subscription |

Pro includes all paid features (family sync, spend forecast, cheapest basket, CSV export). Legacy Household subscribers are mapped to Pro in code.

### RevenueCat dashboard mapping

| RevenueCat entity | Identifier | Notes |
|-------------------|------------|-------|
| Entitlement (Pro) | `pro` | Override with `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_PRO` |
| Offering | `default` | Override with `EXPO_PUBLIC_REVENUECAT_OFFERING` |
| Packages | monthly + annual | Product/package identifiers should include `pro` and `month`/`year`/`annual` so `findPackage()` can match |

Package matching logic (`subscriptionService.ts`): offerings → `default` offering → packages whose identifier or product ID contains `pro` and maps to monthly vs annual via RevenueCat `PACKAGE_TYPE`. Legacy `household` entitlements still grant Pro access for existing subscribers.

### Environment variables (never commit)

Add to local `.env` and **EAS** for native builds (`eas env:create --environment production --name … --value …`):

```
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_…      # RevenueCat → Project → API keys → iOS
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=goog_…  # RevenueCat → Project → API keys → Android
EXPO_PUBLIC_APP_URL=https://pennypantry.xyz     # also required on EAS for invite/OAuth links
```

Optional: `EXPO_PUBLIC_REVENUECAT_USE_MOCK=true` to test tiers without hitting the store.

**Current state:** No `EXPO_PUBLIC_REVENUECAT_*` keys in local `.env`; EAS production env has no secrets yet. Add keys after creating products in App Store Connect / Play Console and linking them in RevenueCat.

Rebuild after secrets: `eas build --profile production --platform all`

---

## 7. Stripe — web billing (code ready)

Web subscriptions use **Stripe Checkout + Customer Portal**. Native iOS/Android continue to use **RevenueCat** (§6).

### Architecture

```
Web paywall → POST /api/stripe/create-checkout-session → Stripe Checkout
Stripe webhook → POST /api/stripe/webhook → Supabase stripe_subscriptions
Web app load → GET /api/stripe/subscription-status → Pro tier sync
Manage billing → POST /api/stripe/create-portal-session → Stripe Customer Portal
```

Run migration `supabase/migrations/005_stripe_subscriptions.sql` in Supabase SQL Editor before going live.

### Products (Stripe Dashboard → Products)

| Product | Price | Billing | Notes |
|---------|-------|---------|-------|
| Penny Pantry Pro | $3.99 | Monthly recurring | Copy **Price ID** → `STRIPE_PRICE_PRO_MONTHLY` |
| Penny Pantry Pro | $39.99 | Yearly recurring | Copy **Price ID** → `STRIPE_PRICE_PRO_YEARLY` |

Use **test mode** first (`sk_test_…`, `price_…` from test products).

### Vercel environment variables

Add to **Production** (and **Preview** for staging):

| Variable | Where to get it |
|----------|-----------------|
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Developers → Webhooks → signing secret |
| `STRIPE_PRICE_PRO_MONTHLY` | Product → monthly price ID |
| `STRIPE_PRICE_PRO_YEARLY` | Product → annual price ID |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` (never expose to client) |
| `EXPO_PUBLIC_APP_URL` | `https://pennypantry.xyz` (already required) |

Optional local dev: `EXPO_PUBLIC_STRIPE_USE_MOCK=true` to skip Stripe and use mock tier gates.

### Webhook endpoint

1. Stripe Dashboard → **Developers → Webhooks → Add endpoint**
2. URL: `https://pennypantry.xyz/api/stripe/webhook`
3. Events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy **Signing secret** → `STRIPE_WEBHOOK_SECRET` on Vercel
5. Redeploy after adding env vars

Local webhook testing:

```bash
stripe listen --forward-to localhost:8081/api/stripe/webhook
```

### Customer Portal

Stripe Dashboard → **Settings → Billing → Customer portal** → enable and allow subscription cancellation.

### Manual test checklist (test mode)

- [ ] Migration `005_stripe_subscriptions.sql` applied in Supabase
- [ ] All Stripe + `SUPABASE_SERVICE_ROLE_KEY` env vars set on Vercel
- [ ] Webhook endpoint active and receiving events
- [ ] Sign in on web → Paywall → **Subscribe to Pro** redirects to Stripe Checkout
- [ ] Test card `4242 4242 4242 4242` completes → `/subscriptions?stripe=success` shows Pro
- [ ] **Manage subscription** opens Stripe portal; cancel keeps access until period end
- [ ] 7-day local trial still works; subscribing during trial clears trial and marks paid

---

## Legacy URL

The old deployment URL `https://grocery-financial-system.vercel.app` may remain as a Vercel alias.  
You can remove it from **Domains** once pennypantry.xyz is live, or keep it temporarily and redirect to the new domain in Vercel.
