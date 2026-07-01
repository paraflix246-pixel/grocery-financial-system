import { useEffect } from 'react';

import { useReceiptProcessingQueue } from '@/src/services/receiptProcessingQueue';

/** Hydrates background receipt jobs from AsyncStorage and resumes processing after app restart. */
export function ReceiptProcessingBootstrap() {
  const hydrateFromStorage = useReceiptProcessingQueue((s) => s.hydrateFromStorage);

  useEffect(() => {
    void hydrateFromStorage();
  }, [hydrateFromStorage]);

  return null;
}
