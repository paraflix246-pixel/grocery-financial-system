import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  APP_THEME_LIST,
  DEFAULT_THEME_ID,
  getAppTheme,
  isValidThemeId,
  type AppThemeId,
  type AppThemeTokens,
} from '@/src/theme/appThemes';
import { SmartCartColors } from '@/src/theme/smartCart';

const THEME_STORAGE_KEY = 'app_theme_id';

type AppThemeContextValue = {
  theme: AppThemeTokens;
  themeId: AppThemeId;
  ready: boolean;
  setThemeId: (id: AppThemeId) => Promise<void>;
  themes: AppThemeTokens[];
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

function applyThemeTokens(theme: AppThemeTokens): void {
  Object.assign(SmartCartColors, {
    primary: theme.primary,
    primaryMid: theme.primary,
    primaryDark: theme.primary,
    primaryLight: theme.primary,
    background: theme.background,
    card: theme.surface,
    text: theme.text,
    textSecondary: theme.textMuted,
    textMuted: theme.textMuted,
    border: theme.border,
    badge: `${theme.primary}22`,
    badgeGreen: `${theme.primary}15`,
    bannerGreen: `${theme.primary}12`,
    success: theme.primary,
  });
}

export async function loadStoredThemeId(): Promise<AppThemeId> {
  try {
    const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
    if (stored && isValidThemeId(stored)) return stored;
  } catch {
    // fall through to default
  }
  return DEFAULT_THEME_ID;
}

export async function persistThemeId(id: AppThemeId): Promise<void> {
  await AsyncStorage.setItem(THEME_STORAGE_KEY, id);
}

export function AppThemeProvider({
  children,
  initialThemeId,
}: {
  children: ReactNode;
  initialThemeId?: AppThemeId;
}) {
  const [themeId, setThemeIdState] = useState<AppThemeId>(initialThemeId ?? DEFAULT_THEME_ID);
  const [ready, setReady] = useState(Boolean(initialThemeId));

  const theme = useMemo(() => getAppTheme(themeId), [themeId]);

  useEffect(() => {
    applyThemeTokens(theme);
  }, [theme]);

  useEffect(() => {
    if (initialThemeId) {
      setReady(true);
      return;
    }
    void loadStoredThemeId().then((stored) => {
      setThemeIdState(stored);
      setReady(true);
    });
  }, [initialThemeId]);

  const setThemeId = useCallback(async (id: AppThemeId) => {
    setThemeIdState(id);
    await persistThemeId(id);
  }, []);

  const value = useMemo<AppThemeContextValue>(
    () => ({
      theme,
      themeId,
      ready,
      setThemeId,
      themes: APP_THEME_LIST,
    }),
    [theme, themeId, ready, setThemeId]
  );

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme(): AppThemeContextValue {
  const ctx = useContext(AppThemeContext);
  if (!ctx) {
    throw new Error('useAppTheme must be used within AppThemeProvider');
  }
  return ctx;
}

/** Safe hook for optional theme context (e.g. boot screen). */
export function useAppThemeOptional(): AppThemeContextValue | null {
  return useContext(AppThemeContext);
}
