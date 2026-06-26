/**
 * Pro preset themes — names documented for product copy and settings UI.
 *
 * - Penny Green: default brand (white + #22C55E green)
 * - Midnight Slate: dark navy + teal accent — premium feel
 * - Sunrise Coral: warm cream + coral accent
 * - Ocean Blue: cool white + deep blue
 * - Lavender Pro: soft purple + violet accent
 */

export type AppThemeId =
  | 'penny_green'
  | 'midnight_slate'
  | 'sunrise_coral'
  | 'ocean_blue'
  | 'lavender_pro';

export type AppThemeTokens = {
  id: AppThemeId;
  /** i18n key under themes.* */
  nameKey: string;
  descriptionKey: string;
  background: string;
  surface: string;
  primary: string;
  primaryText: string;
  text: string;
  textMuted: string;
  border: string;
  headerBg: string;
  /** Swatch preview colors for theme picker */
  swatch: [string, string];
};

export const DEFAULT_THEME_ID: AppThemeId = 'penny_green';

export const APP_THEMES: Record<AppThemeId, AppThemeTokens> = {
  penny_green: {
    id: 'penny_green',
    nameKey: 'themes.pennyGreen.name',
    descriptionKey: 'themes.pennyGreen.description',
    background: '#F5F5F7',
    surface: '#FFFFFF',
    primary: '#22C55E',
    primaryText: '#FFFFFF',
    text: '#1A1A1A',
    textMuted: '#9CA3AF',
    border: '#E5E7EB',
    headerBg: '#F5F5F7',
    swatch: ['#FFFFFF', '#22C55E'],
  },
  midnight_slate: {
    id: 'midnight_slate',
    nameKey: 'themes.midnightSlate.name',
    descriptionKey: 'themes.midnightSlate.description',
    background: '#0F172A',
    surface: '#1E293B',
    primary: '#14B8A6',
    primaryText: '#FFFFFF',
    text: '#F1F5F9',
    textMuted: '#94A3B8',
    border: '#334155',
    headerBg: '#0F172A',
    swatch: ['#1E293B', '#14B8A6'],
  },
  sunrise_coral: {
    id: 'sunrise_coral',
    nameKey: 'themes.sunriseCoral.name',
    descriptionKey: 'themes.sunriseCoral.description',
    background: '#FFFBF5',
    surface: '#FFFFFF',
    primary: '#F97316',
    primaryText: '#FFFFFF',
    text: '#292524',
    textMuted: '#A8A29E',
    border: '#FED7AA',
    headerBg: '#FFFBF5',
    swatch: ['#FFF7ED', '#F97316'],
  },
  ocean_blue: {
    id: 'ocean_blue',
    nameKey: 'themes.oceanBlue.name',
    descriptionKey: 'themes.oceanBlue.description',
    background: '#F0F9FF',
    surface: '#FFFFFF',
    primary: '#1D4ED8',
    primaryText: '#FFFFFF',
    text: '#0F172A',
    textMuted: '#64748B',
    border: '#BAE6FD',
    headerBg: '#F0F9FF',
    swatch: ['#FFFFFF', '#1D4ED8'],
  },
  lavender_pro: {
    id: 'lavender_pro',
    nameKey: 'themes.lavenderPro.name',
    descriptionKey: 'themes.lavenderPro.description',
    background: '#FAF5FF',
    surface: '#FFFFFF',
    primary: '#7C3AED',
    primaryText: '#FFFFFF',
    text: '#1E1B4B',
    textMuted: '#A78BFA',
    border: '#E9D5FF',
    headerBg: '#FAF5FF',
    swatch: ['#FFFFFF', '#7C3AED'],
  },
};

export const APP_THEME_LIST: AppThemeTokens[] = Object.values(APP_THEMES);

export function getAppTheme(id: AppThemeId): AppThemeTokens {
  return APP_THEMES[id] ?? APP_THEMES[DEFAULT_THEME_ID];
}

export function isValidThemeId(value: string): value is AppThemeId {
  return value in APP_THEMES;
}
