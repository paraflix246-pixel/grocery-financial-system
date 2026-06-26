import { Alert, Platform } from 'react-native';

import { PRO_UPGRADE_HOOK } from '@/src/constants/proPricing';
import type { SubscriptionTier } from '@/src/store/useSubscriptionStore';
import { openUpgradePrompt } from '@/src/utils/upgradePromptController';

type PromptUpgradeOptions = {
  featureName: string;
  requiredTier?: Exclude<SubscriptionTier, 'free'>;
  onUpgrade: () => void;
};

export function promptUpgrade({
  featureName,
  requiredTier = 'pro',
  onUpgrade,
}: PromptUpgradeOptions): void {
  openUpgradePrompt({ featureName, requiredTier, onUpgrade });
}

/** Fallback when no UpgradePromptProvider is mounted (e.g. tests). */
export function promptUpgradeFallback({
  featureName,
  requiredTier = 'pro',
  onUpgrade,
}: PromptUpgradeOptions): void {
  const planName = 'Pro';
  const title = `Upgrade to ${planName}`;
  const message = `${featureName} is included with ${planName}. ${PRO_UPGRADE_HOOK}`;

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) {
      onUpgrade();
    }
    return;
  }

  Alert.alert(title, message, [
    { text: 'Not now', style: 'cancel' },
    { text: 'View plans', onPress: onUpgrade },
  ]);
}
