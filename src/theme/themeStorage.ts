import { Platform } from 'react-native';

import {
  APP_THEMES,
  DEFAULT_THEME_ID,
  getAppTheme,
  isValidThemeId,
  type AppThemeId,
  type AppThemeTokens,
} from '@/src/theme/appThemes';
import { SmartCartColors } from '@/src/theme/smartCart';

export const THEME_STORAGE_KEY = 'app_theme_id';

export function applyThemeTokens(theme: AppThemeTokens): void {
  Object.assign(SmartCartColors, {
    primary: theme.primary,
    primaryMid: theme.primary,
    primaryDark: theme.primary,
    primaryLight: theme.primary,
    background: theme.background,
    card: theme.surface,
    cardElevated: theme.surfaceElevated,
    accentGlow: theme.accentGlow,
    text: theme.text,
    textSecondary: theme.textMuted,
    textMuted: theme.textMuted,
    textOnPrimary: theme.primaryText,
    border: theme.border,
    badge: `${theme.primary}22`,
    badgeGreen: `${theme.primary}15`,
    bannerGreen: `${theme.primary}12`,
    success: theme.primary,
  });
}

/** Read persisted theme synchronously on web (localStorage mirrors AsyncStorage). */
export function readStoredThemeIdSync(): AppThemeId | null {
  if (Platform.OS !== 'web' || typeof localStorage === 'undefined') {
    return null;
  }
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && isValidThemeId(stored)) return stored;
  } catch {
    // ignore storage errors
  }
  return null;
}

export function resolveInitialThemeId(initialThemeId?: AppThemeId): AppThemeId {
  return initialThemeId ?? readStoredThemeIdSync() ?? DEFAULT_THEME_ID;
}

export function applyThemeById(id: AppThemeId): AppThemeTokens {
  const theme = getAppTheme(id);
  applyThemeTokens(theme);
  return theme;
}

/** Keep document root in sync with the active theme on web (preview + hydration). */
export function syncWebDocumentTheme(theme: AppThemeTokens, themeId: AppThemeId): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return;
  }
  const root = document.documentElement;
  root.style.backgroundColor = theme.background;
  root.style.color = theme.text;
  root.dataset.appTheme = themeId;
  root.style.setProperty('--app-background', theme.background);
  root.style.setProperty('--app-text', theme.text);
  root.style.setProperty('--app-text-muted', theme.textMuted);
  root.style.setProperty('--app-primary', theme.primary);
  if (document.body) {
    document.body.style.backgroundColor = theme.background;
    document.body.style.color = theme.text;
  }
}

type WebThemeBootstrapColors = {
  background: string;
  text: string;
  textMuted: string;
  primary: string;
};

/** Blocking head script: apply stored theme colors before React hydrates. */
export function buildWebThemeBootstrapScript(): string {
  const themeColors = Object.fromEntries(
    Object.entries(APP_THEMES).map(([id, theme]) => [
      id,
      {
        background: theme.background,
        text: theme.text,
        textMuted: theme.textMuted,
        primary: theme.primary,
      } satisfies WebThemeBootstrapColors,
    ])
  );

  return `(function(){try{var themes=${JSON.stringify(themeColors)};var key=${JSON.stringify(THEME_STORAGE_KEY)};var stored=localStorage.getItem(key);var themeId=stored&&themes[stored]?stored:${JSON.stringify(DEFAULT_THEME_ID)};var theme=themes[themeId];var root=document.documentElement;root.style.backgroundColor=theme.background;root.style.color=theme.text;root.dataset.appTheme=themeId;root.style.setProperty('--app-background',theme.background);root.style.setProperty('--app-text',theme.text);root.style.setProperty('--app-text-muted',theme.textMuted);root.style.setProperty('--app-primary',theme.primary);}catch(e){}})();`;
}

export function getDefaultWebHtmlStyles(): string {
  const theme = APP_THEMES[DEFAULT_THEME_ID];
  return `
html, body {
  overflow-x: hidden;
  background-color: ${theme.background};
  color: ${theme.text};
}
#root, [data-expo-router-root] {
  background-color: ${theme.background};
  color: ${theme.text};
}`;
}
