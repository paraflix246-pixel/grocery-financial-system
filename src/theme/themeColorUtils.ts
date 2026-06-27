import type { AppThemeTokens } from '@/src/theme/appThemes';

function normalizeHex(hex: string): string {
  const raw = hex.replace('#', '');
  if (raw.length === 3) {
    return raw
      .split('')
      .map((c) => c + c)
      .join('');
  }
  return raw.slice(0, 6);
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const n = parseInt(normalizeHex(hex), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${[clamp(r), clamp(g), clamp(b)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/** Mix a hex color toward white (amount 0 = original, 1 = white). */
export function mixWithWhite(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  const mix = (c: number) => c + (255 - c) * amount;
  return rgbToHex(mix(r), mix(g), mix(b));
}

/** Darken a hex color (amount 0 = original, 1 = black). */
export function darken(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  const dark = (c: number) => c * (1 - amount);
  return rgbToHex(dark(r), dark(g), dark(b));
}

/** 8-digit hex with alpha (0–1). */
export function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  const a = Math.max(0, Math.min(255, Math.round(alpha * 255)))
    .toString(16)
    .padStart(2, '0');
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}${a}`;
}

/** Bold left-to-right gradient for scan / hero promo cards. */
export function getHeroGradient(theme: AppThemeTokens): [string, string, string] {
  return [darken(theme.primary, 0.35), theme.primary, mixWithWhite(theme.primary, 0.55)];
}

/** Soft diagonal gradient for featured quick-action / list promo cards. */
export function getPromoSurfaceGradient(theme: AppThemeTokens): [string, string, string] {
  return [
    mixWithWhite(theme.primary, 0.92),
    mixWithWhite(theme.primary, 0.84),
    mixWithWhite(theme.primary, 0.74),
  ];
}

export function getPromoBorder(theme: AppThemeTokens): string {
  return mixWithWhite(theme.primary, 0.55);
}

export function getPromoIconBorder(theme: AppThemeTokens): string {
  return mixWithWhite(theme.primary, 0.72);
}

export function getPromoGlowRing(theme: AppThemeTokens): string {
  return withAlpha(theme.primary, 0.18);
}

/** Body copy on primary-tinted promo / hero surfaces — always high-contrast neutral. */
export function getPromoBodyText(theme: AppThemeTokens): string {
  return theme.text;
}

/** Secondary copy on primary-tinted promo / hero surfaces. */
export function getPromoMutedText(theme: AppThemeTokens): string {
  return theme.textMuted;
}
