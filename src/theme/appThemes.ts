/**
 * Pro preset themes — names documented for product copy and settings UI.
 *
 * - Penny Green: default brand (white + #22C55E green)
 * - Midnight Slate: dark navy + teal accent — premium feel
 * - Sunrise Coral: warm cream + coral accent
 * - Ocean Blue: cool white + deep blue
 * - Lavender Pro: soft purple + violet accent
 * - Ruby Red: cream white + bold red accent — premium feel
 */

export type AppThemeId =
  | 'penny_green'
  | 'midnight_slate'
  | 'sunrise_coral'
  | 'ocean_blue'
  | 'lavender_pro'
  | 'ruby_red';

export type AppThemeTokens = {
  id: AppThemeId;
  /** i18n key under themes.* */
  nameKey: string;
  descriptionKey: string;
  /** Base screen background — subtle primary tint on premium themes */
  background: string;
  /** Semi-transparent primary wash at top of screen */
  backgroundGradientTop: string;
  /** Card / list row surfaces */
  surface: string;
  /** Modals and elevated cards with a slight theme tint */
  surfaceElevated: string;
  primary: string;
  primaryText: string;
  text: string;
  textMuted: string;
  border: string;
  headerBg: string;
  /** Optional top bar gradient [start, end] */
  headerGradient: [string, string];
  /** rgba for corner highlight glows */
  accentGlow: string;
  /** Stronger corner glow + tinted surfaces (Pro themes) */
  isPremium: boolean;
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
    backgroundGradientTop: 'rgba(34, 197, 94, 0.06)',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    primary: '#22C55E',
    primaryText: '#FFFFFF',
    text: '#1A1A1A',
    textMuted: '#6B7280',
    border: '#E5E7EB',
    headerBg: '#F5F5F7',
    headerGradient: ['#F5F5F7', '#F0FDF4'],
    accentGlow: 'rgba(34, 197, 94, 0.10)',
    isPremium: false,
    swatch: ['#FFFFFF', '#22C55E'],
  },
  midnight_slate: {
    id: 'midnight_slate',
    nameKey: 'themes.midnightSlate.name',
    descriptionKey: 'themes.midnightSlate.description',
    background: '#0F172A',
    backgroundGradientTop: 'rgba(20, 184, 166, 0.20)',
    surface: '#1E293B',
    surfaceElevated: '#273549',
    primary: '#14B8A6',
    primaryText: '#FFFFFF',
    text: '#F1F5F9',
    textMuted: '#CBD5E1',
    border: '#334155',
    headerBg: '#0F172A',
    headerGradient: ['#0F172A', '#134E4A'],
    accentGlow: 'rgba(20, 184, 166, 0.38)',
    isPremium: true,
    swatch: ['#1E293B', '#14B8A6'],
  },
  sunrise_coral: {
    id: 'sunrise_coral',
    nameKey: 'themes.sunriseCoral.name',
    descriptionKey: 'themes.sunriseCoral.description',
    background: '#FFF7ED',
    backgroundGradientTop: 'rgba(249, 115, 22, 0.16)',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFBF5',
    primary: '#F97316',
    primaryText: '#FFFFFF',
    text: '#1A1A1A',
    textMuted: '#78716C',
    border: '#FED7AA',
    headerBg: '#FFF7ED',
    headerGradient: ['#FFF7ED', '#FFEDD5'],
    accentGlow: 'rgba(249, 115, 22, 0.24)',
    isPremium: true,
    swatch: ['#FFF7ED', '#F97316'],
  },
  ocean_blue: {
    id: 'ocean_blue',
    nameKey: 'themes.oceanBlue.name',
    descriptionKey: 'themes.oceanBlue.description',
    background: '#EFF6FF',
    backgroundGradientTop: 'rgba(29, 78, 216, 0.14)',
    surface: '#FFFFFF',
    surfaceElevated: '#F0F9FF',
    primary: '#1D4ED8',
    primaryText: '#FFFFFF',
    text: '#111827',
    textMuted: '#4B5563',
    border: '#BAE6FD',
    headerBg: '#EFF6FF',
    headerGradient: ['#EFF6FF', '#DBEAFE'],
    accentGlow: 'rgba(29, 78, 216, 0.22)',
    isPremium: true,
    swatch: ['#FFFFFF', '#1D4ED8'],
  },
  lavender_pro: {
    id: 'lavender_pro',
    nameKey: 'themes.lavenderPro.name',
    descriptionKey: 'themes.lavenderPro.description',
    background: '#F5F0FF',
    backgroundGradientTop: 'rgba(124, 58, 237, 0.18)',
    surface: '#FFFFFF',
    surfaceElevated: '#FAF5FF',
    primary: '#7C3AED',
    primaryText: '#FFFFFF',
    text: '#111827',
    textMuted: '#57534E',
    border: '#E9D5FF',
    headerBg: '#F5F0FF',
    headerGradient: ['#F5F0FF', '#EDE9FE'],
    accentGlow: 'rgba(124, 58, 237, 0.30)',
    isPremium: true,
    swatch: ['#FFFFFF', '#7C3AED'],
  },
  ruby_red: {
    id: 'ruby_red',
    nameKey: 'themes.rubyRed.name',
    descriptionKey: 'themes.rubyRed.description',
    background: '#FFFBF7',
    backgroundGradientTop: 'rgba(220, 38, 38, 0.16)',
    surface: '#FFFFFF',
    surfaceElevated: '#FFF5F5',
    primary: '#DC2626',
    primaryText: '#FFFFFF',
    text: '#111827',
    textMuted: '#57534E',
    border: '#FECACA',
    headerBg: '#FFFBF7',
    headerGradient: ['#FFFBF7', '#FEE2E2'],
    accentGlow: 'rgba(220, 38, 38, 0.28)',
    isPremium: true,
    swatch: ['#FFFBF7', '#DC2626'],
  },
};

/** Explicit order so Ruby Red is always included in the picker (6 themes). */
export const APP_THEME_LIST: AppThemeTokens[] = [
  APP_THEMES.penny_green,
  APP_THEMES.midnight_slate,
  APP_THEMES.sunrise_coral,
  APP_THEMES.ocean_blue,
  APP_THEMES.lavender_pro,
  APP_THEMES.ruby_red,
];

export function getAppTheme(id: AppThemeId): AppThemeTokens {
  return APP_THEMES[id] ?? APP_THEMES[DEFAULT_THEME_ID];
}

export function isValidThemeId(value: string): value is AppThemeId {
  return value in APP_THEMES;
}
