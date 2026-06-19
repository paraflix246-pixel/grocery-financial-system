import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import type { BudgetSettings } from '@/src/models/types';
import { getBudgetSettings, updateBudgetSettings } from '@/src/services/storageService';

const ONBOARDING_KEY = 'grocery_onboarding_complete';

type BudgetStore = {
  settings: BudgetSettings | null;
  onboardingComplete: boolean;
  loading: boolean;
  loadSettings: () => Promise<void>;
  saveSettings: (weeklyBudget: number, alertThreshold: number) => Promise<void>;
  checkOnboarding: () => Promise<boolean>;
  completeOnboarding: () => Promise<void>;
};

export const useBudgetStore = create<BudgetStore>((set) => ({
  settings: null,
  onboardingComplete: true,
  loading: false,

  loadSettings: async () => {
    set({ loading: true });
    const settings = await getBudgetSettings();
    set({ settings, loading: false });
  },

  saveSettings: async (weeklyBudget, alertThreshold) => {
    const settings = await updateBudgetSettings(weeklyBudget, alertThreshold);
    set({ settings });
  },

  checkOnboarding: async () => {
    const value = await AsyncStorage.getItem(ONBOARDING_KEY);
    const complete = value === 'true';
    set({ onboardingComplete: complete });
    return complete;
  },

  completeOnboarding: async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    set({ onboardingComplete: true });
  },
}));
