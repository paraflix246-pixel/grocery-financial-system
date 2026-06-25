import { PRO_FEATURE_LABELS } from '@/src/constants/proPricing';
import { openUpgradePrompt } from '@/src/utils/upgradePromptController';

export function promptPantryLimitReached(onUpgrade: () => void): void {
  openUpgradePrompt({
    featureName: PRO_FEATURE_LABELS.pantry_unlimited,
    requiredTier: 'pro',
    onUpgrade,
  });
}

export function promptStoreLimitReached(onUpgrade: () => void): void {
  openUpgradePrompt({
    featureName: PRO_FEATURE_LABELS.community_pricing,
    requiredTier: 'pro',
    onUpgrade,
  });
}
