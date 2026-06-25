import type { SubscriptionTier } from '@/src/store/useSubscriptionStore';

export type UpgradePromptPayload = {
  featureName: string;
  requiredTier?: Exclude<SubscriptionTier, 'free'>;
  onUpgrade: () => void;
};

type Listener = (payload: UpgradePromptPayload | null) => void;

const listeners = new Set<Listener>();

export function subscribeUpgradePrompt(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function openUpgradePrompt(payload: UpgradePromptPayload): void {
  listeners.forEach((listener) => listener(payload));
}

export function closeUpgradePrompt(): void {
  listeners.forEach((listener) => listener(null));
}
