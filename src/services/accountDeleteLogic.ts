export const DELETE_CONFIRMATION_TOKEN = 'DELETE';

/** AsyncStorage keys cleared on account deletion or guest data wipe. */
export const LOCAL_PREF_KEYS = [
  '@smartcart_subscription',
  '@smartcart_pro_trial_started_at',
  '@smartcart_starter_item_names',
  '@smartcart_starters_dismissed',
  '@smartcart_family_code',
  '@smartcart_family_group_id',
  '@smartcart_family_member_id',
  '@smartcart_family_sync_queue',
  '@smartcart_family_last_export',
  '@smartcart_family_shared_map',
  '@smartcart_external_price_cache_v1',
  '@smartcart_community_user_id_v1',
  '@smartcart_hidden_tracked_items',
  'spending-analytics-period',
  '@smartcart_auth_user_v1',
  '@smartcart_remember_me',
  '@smartcart_last_activity_at',
  '@smartcart_custom_catalog_v1',
  '@smartcart_community_catalog_v1',
  '@smartcart_community_prices_v1',
  '@smartcart_last_opened_list_id',
  '@smartcart_open_last_list',
  '@smartcart_preferred_region',
  '@smartcart_kroger_pricing_zip',
  '@smartcart_kroger_location_id',
  'grocery_onboarding_complete',
] as const;

export function isDeleteConfirmationValid(value: string): boolean {
  return value.trim().toUpperCase() === DELETE_CONFIRMATION_TOKEN;
}

export function resolveAccountApiUrl(
  path: string,
  options?: { webOrigin?: string | null; appUrl?: string | null }
): string | null {
  const webOrigin = options?.webOrigin;
  if (webOrigin) {
    return `${webOrigin}${path}`;
  }

  const appUrl = options?.appUrl?.trim();
  return appUrl ? `${appUrl.replace(/\/$/, '')}${path}` : null;
}

export function filterDynamicLocalKeys(keys: readonly string[]): string[] {
  const dynamicPrefixes = [
    '@smartcart_list_checked_',
    '@smartcart_list_scroll_',
    '@smartcart_buy_again_hidden_',
  ];
  return keys.filter((key) => dynamicPrefixes.some((prefix) => key.startsWith(prefix)));
}
