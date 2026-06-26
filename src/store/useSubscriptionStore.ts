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
  downgradeToFree: () => Promise<void>;
  /** Pro or legacy Household — unlocks paid features. */
  isPro: () => boolean;
};

async function persist(state: SubscriptionState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/** Map legacy household tier to pro for storage and feature access. */
function normalizeTier(tier: string | undefined): SubscriptionTier {
  if (tier === 'household' || tier === 'pro') return 'pro';
  return 'free';
}

function normalizeState(state: SubscriptionState): SubscriptionState {
  return { ...state, tier: normalizeTier(state.tier) };
}

export const useSubscriptionStore = create<SubscriptionStore>((set, get) => ({
  ...DEFAULT_STATE,
  loaded: false,

  loadSubscription: async () => {
    try {
      const providerState = await loadSubscriptionFromProvider();
      if (providerState) {
        const normalized = normalizeState(providerState);
        if (isSubscriptionExpired(normalized)) {
          await persist(DEFAULT_STATE);
          set({ ...DEFAULT_STATE, loaded: true });
          return;
        }
        await persist(normalized);
        set({ ...normalized, loaded: true });
        return;
      }

      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SubscriptionState;
        const state = normalizeState(parsed);
        if (isSubscriptionExpired(state)) {
          await persist(DEFAULT_STATE);
          set({ ...DEFAULT_STATE, loaded: true });
          return;
        }
        if (state.tier !== parsed.tier) {
          await persist(state);
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
    const result = await purchaseSubscription(plan);
    if (!result.success) {
      throw new Error(result.error ?? 'Purchase failed');
    }
    const normalized = normalizeState(result.state);
    await persist(normalized);
    set({ ...normalized, loaded: true });
  },

  downgradeToFree: async () => {
    await persist(DEFAULT_STATE);
    set({ ...DEFAULT_STATE, loaded: true });
  },

  isPro: () => {
    const tier = get().tier;
    return tier === 'pro' || tier === 'household';
  },
}));
