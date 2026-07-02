import type { SubscriptionTier } from '@/src/store/useSubscriptionStore';

export type ProUpgradeBannerInput = {
  isAdmin: boolean;
  scopePro: boolean;
  tier?: SubscriptionTier;
  /** DEV-only explicit toggle to preview free-tier banners. */
  forceFreePreview?: boolean;
};

/** Pure Pro upgrade banner visibility — guests, free, and non-Pro signed-in users. */
export function shouldShowProUpgradeBanner(input: ProUpgradeBannerInput): boolean {
  const isDev = typeof __DEV__ !== 'undefined' && __DEV__;
  const tier = input.tier ?? 'free';
  /** DEV toggle — preview monetization while admin still has Pro/trial. */
  const devForceFreePreview = Boolean(isDev && input.forceFreePreview);
  /** Admin on free tier always sees banner to validate free-user monetization. */
  const adminFreeTierPreview = input.isAdmin && tier === 'free';

  if (devForceFreePreview || adminFreeTierPreview) {
    return true;
  }

  if (input.isAdmin) return false;
  return !input.scopePro;
}
