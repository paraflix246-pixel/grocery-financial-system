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
  APP_AVATAR_LIST,
  DEFAULT_AVATAR_ID,
  getAppAvatar,
  isValidAvatarId,
  type AppAvatarId,
  type AppAvatarPreset,
} from '@/src/components/avatars/appAvatars';

const AVATAR_STORAGE_KEY = 'app_avatar_id';

type AvatarContextValue = {
  avatar: AppAvatarPreset;
  avatarId: AppAvatarId;
  savedAvatarId: AppAvatarId;
  ready: boolean;
  setAvatarId: (id: AppAvatarId) => Promise<void>;
  previewAvatar: (id: AppAvatarId) => void;
  revertAvatar: () => void;
  avatars: AppAvatarPreset[];
};

const AvatarContext = createContext<AvatarContextValue | null>(null);

export async function loadStoredAvatarId(): Promise<AppAvatarId> {
  try {
    const stored = await AsyncStorage.getItem(AVATAR_STORAGE_KEY);
    if (stored && isValidAvatarId(stored)) return stored;
  } catch {
    // fall through
  }
  return DEFAULT_AVATAR_ID;
}

export async function persistAvatarId(id: AppAvatarId): Promise<void> {
  await AsyncStorage.setItem(AVATAR_STORAGE_KEY, id);
}

export function AvatarProvider({
  children,
  initialAvatarId,
}: {
  children: ReactNode;
  initialAvatarId?: AppAvatarId;
}) {
  const [avatarId, setAvatarIdState] = useState<AppAvatarId>(initialAvatarId ?? DEFAULT_AVATAR_ID);
  const [savedAvatarId, setSavedAvatarId] = useState<AppAvatarId>(
    initialAvatarId ?? DEFAULT_AVATAR_ID
  );
  const [ready, setReady] = useState(Boolean(initialAvatarId));

  const avatar = useMemo(() => getAppAvatar(avatarId), [avatarId]);

  useEffect(() => {
    if (initialAvatarId) {
      setReady(true);
      return;
    }
    void loadStoredAvatarId().then((stored) => {
      setAvatarIdState(stored);
      setSavedAvatarId(stored);
      setReady(true);
    });
  }, [initialAvatarId]);

  const previewAvatar = useCallback((id: AppAvatarId) => {
    setAvatarIdState(id);
  }, []);

  const revertAvatar = useCallback(() => {
    setAvatarIdState(savedAvatarId);
  }, [savedAvatarId]);

  const setAvatarId = useCallback(async (id: AppAvatarId) => {
    setAvatarIdState(id);
    setSavedAvatarId(id);
    await persistAvatarId(id);
  }, []);

  const value = useMemo<AvatarContextValue>(
    () => ({
      avatar,
      avatarId,
      savedAvatarId,
      ready,
      setAvatarId,
      previewAvatar,
      revertAvatar,
      avatars: APP_AVATAR_LIST,
    }),
    [avatar, avatarId, savedAvatarId, ready, setAvatarId, previewAvatar, revertAvatar]
  );

  return <AvatarContext.Provider value={value}>{children}</AvatarContext.Provider>;
}

export function useAvatar(): AvatarContextValue {
  const ctx = useContext(AvatarContext);
  if (!ctx) {
    throw new Error('useAvatar must be used within AvatarProvider');
  }
  return ctx;
}

export function useAvatarOptional(): AvatarContextValue | null {
  return useContext(AvatarContext);
}
