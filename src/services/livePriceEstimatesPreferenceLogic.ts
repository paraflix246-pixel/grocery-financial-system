import type { AppSettings } from '@/src/models/types';

export const DEFAULT_LIVE_PRICE_ESTIMATES_ENABLED = true;

export type LivePriceEstimatesPrefs = Pick<AppSettings, 'showLivePriceEstimates'>;

export function normalizeLivePriceEstimatesPrefs(
  partial?: Partial<LivePriceEstimatesPrefs> | null
): LivePriceEstimatesPrefs {
  return {
    showLivePriceEstimates:
      partial?.showLivePriceEstimates ?? DEFAULT_LIVE_PRICE_ESTIMATES_ENABLED,
  };
}

export function isLivePriceEstimatesEnabled(
  settings: Partial<LivePriceEstimatesPrefs> | null | undefined
): boolean {
  return normalizeLivePriceEstimatesPrefs(settings).showLivePriceEstimates;
}

export function applyLivePriceEstimatesDefaultsToAppSettings(settings: AppSettings): AppSettings {
  return {
    ...settings,
    ...normalizeLivePriceEstimatesPrefs(settings),
  };
}
