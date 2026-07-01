import { Alert, Platform } from 'react-native';

import { i18n } from '@/src/i18n';
import { addManualPantryItem, inferPantryCategory } from '@/src/services/pantryService';
import { trackItemPriceAlert } from '@/src/services/priceAlertService';
import { createListItem, getActiveList } from '@/src/services/storageService';
import type { BarcodeProductLookup } from '@/src/services/barcodeProductService';

export type BarcodeScanDestination = 'list' | 'pantry' | 'track';

export async function applyBarcodeScan(
  product: BarcodeProductLookup,
  destination: BarcodeScanDestination
): Promise<{ ok: boolean; message?: string }> {
  const displayName = product.brand ? `${product.name} (${product.brand})` : product.name;

  if (destination === 'pantry') {
    await addManualPantryItem({
      name: displayName,
      quantity: 1,
      unit: 'ea',
      category: inferPantryCategory(product.name),
    });
    return { ok: true, message: i18n.t('scan.barcodeAddedPantry', { name: displayName }) };
  }

  if (destination === 'track') {
    await trackItemPriceAlert(displayName, 0);
    return { ok: true, message: i18n.t('scan.barcodeAddedTrack', { name: displayName }) };
  }

  const activeList = await getActiveList();
  if (!activeList) {
    return { ok: false, message: i18n.t('scan.barcodeNoActiveList') };
  }
  await createListItem(activeList.id, {
    name: displayName,
    expectedPrice: 0,
    quantity: 1,
    category: inferPantryCategory(product.name),
  });
  return {
    ok: true,
    message: i18n.t('scan.barcodeAddedList', { name: displayName, list: activeList.name }),
  };
}

export function promptBarcodeDestination(
  code: string,
  productName: string,
  handlers: {
    onList: () => void | Promise<void>;
    onPantry: () => void | Promise<void>;
    onTrack: () => void | Promise<void>;
  }
): void {
  const title = i18n.t('scan.barcodeDetected');
  const message = i18n.t('scan.barcodeAddPrompt', { code, name: productName });

  if (Platform.OS === 'web') {
    const choice = window.prompt(
      `${title}\n${message}\n\nEnter: list | pantry | track`,
      'list'
    );
    if (choice === 'pantry') void handlers.onPantry();
    else if (choice === 'track') void handlers.onTrack();
    else if (choice === 'list') void handlers.onList();
    return;
  }

  Alert.alert(title, message, [
    { text: i18n.t('common.cancel'), style: 'cancel' },
    { text: i18n.t('scan.barcodeDestList'), onPress: () => void handlers.onList() },
    { text: i18n.t('home.pantry'), onPress: () => void handlers.onPantry() },
    { text: i18n.t('scan.barcodeDestTrack'), onPress: () => void handlers.onTrack() },
  ]);
}
