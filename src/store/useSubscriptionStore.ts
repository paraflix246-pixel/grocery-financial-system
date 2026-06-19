import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

export type SubscriptionTier = 'free' | 'pro';
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
  isPro: () => boolean;
};

async function persist(state: SubscriptionState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export const useSubscriptionStore = create<SubscriptionStore>((set, get) => ({
  ...DEFAULT_STATE,
  loaded: false,

  loadSubscription: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SubscriptionState;
        if (parsed.expiresAt && new Date(parsed.expiresAt) < new Date()) {
          await persist(DEFAULT_STATE);
          set({ ...DEFAULT_STATE, loaded: true });
          return;
        }
        set({ ...parsed, loaded: true });
        return;
      }
    } catch {
      // fall through to default
    }
    set({ ...DEFAULT_STATE, loaded: true });
  },

  upgradeToPro: async (plan) => {
    const expires = new Date();
    expires.setMonth(expires.getMonth() + (plan === 'yearly' ? 12 : 1));
    const next: SubscriptionState = {
      tier: 'pro',
      plan,
      expiresAt: expires.toISOString(),
      mockPurchaseToken: `mock_${Date.now()}`,
    };
    await persist(next);
    set({ ...next, loaded: true });
  },

  downgradeToFree: async () => {
    await persist(DEFAULT_STATE);
    set({ ...DEFAULT_STATE, loaded: true });
  },

  isPro: () => get().tier === 'pro',
}));
