import AsyncStorage from '@react-native-async-storage/async-storage';

import { getReceipts } from '@/src/services/storageService';

const PREFERRED_REGION_KEY = '@smartcart_preferred_region';
const KROGER_PRICING_ZIP_KEY = '@smartcart_kroger_pricing_zip';

function normalizeZipCode(value: string): string {
  return value.trim().replace(/\s+/g, '');
}

export async function getPreferredRegion(): Promise<string | null> {
  try {
    const value = await AsyncStorage.getItem(PREFERRED_REGION_KEY);
    return value?.trim().toUpperCase() || null;
  } catch {
    return null;
  }
}

export async function setPreferredRegion(regionCode: string | null): Promise<void> {
  if (!regionCode?.trim()) {
    await AsyncStorage.removeItem(PREFERRED_REGION_KEY);
    return;
  }
  await AsyncStorage.setItem(PREFERRED_REGION_KEY, regionCode.trim().toUpperCase());
}

/** User override, else most recent receipt with a region code. */
export async function getEffectiveComparisonRegion(): Promise<string | null> {
  const preferred = await getPreferredRegion();
  if (preferred) return preferred;

  const receipts = await getReceipts();
  for (const receipt of receipts) {
    const region = receipt.storeRegion?.trim();
    if (region) return region.toUpperCase();
  }
  return null;
}

/** Postal/ZIP prefix from the latest receipt in the active comparison region. */
export async function getEffectivePostalPrefix(): Promise<string | null> {
  const region = await getEffectiveComparisonRegion();
  const receipts = await getReceipts();
  for (const receipt of receipts) {
    if (region && (receipt.storeRegion ?? '').toUpperCase() !== region) continue;
    const postal = receipt.storePostalCode?.trim();
    if (!postal) continue;
    const normalized = postal.replace(/\s+/g, '').toUpperCase();
    return normalized.length >= 3 ? normalized.slice(0, 3) : normalized;
  }
  return null;
}

export async function getKrogerPricingZipCode(): Promise<string | null> {
  try {
    const value = await AsyncStorage.getItem(KROGER_PRICING_ZIP_KEY);
    const zip = normalizeZipCode(value ?? '');
    return zip.length >= 5 ? zip.slice(0, 5) : zip || null;
  } catch {
    return null;
  }
}

export async function setKrogerPricingZipCode(zipCode: string | null): Promise<void> {
  const zip = normalizeZipCode(zipCode ?? '');
  if (!zip) {
    await AsyncStorage.removeItem(KROGER_PRICING_ZIP_KEY);
    return;
  }
  await AsyncStorage.setItem(KROGER_PRICING_ZIP_KEY, zip.slice(0, 10));
}

/** User Kroger ZIP override, else receipt-derived postal prefix. */
export async function getEffectiveKrogerZipCode(): Promise<string | null> {
  const preferred = await getKrogerPricingZipCode();
  if (preferred) return preferred;
  return getEffectivePostalPrefix();
}
