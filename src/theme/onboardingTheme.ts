import { SmartCartColors } from '@/src/theme/smartCart';

export const OnboardingColors = {
  background: '#FFFFFF',
  text: SmartCartColors.text,
  textMuted: SmartCartColors.textSecondary,
  textLight: SmartCartColors.textMuted,
  green: SmartCartColors.primary,
  border: SmartCartColors.border,
  card: SmartCartColors.card,
};

export type OnboardingSlideAccent = {
  iconBg: string;
  iconTint: string;
};

export const OnboardingSlideAccents = {
  green: {
    iconBg: '#F0FDF4',
    iconTint: SmartCartColors.primaryDark,
  },
  yellow: {
    iconBg: '#FFFBEB',
    iconTint: '#D97706',
  },
  purple: {
    iconBg: '#F5F3FF',
    iconTint: '#7C3AED',
  },
} satisfies Record<string, OnboardingSlideAccent>;
