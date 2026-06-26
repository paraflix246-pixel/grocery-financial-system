import type { SubscriptionPlan, SubscriptionState, SubscriptionTier } from '@/src/store/useSubscriptionStore';
import { Platform } from 'react-native';

import {
  fetchStripeConfigured,
  fetchStripeSubscriptionStatus,
  isStripeWebClientAvailable,
  mapStripeStatusToSubscriptionState,
  redirectToStripeCheckout,
} from '@/src/services/stripeSubscriptionService';
export type PurchaseResult = {
  success: boolean;
  state: SubscriptionState;
  error?: string;
};

const DEFAULT_STATE: SubscriptionState = {
  tier: 'free',
  plan: null,
  expiresAt: null,
  mockPurchaseToken: null,
  subscriptionSource: 'free',
  trialStartedAt: null,
};

const ENTITLEMENT_PRO = process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_PRO?.trim() || 'pro';
/** Legacy RevenueCat household entitlement — mapped to Pro tier for feature access. */
const ENTITLEMENT_HOUSEHOLD_LEGACY =
  process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_HOUSEHOLD?.trim() || 'household';
const OFFERING_ID = process.env.EXPO_PUBLIC_REVENUECAT_OFFERING?.trim() || 'default';

function revenueCatApiKey(): string | null {
  if (Platform.OS === 'ios') {
    return process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY?.trim() || null;
  }
  if (Platform.OS === 'android') {
    return process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY?.trim() || null;
  }
  return null;
}

/** True when RevenueCat public SDK keys are set for the current native platform. */
export function isRevenueCatConfigured(): boolean {
  return Platform.OS !== 'web' && revenueCatApiKey() != null;
}

/** When true, purchases use local mock tokens instead of the store. */
export function isSubscriptionMockMode(): boolean {
  if (Platform.OS === 'web' && isStripeWebClientAvailable()) {
    return process.env.EXPO_PUBLIC_STRIPE_USE_MOCK === 'true';
  }
  if (isRevenueCatConfigured()) {
    return process.env.EXPO_PUBLIC_REVENUECAT_USE_MOCK === 'true';
  }
  return typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';
}
/** @deprecated Use isSubscriptionMockMode() */
export const SUBSCRIPTION_DEV_MOCK = isSubscriptionMockMode();

type PurchasesModule = typeof import('react-native-purchases').default;
type CustomerInfo = import('react-native-purchases').CustomerInfo;
type PurchasesPackage = import('react-native-purchases').PurchasesPackage;
type PACKAGE_TYPE = typeof import('react-native-purchases').PACKAGE_TYPE;

let purchasesModule: PurchasesModule | null | undefined;
let configured = false;

function getPurchasesModule(): PurchasesModule | null {
  if (Platform.OS === 'web') return null;
  if (purchasesModule !== undefined) return purchasesModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    purchasesModule = require('react-native-purchases').default as PurchasesModule;
  } catch {
    purchasesModule = null;
  }
  return purchasesModule;
}

function getPackageTypeEnum(): PACKAGE_TYPE | null {
  if (Platform.OS === 'web') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-purchases').PACKAGE_TYPE as PACKAGE_TYPE;
  } catch {
    return null;
  }
}

function planFromProductId(productId: string): SubscriptionPlan {
  const id = productId.toLowerCase();
  if (id.includes('year') || id.includes('annual')) return 'yearly';
  return 'monthly';
}

function mapCustomerInfoToState(info: CustomerInfo): SubscriptionState | null {
  const legacyHouseholdEnt = info.entitlements.active[ENTITLEMENT_HOUSEHOLD_LEGACY];
  const proEnt = info.entitlements.active[ENTITLEMENT_PRO];
  const activeEnt =
    (proEnt?.isActive ? proEnt : null) ?? (legacyHouseholdEnt?.isActive ? legacyHouseholdEnt : null);

  if (activeEnt) {
    return {
      tier: 'pro',
      plan: planFromProductId(activeEnt.productIdentifier),
      expiresAt: activeEnt.expirationDate ?? null,
      mockPurchaseToken: null,
      subscriptionSource: 'paid',
      trialStartedAt: null,
    };
  }

  return null;
}

function buildMockPaidState(plan: SubscriptionPlan): SubscriptionState {
  const expires = new Date();
  expires.setMonth(expires.getMonth() + (plan === 'yearly' ? 12 : 1));
  return {
    tier: 'pro',
    plan,
    expiresAt: expires.toISOString(),
    mockPurchaseToken: `mock_pro_${Date.now()}`,
    subscriptionSource: 'mock',
    trialStartedAt: null,
  };
}

async function ensureRevenueCatConfigured(): Promise<PurchasesModule> {
  const Purchases = getPurchasesModule();
  const apiKey = revenueCatApiKey();
  if (!Purchases || !apiKey) {
    throw new Error('In-app purchases are not configured for this platform.');
  }

  if (!configured) {
    Purchases.configure({ apiKey });
    configured = true;
  }
  return Purchases;
}

async function findPackage(
  Purchases: PurchasesModule,
  plan: SubscriptionPlan
): Promise<PurchasesPackage> {
  const offerings = await Purchases.getOfferings();
  const offering = offerings.current ?? offerings.all[OFFERING_ID];
  if (!offering?.availablePackages.length) {
    throw new Error('No subscription products are available. Check RevenueCat offerings.');
  }

  const PACKAGE_TYPE = getPackageTypeEnum();
  const targetType = plan === 'yearly' ? PACKAGE_TYPE?.ANNUAL : PACKAGE_TYPE?.MONTHLY;

  const tierMatch = offering.availablePackages.find((pkg) => {
    const id = pkg.identifier.toLowerCase();
    const productId = pkg.product.identifier.toLowerCase();
    const matchesPro = id.includes('pro') || productId.includes('pro');
    if (!matchesPro) return false;
    return targetType == null || pkg.packageType === targetType;
  });
  if (tierMatch) return tierMatch;

  const planMatch = offering.availablePackages.find(
    (pkg) => targetType == null || pkg.packageType === targetType
  );
  if (planMatch) return planMatch;

  throw new Error(`No pro ${plan} package found in RevenueCat offering "${offering.identifier}".`);
}

/** Initialize RevenueCat on native when API keys are present. Safe to call multiple times. */
export async function initializeSubscriptionProvider(): Promise<void> {
  if (!isRevenueCatConfigured()) return;
  await ensureRevenueCatConfigured();
}

export async function loadSubscriptionFromProvider(): Promise<SubscriptionState | null> {
  if (Platform.OS === 'web' && isStripeWebClientAvailable() && !isSubscriptionMockMode()) {
    try {
      const status = await fetchStripeSubscriptionStatus();
      if (status?.configured) {
        return status.subscription ? mapStripeStatusToSubscriptionState(status) : null;
      }
    } catch (error) {
      console.warn('[subscription] Stripe load failed:', error);
    }
    return null;
  }

  if (!isRevenueCatConfigured()) return null;
  try {
    const Purchases = await ensureRevenueCatConfigured();
    const info = await Purchases.getCustomerInfo();
    return mapCustomerInfoToState(info);
  } catch (error) {
    console.warn('[subscription] RevenueCat load failed:', error);
    return null;
  }
}

export async function purchaseSubscription(plan: SubscriptionPlan): Promise<PurchaseResult> {
  if (isSubscriptionMockMode()) {
    const state = buildMockPaidState(plan);
    return { success: true, state };
  }

  if (Platform.OS === 'web' && isStripeWebClientAvailable()) {
    try {
      await redirectToStripeCheckout(plan);
      return {
        success: false,
        state: DEFAULT_STATE,
        error: 'Redirecting to Stripe checkout…',
      };
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Could not start Stripe checkout.';
      return { success: false, state: DEFAULT_STATE, error: message };
    }
  }

  if (!isRevenueCatConfigured()) {    return {
      success: false,
      state: DEFAULT_STATE,
      error:
        Platform.OS === 'web'
          ? 'Web billing is not configured. Set Stripe env vars on Vercel or use EXPO_PUBLIC_STRIPE_USE_MOCK=true for local testing.'
          : 'In-app purchases are not configured. Set EXPO_PUBLIC_REVENUECAT_IOS_API_KEY / EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY.',    };
  }

  try {
    const Purchases = await ensureRevenueCatConfigured();
    const pkg = await findPackage(Purchases, plan);
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const state = mapCustomerInfoToState(customerInfo);
    if (!state) {
      return {
        success: false,
        state: DEFAULT_STATE,
        error: 'Purchase completed but no active entitlement was found. Check RevenueCat entitlements.',
      };
    }
    return { success: true, state };
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : 'Purchase failed. Please try again.';
    if (/user cancelled|purchase cancelled/i.test(message)) {
      return { success: false, state: DEFAULT_STATE, error: 'Purchase cancelled.' };
    }
    return { success: false, state: DEFAULT_STATE, error: message };
  }
}

export async function restoreSubscriptionPurchases(): Promise<PurchaseResult> {
  if (isSubscriptionMockMode()) {
    return { success: true, state: DEFAULT_STATE };
  }

  if (!isRevenueCatConfigured()) {
    return {
      success: false,
      state: DEFAULT_STATE,
      error: 'Restore purchases is not configured for this platform.',
    };
  }

  try {
    const Purchases = await ensureRevenueCatConfigured();
    const info = await Purchases.restorePurchases();
    const state = mapCustomerInfoToState(info);
    if (!state) {
      return {
        success: false,
        state: DEFAULT_STATE,
        error: 'No active subscription found for this account.',
      };
    }
    return { success: true, state };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not restore purchases.';
    return { success: false, state: DEFAULT_STATE, error: message };
  }
}

export function isSubscriptionExpired(state: SubscriptionState): boolean {
  return Boolean(state.expiresAt && new Date(state.expiresAt) < new Date());
}

export function getSubscriptionBillingMode(): 'revenuecat' | 'stripe' | 'mock' | 'unconfigured' {
  if (Platform.OS === 'web') {
    if (isStripeWebClientAvailable() && !isSubscriptionMockMode()) return 'stripe';
    if (isSubscriptionMockMode()) return 'mock';
    return 'unconfigured';
  }
  if (isRevenueCatConfigured() && !isSubscriptionMockMode()) return 'revenuecat';
  if (isSubscriptionMockMode()) return 'mock';
  return 'unconfigured';
}

/** Web-only: probe whether Stripe API routes are configured (no auth required). */
export async function probeStripeWebConfigured(): Promise<boolean> {
  if (Platform.OS !== 'web' || !isStripeWebClientAvailable()) return false;
  return fetchStripeConfigured();
}