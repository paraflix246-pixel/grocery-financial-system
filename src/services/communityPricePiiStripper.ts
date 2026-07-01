/**
 * Strips personally identifiable information before community price contributions.
 * Only product pricing fields may pass through — never customer or transaction identifiers.
 */

export type CommunityPriceRow = {
  item_name: string;
  brand: string | null;
  package_size: string | null;
  quantity: number;
  price: number;
  store_name: string;
  store_city: string | null;
  store_state: string | null;
  scan_date: string;
  receipt_date: string | null;
};

const CREDIT_CARD = /\b(?:\d[ -]*?){13,19}\b/;
const PHONE = /\b(?:\+?1[-.\s]?)?(?:\(\d{3}\)|\d{3})[-.\s]?\d{3}[-.\s]?\d{4}\b/;
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const LOYALTY = /\b(?:loyalty|member(?:ship)?|rewards?|club\s*card|bonus\s*card)[\s#:*]*[A-Z0-9-]{4,}\b/i;
const RECEIPT_ID =
  /\b(?:receipt|trans(?:action)?|txn|ref(?:erence)?|auth(?:orization)?|approval|seq(?:uence)?)[\s#:*]*[A-Z0-9-]{5,}\b/i;
const CASHIER = /\b(?:cashier|operator|clerk|assoc(?:iate)?|emp(?:loyee)?)[\s#:*]*[A-Z0-9-]{2,}\b/i;
const TAX_ID = /\b(?:ein|ssn|sin|abn|gst\s*reg|vat\s*reg|tax\s*id)[\s#:*]*[A-Z0-9-]{4,}\b/i;
const STREET_ADDRESS =
  /\b\d+\s+(?:[A-Za-z0-9.'-]+\s+){1,4}(?:st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|way|ct|court|pl|place|cir|circle)\b\.?/i;

const PII_BLOCK_PATTERNS = [
  CREDIT_CARD,
  PHONE,
  EMAIL,
  LOYALTY,
  RECEIPT_ID,
  CASHIER,
  TAX_ID,
  STREET_ADDRESS,
];

const CUSTOMER_NAME_LINE =
  /^(?:customer|member|shopper|cardholder|name)[\s#:*]/i;

/** Returns true when text likely contains PII that must not enter the community database. */
export function containsCommunityPii(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  if (CUSTOMER_NAME_LINE.test(trimmed)) return true;
  return PII_BLOCK_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/** Remove embedded PII tokens from an otherwise valid product name. */
export function sanitizeProductNameForCommunity(name: string): string {
  let cleaned = name.trim();
  for (const pattern of PII_BLOCK_PATTERNS) {
    cleaned = cleaned.replace(pattern, ' ').replace(/\s+/g, ' ').trim();
  }
  return cleaned;
}

const BRAND_SIZE_PATTERN =
  /^(.+?)\s+(\d+(?:\.\d+)?\s*(?:oz|fl\s*oz|lb|lbs|g|kg|ml|l|ct|pk|pack|count|ea))\b/i;

export function parseProductBrandAndSize(name: string): {
  itemName: string;
  brand: string | null;
  packageSize: string | null;
} {
  const sanitized = sanitizeProductNameForCommunity(name);
  const match = sanitized.match(BRAND_SIZE_PATTERN);
  if (!match) {
    return { itemName: sanitized.toLowerCase(), brand: null, packageSize: null };
  }
  const brand = match[1]?.trim() || null;
  const packageSize = match[2]?.trim() || null;
  const itemName = sanitized.toLowerCase();
  return { itemName, brand, packageSize };
}

export type CommunityItemInput = {
  name: string;
  price: number;
  quantity?: number;
};

export type CommunityStoreInput = {
  storeName: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
};

/**
 * Convert receipt line items into community-safe rows.
 * Returns an empty array when input contains blocked PII or invalid pricing.
 */
export function stripReceiptItemsForCommunity(
  items: CommunityItemInput[],
  storeInfo: CommunityStoreInput,
  receiptDate: string,
  scanDate: string
): CommunityPriceRow[] {
  const storeName = normalizeCommunityStoreName(storeInfo.storeName);
  if (!storeName || containsCommunityPii(storeName)) return [];

  const regionState = storeInfo.state?.trim() || null;
  const regionCity = storeInfo.city?.trim() || null;
  if (regionState && containsCommunityPii(regionState)) return [];
  if (regionCity && containsCommunityPii(regionCity)) return [];

  const rows: CommunityPriceRow[] = [];

  for (const item of items) {
    const rawName = (item.name ?? '').trim();
    if (rawName.length < 3) continue;
    if (containsCommunityPii(rawName)) continue;

    const price = item.price;
    if (!(price > 0 && price <= 500)) continue;

    const { itemName, brand, packageSize } = parseProductBrandAndSize(rawName);
    if (itemName.length < 3 || containsCommunityPii(itemName)) continue;

    rows.push({
      item_name: itemName,
      brand,
      package_size: packageSize,
      quantity: item.quantity && item.quantity > 0 ? item.quantity : 1,
      price,
      store_name: storeName,
      store_city: regionCity,
      store_state: regionState,
      scan_date: scanDate,
      receipt_date: receiptDate || null,
    });
  }

  return rows;
}

const STORE_NAME_NORMALIZATIONS: Array<[RegExp, string]> = [
  [/^WAL-?MART(\s+SUPERCENTER)?(\s+#\d+)?$/i, 'Walmart'],
  [/^TARGET(\s+STORE)?(\s+#\d+)?$/i, 'Target'],
  [/^WHOLE\s+FOODS(\s+MARKET)?$/i, 'Whole Foods'],
  [/^KROGER(\s+STORE)?(\s+#\d+)?$/i, 'Kroger'],
  [/^SAFEWAY(\s+STORE)?(\s+#\d+)?$/i, 'Safeway'],
  [/^PUBLIX(\s+SUPER\s+MARKETS?)?$/i, 'Publix'],
  [/^TRADER\s+JOE['']?S?$/i, "Trader Joe's"],
  [/^COSTCO(\s+WHOLESALE)?$/i, 'Costco'],
  [/^ALDI(\s+STORE)?(\s+#\d+)?$/i, 'ALDI'],
];

export function normalizeCommunityStoreName(name: string): string {
  const trimmed = name.trim().replace(/\s+#\d+\s*$/i, '');
  for (const [pattern, replacement] of STORE_NAME_NORMALIZATIONS) {
    if (pattern.test(trimmed)) return replacement;
  }
  return trimmed;
}
