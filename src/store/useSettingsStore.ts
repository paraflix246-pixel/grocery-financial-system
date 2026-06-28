import { create } from 'zustand';

import type { AppSettings } from '@/src/models/types';
import { getAppSettings, updateAppSettings } from '@/src/services/storageService';

type SettingsStore = {
  settings: AppSettings | null;
  loading: boolean;
  loaded: boolean;
  loadSettings: (options?: { force?: boolean }) => Promise<void>;
  saveSettings: (partial: Partial<Omit<AppSettings, 'id' | 'updatedAt'>>) => Promise<void>;
};

let loadSettingsInFlight: Promise<void> | null = null;

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: null,
  loading: false,
  loaded: false,

  loadSettings: async (options) => {
    const force = options?.force ?? false;
    if (!force && get().loaded && get().settings) {
      return;
    }
    if (loadSettingsInFlight) {
      return loadSettingsInFlight;
    }

    loadSettingsInFlight = (async () => {
      if (!get().loaded) {
        set({ loading: true });
      }
      const settings = await getAppSettings();
      set({ settings, loading: false, loaded: true });
    })().finally(() => {
      loadSettingsInFlight = null;
    });

    return loadSettingsInFlight;
  },

  saveSettings: async (partial) => {
    const settings = await updateAppSettings(partial);
    set({ settings });
  },
}));
