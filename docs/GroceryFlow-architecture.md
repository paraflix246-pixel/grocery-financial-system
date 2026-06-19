# GroceryFlow / SmartCart Architecture

## Overview

SmartCart (Grocery Financial System) is a local-first Expo React Native app for grocery receipt scanning, shopping list management, budget tracking, and price intelligence. Data persists on-device via SQLite (native) or AsyncStorage JSON (web).

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Expo SDK 56, React Native 0.85 |
| Routing | expo-router (file-based) |
| State | Zustand stores |
| Storage | expo-sqlite / web JSON fallback |
| Charts | react-native-gifted-charts |
| OCR | ML Kit (native), Tesseract.js (web) |

## Directory Structure

```
app/                    # Screens (expo-router)
  (tabs)/               # Tab navigation: Home, Lists, Scan, Receipts, More
  receipt/              # Receipt flow: preview, edit, manual, link
  settings/             # Profile, budget, notifications
  paywall/              # Pro upgrade
  subscriptions/        # Manage subscription
  insights_pro/         # AI Insights Pro (computed analytics)
  inflation_tracker/    # Personal price index
  marketplace/          # Curated deals
  ...                   # Phase 3 monetization screens

src/
  components/           # Reusable UI (SmartCart-themed)
  services/             # Business logic & data access
  store/                # Zustand stores
  models/               # Types & schema
  theme/smartCart.ts    # Design tokens
  hooks/                # useFeatureGate, etc.
```

## Data Flow

```
User action (scan, save receipt, edit list)
    → Screen / Store
    → storageService (SQLite or web JSON)
    → Side effects:
        - storeService (register stores)
        - crowdsourcedPricingService (anonymized price points)
        - comparison / matching services
    → analyticsService (aggregations on read)
    → UI refresh
```

### Receipt lifecycle

1. **Capture** — Camera or image picker (`scan.tsx` / `scan.web.tsx`)
2. **OCR** — `ocrService.native.ts` / `ocrService.web.ts` → `ParsedReceiptDraft`
3. **Review** — `receipt/preview.tsx`, `receipt/edit.tsx`, `receipt/manual.tsx`
4. **Save** — `storageService.saveReceipt()` → contributes to community price cache
5. **Link** — Optional link to shopping list → `matchingService` → comparison

## Phases

### Phase 1 — Core MVP (36b9931)
- Tab navigation, home dashboard, receipt scan/OCR
- Shopping lists, budget settings, store tracking
- SmartCart UI theme, web SQLite fixes

### Phase 2 — Retention & Trust (86e8323)
- Settings screen, price alerts, store detail pages
- Spending analytics, comparison summaries
- Onboarding, manual receipt entry

### Phase 3 — Monetization & Advanced (current)
- **Subscription foundation** — `useSubscriptionStore`, `featureGateService`, paywall
- **Pro insights** — `getProInsights()`, inflation tracker from receipt history
- **Crowdsourced pricing** — Local aggregate cache, community vs history in cart comparison
- **Monetization screens** — Marketplace, affiliates, cashback, sponsored, enterprise, API
- **Family plans** — Share codes, list JSON export/import
- **Notifications** — `notificationService` (expo-notifications native, in-app web)
- **Usage tracking** — Local stats from storage

## Feature Gating

```typescript
// Pro features checked via featureGateService + useFeatureGate hook
canAccessFeature('insights_pro')  // true when tier === 'pro'
promptUpgrade() → navigates to /paywall
```

Subscription state is mock/local (AsyncStorage). Production would integrate App Store / Play billing.

## Crowdsourced Pricing (Future API)

`crowdsourcedPricingService.ts` implements `ICrowdsourcedPricingProvider`:

- **Local MVP** — `contributeFromReceipt()` on save, `getCommunityPricesForItem()` on read
- **Future** — Replace `localCrowdsourcedProvider` with remote sync; types unchanged

`priceComparisonService` merges: **your history** → **community** → **estimates**

## Key Stores

| Store | Purpose |
|-------|---------|
| `useBudgetStore` | Weekly budget, category limits, onboarding |
| `useSettingsStore` | Display name, notification toggles |
| `useListStore` | Shopping lists & items |
| `useScanStore` | OCR draft state |
| `useSubscriptionStore` | Free / Pro tier (local mock) |

## Notifications

- **Native** — `expo-notifications` schedules local alerts for price drops & budget thresholds
- **Web** — In-app notification queue (`subscribeInAppNotifications`)
- Toggles in Settings → `refreshScheduledNotifications()` on save

## Platform Notes

- **Web** — SQLite may fail; `storageService.web.ts` uses AsyncStorage JSON
- **Native** — Full SQLite, camera, ML Kit OCR, push notifications
- Read Expo v56 docs before changing native modules: https://docs.expo.dev/versions/v56.0.0/
