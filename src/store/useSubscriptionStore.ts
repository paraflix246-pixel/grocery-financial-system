import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import {
  isSubscriptionExpired,
  loadSubscriptionFromProvider,
  purchaseSubscription,
} from '@/src/services/subscriptionService';

export type SubscriptionTier = 'free' | 'pro' | 'household';
export type SubscriptionPlan = 'monthly' | 'yearly';

export type SubscriptionState = {
  tier: SubscriptionTier;
  plan: SubscriptionPlan | null;
  expiresAt: string | null;
  mockPurchaseToken: string | null;
};

const STORAGE_KEY = '@smartcart_subscription';

const DEFAULT_STATE: SubscriptionState = {
  tier: 'free',
  plan: null,
  expiresAt: null,
  mockPurchaseToken: null,
};

type SubscriptionStore = SubscriptionState & {
  loaded: boolean;
  loadSubscription: () => Promise<void>;
  upgradeToPro: (plan: SubscriptionPlan) => Promise<void>;
  upgradeToHousehold: (plan: SubscriptionPlan) => Promise<void>;
  downgradeToFree: () => Promise<void>;
  /** Pro or Household — unlocks Pro-tier features. */
  isPro: () => boolean;
  isHousehold: () => boolean;
};

async function persist(state: SubscriptionState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function normalizeTier(tier: string | undefined): SubscriptionTier {
  if (tier === 'pro' || tier === 'household') return tier;
  return 'free';
}

export const useSubscriptionStore = create<SubscriptionStore>((set, get) => ({
  ...DEFAULT_STATE,
  loaded: false,

  loadSubscription: async () => {
    try {
      const providerState = await loadSubscriptionFromProvider();
      if (providerState) {
        if (isSubscriptionExpired(providerState)) {
          await persist(DEFAULT_STATE);
          set({ ...DEFAULT_STATE, loaded: true });
          return;
        }
        await persist(providerState);
        set({ ...providerState, loaded: true });
        return;
      }

      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SubscriptionState;
        const tier = normalizeTier(parsed.tier);
        const state = { ...parsed, tier };
        if (isSubscriptionExpired(state)) {
          await persist(DEFAULT_STATE);
          set({ ...DEFAULT_STATE, loaded: true });
          return;
        }
        set({ ...state, loaded: true });
        return;
      }
    } catch {
      // fall through to default
    }
    set({ ...DEFAULT_STATE, loaded: true });
  },

  upgradeToPro: async (plan) => {
    const result = await purchaseSubscription(plan, 'pro');
    if (!result.success) {
      throw new Error(result.error ?? 'Purchase failed');
    }
    await persist(result.state);
    set({ ...result.state, loaded: true });
  },

  upgradeToHousehold: async (plan) => {
    const result = await purchaseSubscription(plan, 'household');
    if (!result.success) {
      throw new Error(result.error ?? 'Purchase failed');
    }
    await persist(result.state);
    set({ ...result.state, loaded: true });
  },

  downgradeToFree: async () => {
    await persist(DEFAULT_STATE);
    set({ ...DEFAULT_STATE, loaded: true });
  },

  isPro: () => {
    const tier = get().tier;
    return tier === 'pro' || tier === 'household';
  },

  isHousehold: () => get().tier === 'household',
}));
