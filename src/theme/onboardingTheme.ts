import { getScreenBottomPadding } from '@/src/utils/safeAreaLayout';
import { SmartCartColors, SmartCartShadow } from '@/src/theme/smartCart';

/** Bottom clearance for onboarding CTAs — matches paywall / stack screens. */
export function getOnboardingBottomPadding(bottomInset: number): number {
  return getScreenBottomPadding(bottomInset, 16);
}

export const OnboardingColors = {
  background: '#FFFFFF',
  text: SmartCartColors.text,
  textMuted: SmartCartColors.textSecondary,
  textLight: SmartCartColors.textMuted,
  green: SmartCartColors.primary,
  greenDark: SmartCartColors.primaryDark,
  greenBorder: '#15803D',
  border: SmartCartColors.border,
  card: SmartCartColors.card,
};

/** Shared primary signup CTA — darker green, 52px+ tap target, subtle shadow. */
export const OnboardingPrimaryCta = {
  backgroundColor: SmartCartColors.primaryDark,
  borderRadius: 999,
  minHeight: 52,
  paddingVertical: 18,
  paddingHorizontal: 24,
  borderWidth: 2,
  borderColor: '#15803D',
  ...SmartCartShadow.fab,
} as const;

export const OnboardingPrimaryCtaText = {
  color: '#FFFFFF',
  fontSize: 18,
  fontWeight: '800' as const,
  letterSpacing: 0.2,
} as const;

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
