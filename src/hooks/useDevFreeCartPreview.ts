import { useCallback, useEffect, useState } from 'react';

import {
  isDevForceFreeCartPreviewActive,
  isDevForceFreeCartPreviewActiveSync,
} from '@/src/services/devFreeCartPreview';

/** DEV-only: force home cart comparison to render the free-tier experience. */
export function useDevFreeCartPreview() {
  const [active, setActive] = useState(() => isDevForceFreeCartPreviewActiveSync());

  const refresh = useCallback(async () => {
    if (!__DEV__) {
      setActive(false);
      return;
    }
    setActive(await isDevForceFreeCartPreviewActive());
  }, []);

  useEffect(() => {
    if (!__DEV__) {
      setActive(false);
      return;
    }
    setActive(isDevForceFreeCartPreviewActiveSync());
    void refresh();
  }, [refresh]);

  return { active, refresh };
}
