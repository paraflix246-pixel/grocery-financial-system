import { UNLIMITED_SCANNING_LABEL } from '@/src/constants/proPricing';
import { openUpgradePrompt } from '@/src/utils/upgradePromptController';

export function promptScanLimitReached(onUpgrade: () => void): void {
  openUpgradePrompt({
    featureName: UNLIMITED_SCANNING_LABEL,
    requiredTier: 'pro',
    onUpgrade,
  });
}
