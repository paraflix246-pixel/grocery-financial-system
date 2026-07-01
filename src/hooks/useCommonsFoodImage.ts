import { useEffect, useState } from 'react';

import type { CommonsFoodImage } from '@/src/services/commons/commonsImageTypes';
import { fetchValidatedCommonsFoodImage } from '@/src/services/commons/foodImageValidationService';

export function useCommonsFoodImage(itemName: string | undefined): {
  image: CommonsFoodImage | null;
  loading: boolean;
} {
  const [image, setImage] = useState<CommonsFoodImage | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const trimmed = itemName?.trim();
    if (!trimmed) {
      setImage(null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    void fetchValidatedCommonsFoodImage(trimmed).then((result) => {
      if (!active) return;
      setImage(result);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [itemName]);

  return { image, loading };
}
