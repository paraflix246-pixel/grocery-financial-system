import { create } from 'zustand';

import type { AppSettings } from '@/src/models/types';
import { getAppSettings, updateAppSettings } from '@/src/services/storageService';

type SettingsStore = {
  settings: AppSettings | null;
  loading: boolean;
  loadSettings: () => Promise<void>;
  saveSettings: (partial: Partial<Omit<AppSettings, 'id' | 'updatedAt'>>) => Promise<void>;
};

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: null,
  loading: false,

  loadSettings: async () => {
    set({ loading: true });
    const settings = await getAppSettings();
    set({ settings, loading: false });
  },

  saveSettings: async (partial) => {
    const settings = await updateAppSettings(partial);
    set({ settings });
  },
}));
