import type { TextStyle } from 'react-native';

import type { AppFontId } from '@/src/theme/appFonts';
import { APP_THEME_LIST, type AppThemeId, type AppThemeTokens } from '@/src/theme/appThemes';
import { hexToRgb } from '@/src/theme/themeColorUtils';

/** Fonts that render thin on tinted or dark surfaces at regular weight. */
const THIN_ON_SURFACE_FONTS: ReadonlySet<AppFontId> = new Set([
  'inter',
  'lora',
  'space_mono',
]);

/** Optional pairing hints — readability is never blocked by these. */
export const FONT_THEME_HINTS: Partial<Record<AppFontId, AppThemeId[]>> = {
  lora: ['sunrise_coral', 'ruby_red'],
  space_mono: ['midnight_slate', 'ocean_blue'],
  nunito: ['penny_green', 'sunrise_coral'],
  poppins: ['ruby_red', 'lavender_pro'],
  inter: ['ocean_blue', 'midnight_slate'],
};

export function isDarkTheme(theme: AppThemeTokens): boolean {
  const { r, g, b } = hexToRgb(theme.background);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.45;
}

/** Legacy SmartCartColors defaults frozen in StyleSheets at module load. */
const LEGACY_TEXT_COLORS = new Set(
  ['#1A1A1A', '#111827', '#0F172A', '#1C1917', '#1E1B4B', '#292524', '#F1F5F9', '#F8FAFC'].map((c) =>
    c.toUpperCase()
  )
);
const LEGACY_MUTED_COLORS = new Set(
  [
    '#6B7280',
    '#9CA3AF',
    '#64748B',
    '#94A3B8',
    '#A8A29E',
    '#A78BFA',
    '#78716C',
    '#57534E',
    '#4B5563',
    '#CBD5E1',
  ].map((c) => c.toUpperCase())
);

function normalizeColorKey(color: string): string {
  return color.toUpperCase();
}

/**
 * If a style color matches any theme token from another preset, remap to the
 * active theme's equivalent (text or textMuted). Intentional accent colors pass through.
 */
export function remapThemeTextColor(
  color: string | undefined,
  theme: AppThemeTokens,
  fallback: 'text' | 'textMuted' = 'text'
): string {
  if (!color) return theme[fallback];
  for (const preset of APP_THEME_LIST) {
    if (preset.text === color) return theme.text;
    if (preset.textMuted === color) return theme.textMuted;
  }
  if (LEGACY_TEXT_COLORS.has(normalizeColorKey(color))) {
    return theme.text;
  }
  if (LEGACY_MUTED_COLORS.has(normalizeColorKey(color))) {
    return theme.textMuted;
  }
  return color;
}

/** Remap a frozen StyleSheet background/surface color to the active theme. */
export function remapThemeSurfaceColor(
  color: string | undefined,
  theme: AppThemeTokens,
  fallback: 'background' | 'surface' | 'surfaceElevated' = 'background'
): string | undefined {
  if (!color) return theme[fallback];
  for (const preset of APP_THEME_LIST) {
    if (preset.background === color) return theme.background;
    if (preset.surface === color) return theme.surface;
    if (preset.surfaceElevated === color) return theme.surfaceElevated;
    if (preset.border === color) return theme.border;
  }
  return color;
}

/** Slight weight bump so thin custom fonts stay legible on dark or tinted backgrounds. */
export function getFontReadabilityStyle(
  fontId: AppFontId | undefined,
  theme: AppThemeTokens | undefined
): TextStyle {
  if (!fontId || fontId === 'system' || fontId === 'poppins' || fontId === 'nunito') {
    return {};
  }

  const dark = theme ? isDarkTheme(theme) : false;
  const needsBoost = THIN_ON_SURFACE_FONTS.has(fontId);

  if (!needsBoost) return {};

  if (fontId === 'space_mono') {
    return { fontWeight: dark ? '600' : '500' };
  }

  if (dark) {
    return { fontWeight: '500' };
  }

  return {};
}

export function fontPairsWithTheme(fontId: AppFontId, themeId: AppThemeId): boolean {
  const hints = FONT_THEME_HINTS[fontId];
  return hints ? hints.includes(themeId) : true;
}
