/**
 * Lightweight emoji-based avatar presets for Pro personalization.
 */

export type AppAvatarId =
  | 'cart'
  | 'penny_pig'
  | 'produce'
  | 'carrot'
  | 'apple'
  | 'basket'
  | 'receipt'
  | 'savings';

export type AppAvatarPreset = {
  id: AppAvatarId;
  emoji: string;
  /** i18n key under avatars.* */
  nameKey: string;
  background: string;
  ring: string;
};

export const DEFAULT_AVATAR_ID: AppAvatarId = 'cart';

export const APP_AVATARS: Record<AppAvatarId, AppAvatarPreset> = {
  cart: {
    id: 'cart',
    emoji: '🛒',
    nameKey: 'avatars.cart.name',
    background: '#DCFCE7',
    ring: '#22C55E',
  },
  penny_pig: {
    id: 'penny_pig',
    emoji: '🐷',
    nameKey: 'avatars.pennyPig.name',
    background: '#FCE7F3',
    ring: '#EC4899',
  },
  produce: {
    id: 'produce',
    emoji: '🥬',
    nameKey: 'avatars.produce.name',
    background: '#D1FAE5',
    ring: '#10B981',
  },
  carrot: {
    id: 'carrot',
    emoji: '🥕',
    nameKey: 'avatars.carrot.name',
    background: '#FFEDD5',
    ring: '#F97316',
  },
  apple: {
    id: 'apple',
    emoji: '🍎',
    nameKey: 'avatars.apple.name',
    background: '#FEE2E2',
    ring: '#DC2626',
  },
  basket: {
    id: 'basket',
    emoji: '🧺',
    nameKey: 'avatars.basket.name',
    background: '#FEF3C7',
    ring: '#D97706',
  },
  receipt: {
    id: 'receipt',
    emoji: '🧾',
    nameKey: 'avatars.receipt.name',
    background: '#E0E7FF',
    ring: '#6366F1',
  },
  savings: {
    id: 'savings',
    emoji: '💰',
    nameKey: 'avatars.savings.name',
    background: '#FEF9C3',
    ring: '#CA8A04',
  },
};

export const APP_AVATAR_LIST: AppAvatarPreset[] = Object.values(APP_AVATARS);

export function getAppAvatar(id: AppAvatarId): AppAvatarPreset {
  return APP_AVATARS[id] ?? APP_AVATARS[DEFAULT_AVATAR_ID];
}

export function isValidAvatarId(value: string): value is AppAvatarId {
  return value in APP_AVATARS;
}
