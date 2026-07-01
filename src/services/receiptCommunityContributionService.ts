import AsyncStorage from '@react-native-async-storage/async-storage';

import { generateId } from '@/src/utils/id';
import { isCommunityPriceSharingEnabled } from '@/src/services/privacyPreferencesService';
import {
  stripReceiptItemsForCommunity,
  type CommunityItemInput,
  type CommunityStoreInput,
} from '@/src/services/communityPricePiiStripper';
import { supabase } from '@/src/services/supabaseClient';

const ANONYMOUS_CONTRIBUTOR_KEY = '@smartcart_community_user_id_v1';

async function getAnonymousContributorId(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(ANONYMOUS_CONTRIBUTOR_KEY);
    if (existing) return existing;
    const newId = generateId();
    await AsyncStorage.setItem(ANONYMOUS_CONTRIBUTOR_KEY, newId);
    return newId;
  } catch {
    return generateId();
  }
}

/**
 * Contribute anonymized, PII-stripped pricing to the community database when the user has opted in.
 * Fire-and-forget — never blocks UI or surfaces errors.
 */
export async function contributeCommunityPricesIfEnabled(
  items: CommunityItemInput[],
  storeInfo: CommunityStoreInput,
  receiptDate: string
): Promise<void> {
  if (!supabase) return;

  try {
    const enabled = await isCommunityPriceSharingEnabled();
    if (!enabled) return;

    const scanDate = new Date().toISOString().split('T')[0];
    const stripped = stripReceiptItemsForCommunity(items, storeInfo, receiptDate, scanDate);
    if (stripped.length === 0) return;

    const contributorId = await getAnonymousContributorId();
    const rows = stripped.map((row) => ({
      item_name: row.item_name,
      price: row.price,
      store_name: row.store_name,
      store_city: row.store_city,
      store_state: row.store_state,
      scan_date: row.scan_date,
      receipt_date: row.receipt_date,
      user_id: contributorId,
    }));

    await supabase.from('price_records').insert(rows);
  } catch {
    // Never surface errors to the user
  }
}
