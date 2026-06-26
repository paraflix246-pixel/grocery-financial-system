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
  APP_FONT_LIST,
  DEFAULT_FONT_ID,
  getAppFont,
  isValidFontId,
  type AppFontId,
  type AppFontPreset,
} from '@/src/theme/appFonts';

const FONT_STORAGE_KEY = 'app_font_id';

type AppFontContextValue = {
  font: AppFontPreset;
  fontId: AppFontId;
  savedFontId: AppFontId;
  ready: boolean;
  fontFamily: string | undefined;
  setFontId: (id: AppFontId) => Promise<void>;
  previewFont: (id: AppFontId) => void;
  revertFont: () => void;
  fonts: AppFontPreset[];
};

const AppFontContext = createContext<AppFontContextValue | null>(null);

export async function loadStoredFontId(): Promise<AppFontId> {
  try {
    const stored = await AsyncStorage.getItem(FONT_STORAGE_KEY);
    if (stored && isValidFontId(stored)) return stored;
  } catch {
    // fall through
  }
  return DEFAULT_FONT_ID;
}

export async function persistFontId(id: AppFontId): Promise<void> {
  await AsyncStorage.setItem(FONT_STORAGE_KEY, id);
}

export function AppFontProvider({
  children,
  initialFontId,
}: {
  children: ReactNode;
  initialFontId?: AppFontId;
}) {
  const [fontId, setFontIdState] = useState<AppFontId>(initialFontId ?? DEFAULT_FONT_ID);
  const [savedFontId, setSavedFontId] = useState<AppFontId>(initialFontId ?? DEFAULT_FONT_ID);
  const [ready, setReady] = useState(Boolean(initialFontId));

  const font = useMemo(() => getAppFont(fontId), [fontId]);

  useEffect(() => {
    if (initialFontId) {
      setReady(true);
      return;
    }
    void loadStoredFontId().then((stored) => {
      setFontIdState(stored);
      setSavedFontId(stored);
      setReady(true);
    });
  }, [initialFontId]);

  const previewFont = useCallback((id: AppFontId) => {
    setFontIdState(id);
  }, []);

  const revertFont = useCallback(() => {
    setFontIdState(savedFontId);
  }, [savedFontId]);

  const setFontId = useCallback(async (id: AppFontId) => {
    setFontIdState(id);
    setSavedFontId(id);
    await persistFontId(id);
  }, []);

  const value = useMemo<AppFontContextValue>(
    () => ({
      font,
      fontId,
      savedFontId,
      ready,
      fontFamily: font.fontFamily,
      setFontId,
      previewFont,
      revertFont,
      fonts: APP_FONT_LIST,
    }),
    [font, fontId, savedFontId, ready, setFontId, previewFont, revertFont]
  );

  return <AppFontContext.Provider value={value}>{children}</AppFontContext.Provider>;
}

export function useAppFont(): AppFontContextValue {
  const ctx = useContext(AppFontContext);
  if (!ctx) {
    throw new Error('useAppFont must be used within AppFontProvider');
  }
  return ctx;
}

export function useAppFontOptional(): AppFontContextValue | null {
  return useContext(AppFontContext);
}
