import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import type { BudgetSettings, CategoryLimits } from '@/src/models/types';
import { syncUserProfile } from '@/src/services/admin/adminApiService';
import { getSession, waitForAuthReady } from '@/src/services/authService';
import { getBudgetSettings, updateBudgetSettings } from '@/src/services/storageService';
const ONBOARDING_KEY = 'grocery_onboarding_complete';

type BudgetStore = {
  settings: BudgetSettings | null;
  onboardingComplete: boolean;
  onboardingReady: boolean;
  loading: boolean;
  loadSettings: () => Promise<void>;
  saveSettings: (weeklyBudget: number, alertThreshold: number, categoryLimits?: CategoryLimits) => Promise<void>;
  checkOnboarding: () => Promise<boolean>;
  completeOnboarding: () => Promise<void>;
  resolveOnboardingState: () => Promise<boolean>;
};

function buildBudgetSettings(
  weeklyBudget: number,
  alertThreshold: number,
  categoryLimits?: CategoryLimits,
  previous?: BudgetSettings | null
): BudgetSettings {
  return {
    id: previous?.id ?? 'local',
    weeklyBudget,
    alertThreshold,
    categoryLimits: categoryLimits ?? previous?.categoryLimits,
    updatedAt: new Date().toISOString(),
  };
}

export const useBudgetStore = create<BudgetStore>((set, get) => ({
  settings: null,
  onboardingComplete: false,
  onboardingReady: false,
  loading: false,

  loadSettings: async () => {
    set({ loading: true });
    const settings = await getBudgetSettings();
    set({ settings, loading: false });
  },

  saveSettings: async (weeklyBudget, alertThreshold, categoryLimits) => {
    const optimistic = buildBudgetSettings(
      weeklyBudget,
      alertThreshold,
      categoryLimits,
      get().settings
    );
    set({ settings: optimistic });
    try {
      const settings = await updateBudgetSettings(weeklyBudget, alertThreshold, categoryLimits);
      set({ settings });
    } catch (error) {
      const settings = await getBudgetSettings();
      set({ settings });
      throw error;
    }
  },

  checkOnboarding: async () => {
    const value = await AsyncStorage.getItem(ONBOARDING_KEY);
    const complete = value === 'true';
    set({ onboardingComplete: complete, onboardingReady: true });
    return complete;
  },

  completeOnboarding: async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    set({ onboardingComplete: true, onboardingReady: true });
  },

  resolveOnboardingState: async () => {
    await waitForAuthReady();
    const session = await getSession();
    if (session) {
      const profile = await syncUserProfile({ force: true });
      if (profile?.onboarding_completed_at) {
        await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
        set({ onboardingComplete: true, onboardingReady: true });
        return true;
      }
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      set({ onboardingComplete: true, onboardingReady: true });
      return true;
    }
    const value = await AsyncStorage.getItem(ONBOARDING_KEY);
    const complete = value === 'true';
    set({ onboardingComplete: complete, onboardingReady: true });
    return complete;
  },
}));
