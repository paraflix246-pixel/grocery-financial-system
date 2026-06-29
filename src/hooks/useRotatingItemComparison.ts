import { useCallback, useEffect, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';

import type { ListItem } from '@/src/models/types';
import {
  CART_ITEM_ROTATION_MS,
  getRotatingItemComparisons,
  type RotatingItemComparison,
} from '@/src/services/priceComparisonService';

type RotationState = {
  comparisons: RotatingItemComparison[];
  currentIndex: number;
  loading: boolean;
  rotationKey: number;
};

export function useRotatingItemComparison(listItems: ListItem[]) {
  const [state, setState] = useState<RotationState>({
    comparisons: [],
    currentIndex: 0,
    loading: true,
    rotationKey: 0,
  });
  const listSignature = listItems
    .map((item) => `${item.id}:${item.name}:${item.quantity}:${item.storePreference ?? ''}`)
    .join('|');

  /** Ignore stale responses when a newer load (especially forceRefresh) starts. */
  const loadGenerationRef = useRef(0);

  const loadComparisons = useCallback(async (forceRefresh = false) => {
    if (listItems.length === 0) {
      loadGenerationRef.current += 1;
      setState({ comparisons: [], currentIndex: 0, loading: false, rotationKey: 0 });
      return;
    }

    const loadGeneration = ++loadGenerationRef.current;
    setState((prev) => ({ ...prev, loading: true }));
    try {
      const comparisons = await getRotatingItemComparisons(listItems, { forceRefresh });
      if (loadGeneration !== loadGenerationRef.current) return;
      setState((prev) => ({
        comparisons,
        currentIndex: comparisons.length === 0 ? 0 : Math.min(prev.currentIndex, comparisons.length - 1),
        loading: false,
        rotationKey: prev.rotationKey,
      }));
    } catch {
      if (loadGeneration !== loadGenerationRef.current) return;
      setState({ comparisons: [], currentIndex: 0, loading: false, rotationKey: 0 });
    }
  }, [listItems]);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      void loadComparisons();
    });
    return () => task.cancel();
  }, [loadComparisons, listSignature]);

  const advance = useCallback(() => {
    setState((prev) => {
      if (prev.comparisons.length <= 1) return prev;
      return {
        ...prev,
        currentIndex: (prev.currentIndex + 1) % prev.comparisons.length,
        rotationKey: prev.rotationKey + 1,
      };
    });
  }, []);

  const goToNext = useCallback(() => {
    advance();
  }, [advance]);

  const goToPrevious = useCallback(() => {
    setState((prev) => {
      if (prev.comparisons.length <= 1) return prev;
      return {
        ...prev,
        currentIndex:
          (prev.currentIndex - 1 + prev.comparisons.length) % prev.comparisons.length,
        rotationKey: prev.rotationKey + 1,
      };
    });
  }, []);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (state.comparisons.length <= 1 || state.loading) return;

    intervalRef.current = setInterval(advance, CART_ITEM_ROTATION_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [advance, state.comparisons.length, state.loading]);

  const current = state.comparisons[state.currentIndex] ?? null;

  const reload = useCallback(() => {
    void loadComparisons(true);
  }, [loadComparisons]);

  return {
    comparisons: state.comparisons,
    current,
    currentIndex: state.currentIndex,
    loading: state.loading,
    rotationKey: state.rotationKey,
    goToNext,
    goToPrevious,
    reload,
  };
}
