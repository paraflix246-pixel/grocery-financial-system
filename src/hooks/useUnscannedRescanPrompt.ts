import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { useScanStore } from '@/src/store/useScanStore';
import {
  countUnscannedItems,
  shouldSuggestRescanForObstructedReceipt,
} from '@/src/utils/receiptItemLabels';
import { confirmRescanPrompt } from '@/src/utils/rescanPrompt';

/** Prompts once per photo when blur or obstruction likely caused scan failures. */
export function useUnscannedRescanPrompt(enabled = true): void {
  const router = useRouter();
  const {
    draft,
    imageUri,
    editingReceiptId,
    ocrConfidence,
    rescanPromptImageUri,
    markRescanPromptShown,
  } = useScanStore();

  useEffect(() => {
    if (!enabled || !draft || !imageUri || editingReceiptId) {
      return;
    }
    if (rescanPromptImageUri === imageUri) return;

    if (
      !shouldSuggestRescanForObstructedReceipt({
        items: draft.items,
        ocrConfidence,
      })
    ) {
      return;
    }

    const unscannedCount = countUnscannedItems(draft.items);
    if (unscannedCount === 0) return;

    markRescanPromptShown(imageUri);

    const timer = setTimeout(() => {
      void (async () => {
        const shouldRescan = await confirmRescanPrompt(unscannedCount);
        if (shouldRescan) {
          router.replace('/(tabs)/scan');
        }
      })();
    }, 2500);

    return () => clearTimeout(timer);
  }, [
    draft,
    editingReceiptId,
    enabled,
    imageUri,
    markRescanPromptShown,
    ocrConfidence,
    rescanPromptImageUri,
    router,
  ]);
}
