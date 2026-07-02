import { useCallback, useEffect } from 'react';
import { useFocusEffect } from 'expo-router';

import {
  initializeInAppSubscription,
  useNotificationCenterStore,
  type NotificationCenterStore,
} from '@/src/store/useNotificationCenterStore';

type Selector<T> = (state: NotificationCenterStore) => T;

export function useInAppNotificationCenter<T>(selector: Selector<T>): T {
  return useNotificationCenterStore(selector);
}

/** Hydrates read state and refreshes notifications when the screen gains focus. */
export function useNotificationCenterBootstrap(): void {
  const hydrateReadState = useNotificationCenterStore((s) => s.hydrateReadState);
  const refresh = useNotificationCenterStore((s) => s.refresh);

  useEffect(() => {
    initializeInAppSubscription();
    void hydrateReadState();
  }, [hydrateReadState]);

  const onFocus = useCallback(() => {
    void refresh();
  }, [refresh]);

  useFocusEffect(onFocus);
}
