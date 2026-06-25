import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

type FocusReloadOptions = {
  /** Skip background refetch when refocusing within this window (default 3s). */
  minRefocusMs?: number;
};

/**
 * Reload on screen focus without blocking the UI after the first successful load.
 */
export function useFocusReload(loadFn: () => Promise<void>, options?: FocusReloadOptions) {
  const minRefocusMs = options?.minRefocusMs ?? 3_000;
  const [blocking, setBlocking] = useState(true);
  const hasLoadedRef = useRef(false);
  const lastLoadedAtRef = useRef(0);
  const loadRef = useRef(loadFn);
  loadRef.current = loadFn;

  const reload = useCallback(async (force = false) => {
    const now = Date.now();
    if (
      hasLoadedRef.current &&
      !force &&
      now - lastLoadedAtRef.current < minRefocusMs
    ) {
      return;
    }

    if (!hasLoadedRef.current) {
      setBlocking(true);
    }
    try {
      await loadRef.current();
      hasLoadedRef.current = true;
      lastLoadedAtRef.current = Date.now();
    } finally {
      setBlocking(false);
    }
  }, [minRefocusMs]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  return { blocking, reload: () => reload(true), hasLoaded: hasLoadedRef.current };
}
