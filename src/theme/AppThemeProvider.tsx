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
  getAppTheme,
  isValidThemeId,
  type AppThemeId,
  type AppThemeTokens,
} from '@/src/theme/appThemes';
import {
  applyThemeTokens,
  readStoredThemeIdSync,
  resolveInitialThemeId,
  syncWebDocumentTheme,
  THEME_STORAGE_KEY,
} from '@/src/theme/themeStorage';

export { THEME_STORAGE_KEY } from '@/src/theme/themeStorage';

type AppThemeContextValue = {
  theme: AppThemeTokens;
  themeId: AppThemeId;
  savedThemeId: AppThemeId;
  ready: boolean;
  setThemeId: (id: AppThemeId) => Promise<void>;
  previewTheme: (id: AppThemeId) => void;
  revertTheme: () => void;
  themes: AppThemeTokens[];
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

export async function loadStoredThemeId(): Promise<AppThemeId> {
  const sync = readStoredThemeIdSync();
  if (sync) return sync;
  try {
    const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
    if (stored && isValidThemeId(stored)) return stored;
  } catch {
    // fall through to default
  }
  return resolveInitialThemeId();
}

export async function persistThemeId(id: AppThemeId): Promise<void> {
  await AsyncStorage.setItem(THEME_STORAGE_KEY, id);
}

function initializeThemeId(initialThemeId?: AppThemeId): AppThemeId {
  const id = resolveInitialThemeId(initialThemeId);
  const theme = getAppTheme(id);
  applyThemeTokens(theme);
  syncWebDocumentTheme(theme, id);
  return id;
}

export function AppThemeProvider({
  children,
  initialThemeId,
}: {
  children: ReactNode;
  initialThemeId?: AppThemeId;
}) {
  const [themeId, setThemeIdState] = useState<AppThemeId>(() => initializeThemeId(initialThemeId));
  const [savedThemeId, setSavedThemeId] = useState<AppThemeId>(() =>
    resolveInitialThemeId(initialThemeId)
  );
  const [ready, setReady] = useState(
    () => Boolean(initialThemeId) || readStoredThemeIdSync() !== null
  );

  const theme = useMemo(() => getAppTheme(themeId), [themeId]);

  useEffect(() => {
    applyThemeTokens(theme);
    syncWebDocumentTheme(theme, themeId);
  }, [theme, themeId]);

  useEffect(() => {
    if (initialThemeId || readStoredThemeIdSync()) {
      setReady(true);
      return;
    }
    void loadStoredThemeId().then((stored) => {
      if (stored !== themeId) {
        const next = getAppTheme(stored);
        applyThemeTokens(next);
        syncWebDocumentTheme(next, stored);
        setThemeIdState(stored);
      }
      setSavedThemeId(stored);
      setReady(true);
    });
  }, [initialThemeId, themeId]);

  const previewTheme = useCallback((id: AppThemeId) => {
    const next = getAppTheme(id);
    applyThemeTokens(next);
    syncWebDocumentTheme(next, id);
    setThemeIdState(id);
  }, []);

  const revertTheme = useCallback(() => {
    const saved = getAppTheme(savedThemeId);
    applyThemeTokens(saved);
    syncWebDocumentTheme(saved, savedThemeId);
    setThemeIdState(savedThemeId);
  }, [savedThemeId]);

  const setThemeId = useCallback(async (id: AppThemeId) => {
    const next = getAppTheme(id);
    applyThemeTokens(next);
    syncWebDocumentTheme(next, id);
    setThemeIdState(id);
    setSavedThemeId(id);
    await persistThemeId(id);
  }, []);

  const value = useMemo<AppThemeContextValue>(
    () => ({
      theme,
      themeId,
      savedThemeId,
      ready,
      setThemeId,
      previewTheme,
      revertTheme,
      themes: APP_THEME_LIST,
    }),
    [theme, themeId, savedThemeId, ready, setThemeId, previewTheme, revertTheme]
  );

  if (!ready) {
    return null;
  }

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
