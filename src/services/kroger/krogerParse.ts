import type { KrogerProduct, KrogerProductItem, KrogerProductQuote } from '@/src/services/kroger/krogerTypes';
import type { PriceQuote } from '@/src/services/priceRecommendationLogic';

export type KrogerPromoItem = {
  productId: string;
  description: string;
  brand?: string;
  promoPrice: number;
  regularPrice: number;
  size?: string;
  storeName: string;
  locationId: string;
};

export function pickKrogerPromoPrices(
  item: KrogerProductItem | undefined
): { promo: number; regular: number } | null {
  const promo = item?.price?.promo;
  const regular = item?.price?.regular;
  if (typeof promo !== 'number' || promo <= 0) return null;
  if (typeof regular !== 'number' || regular <= promo) return null;
  return { promo, regular };
}

export function formatKrogerPromoDiscount(regular: number, promo: number): string {
  const savings = regular - promo;
  const pct = Math.round((savings / regular) * 100);
  if (pct >= 10) return `${pct}% off`;
  return `$${savings.toFixed(2)} off`;
}

export function buildKrogerProductUrl(productId: string): string {
  return `https://www.kroger.com/p/${encodeURIComponent(productId)}`;
}

export function mapKrogerProductsToPromoItems(
  products: KrogerProduct[],
  storeName: string,
  locationId: string,
  limit = 5
): KrogerPromoItem[] {
  const promos: KrogerPromoItem[] = [];
  for (const product of products) {
    const firstItem = product.items?.[0];
    const prices = pickKrogerPromoPrices(firstItem);
    if (!prices) continue;
    promos.push({
      productId: product.productId,
      description: product.description,
      brand: product.brand,
      promoPrice: prices.promo,
      regularPrice: prices.regular,
      size: firstItem?.size,
      storeName,
      locationId,
    });
    if (promos.length >= limit) break;
  }
  return promos;
}

export function pickKrogerItemPrice(item: KrogerProduct['items']): number | null {
  const first = item?.[0];
  if (!first?.price) return null;
  const promo = first.price.promo;
  const regular = first.price.regular;
  if (typeof promo === 'number' && promo > 0) return promo;
  if (typeof regular === 'number' && regular > 0) return regular;
  return null;
}

export function mapKrogerProductsToQuotes(
  products: KrogerProduct[],
  itemName: string,
  storeName: string,
  locationId: string,
  limit = 5
): KrogerProductQuote[] {
  const quotes: KrogerProductQuote[] = [];
  for (const product of products) {
    const price = pickKrogerItemPrice(product.items);
    if (price == null) continue;
    quotes.push({
      productId: product.productId,
      description: product.description,
      brand: product.brand,
      price,
      size: product.items?.[0]?.size,
      storeName,
      locationId,
    });
    if (quotes.length >= limit) break;
  }
  return quotes;
}

function formatKrogerProductLabel(entry: KrogerProductQuote): string | undefined {
  const parts = [entry.brand?.trim(), entry.description?.trim()].filter(Boolean);
  const label = parts.join(' ').trim();
  if (!label) return undefined;
  if (entry.size?.trim()) return `${label} (${entry.size.trim()})`;
  return label;
}

export function krogerQuotesToPriceQuotes(
  krogerQuotes: KrogerProductQuote[],
  itemName: string
): PriceQuote[] {
  const today = new Date().toISOString().slice(0, 10);
  return krogerQuotes.map((entry) => ({
    itemName,
    storeName: entry.storeName,
    price: entry.price,
    date: today,
    source: 'api' as const,
    productLabel: formatKrogerProductLabel(entry),
  }));
}

export function formatKrogerStoreLabel(chain: string, name?: string): string {
  const chainLabel = chain.trim() || 'Kroger';
  if (!name?.trim()) return chainLabel;
  if (name.toLowerCase().includes(chainLabel.toLowerCase())) return name.trim();
  return `${chainLabel} · ${name.trim()}`;
}
