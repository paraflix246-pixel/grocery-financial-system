import { useEffect, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';

import {
  initializeInAppSubscription,
  useNotificationCenterStore,
} from '@/src/store/useNotificationCenterStore';

export function NotificationCenterBootstrap() {
  const hydrateReadState = useNotificationCenterStore((s) => s.hydrateReadState);
  const refresh = useNotificationCenterStore((s) => s.refresh);

  useEffect(() => {
    initializeInAppSubscription();
    void hydrateReadState();
    void refresh();
  }, [hydrateReadState, refresh]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  return null;
}
