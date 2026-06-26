import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import {
  isSubscriptionExpired,
  isSubscriptionMockMode,
  loadSubscriptionFromProvider,
  purchaseSubscription,
} from '@/src/services/subscriptionService';
import {
  clearTrial,
  getTrialStatus,
  startProTrial as persistTrialStart,
} from '@/src/services/trialService';

export type SubscriptionTier = 'free' | 'pro' | 'household';
export type SubscriptionPlan = 'monthly' | 'yearly';
export type SubscriptionSource = 'free' | 'paid' | 'mock' | 'trial';

export type SubscriptionState = {
  tier: SubscriptionTier;
  plan: SubscriptionPlan | null;
  expiresAt: string | null;
  mockPurchaseToken: string | null;
  subscriptionSource: SubscriptionSource;
  trialStartedAt: string | null;
};

const STORAGE_KEY = '@smartcart_subscription';

const DEFAULT_STATE: SubscriptionState = {
  tier: 'free',
  plan: null,
  expiresAt: null,
  mockPurchaseToken: null,
  subscriptionSource: 'free',
  trialStartedAt: null,
};

type SubscriptionStore = SubscriptionState & {
  loaded: boolean;
  loadSubscription: () => Promise<void>;
  startProTrial: () => Promise<void>;
  upgradeToPro: (plan: SubscriptionPlan) => Promise<void>;
  downgradeToFree: () => Promise<void>;
  /** Pro, legacy Household, or active trial — unlocks paid features. */
  isPro: () => boolean;
  getEffectiveTier: () => SubscriptionTier;
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
  const tier = normalizeTier(state.tier);
  const subscriptionSource =
    state.subscriptionSource ??
    (tier === 'free' ? 'free' : state.mockPurchaseToken ? 'mock' : 'paid');
  return {
    ...state,
    tier,
    subscriptionSource,
    trialStartedAt: state.trialStartedAt ?? null,
  };
}

function paidProState(state: SubscriptionState): SubscriptionState {
  const source: SubscriptionSource = state.mockPurchaseToken ? 'mock' : 'paid';
  return {
    ...state,
    tier: 'pro',
    subscriptionSource: source,
    trialStartedAt: null,
  };
}

async function applyTrialIfEligible(
  state: SubscriptionState
): Promise<SubscriptionState> {
  if (state.tier === 'pro' && state.subscriptionSource !== 'trial') {
    return paidProState(state);
  }

  const trial = await getTrialStatus();
  if (trial.active) {
    return {
      ...DEFAULT_STATE,
      tier: 'pro',
      subscriptionSource: 'trial',
      trialStartedAt: trial.startedAt,
    };
  }

  if (trial.expired) {
    await clearTrial();
  }

  return { ...DEFAULT_STATE };
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
          await clearTrial();
          await persist(DEFAULT_STATE);
          set({ ...DEFAULT_STATE, loaded: true });
          return;
        }
        await clearTrial();
        const paid = paidProState(normalized);
        await persist(paid);
        set({ ...paid, loaded: true });
        return;
      }

      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SubscriptionState;
        let state = normalizeState(parsed);
        if (isSubscriptionExpired(state) && state.subscriptionSource !== 'trial') {
          await clearTrial();
          await persist(DEFAULT_STATE);
          set({ ...DEFAULT_STATE, loaded: true });
          return;
        }
        if (state.tier === 'pro' && state.subscriptionSource !== 'trial') {
          state = paidProState(state);
        } else {
          state = await applyTrialIfEligible(state);
        }
        if (JSON.stringify(state) !== raw) {
          await persist(state);
        }
        set({ ...state, loaded: true });
        return;
      }

      const trialState = await applyTrialIfEligible(DEFAULT_STATE);
      if (trialState.tier !== 'free') {
        await persist(trialState);
      }
      set({ ...trialState, loaded: true });
      return;
    } catch {
      // fall through to default
    }
    set({ ...DEFAULT_STATE, loaded: true });
  },

  startProTrial: async () => {
    const trial = await persistTrialStart();
    const state: SubscriptionState = {
      tier: 'pro',
      plan: null,
      expiresAt: null,
      mockPurchaseToken: null,
      subscriptionSource: 'trial',
      trialStartedAt: trial.startedAt,
    };
    await persist(state);
    set({ ...state, loaded: true });
  },

  upgradeToPro: async (plan) => {
    const result = await purchaseSubscription(plan);
    if (!result.success) {
      throw new Error(result.error ?? 'Purchase failed');
    }
    await clearTrial();
    const normalized = paidProState(normalizeState(result.state));
    await persist(normalized);
    set({ ...normalized, loaded: true });
  },

  downgradeToFree: async () => {
    await clearTrial();
    await persist(DEFAULT_STATE);
    set({ ...DEFAULT_STATE, loaded: true });
  },

  isPro: () => {
    const { tier, subscriptionSource } = get();
    return tier === 'pro' || tier === 'household' || subscriptionSource === 'trial';
  },

  getEffectiveTier: () => {
    return get().isPro() ? 'pro' : 'free';
  },
}));

export function effectiveSubscriptionTierFromStore(): 'free' | 'pro' {
  return useSubscriptionStore.getState().getEffectiveTier() === 'pro' ? 'pro' : 'free';
}
