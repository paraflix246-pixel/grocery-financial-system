import type { OpenFoodFactsPriceRow } from '@/src/services/openfoodfacts/openFoodFactsTypes';
import type { PriceQuote } from '@/src/services/priceRecommendationLogic';

export function isUsdPrice(row: OpenFoodFactsPriceRow): boolean {
  const currency = row.currency?.trim().toUpperCase();
  if (!currency) return false;
  return currency === 'USD';
}

export function isUsLocation(row: OpenFoodFactsPriceRow): boolean {
  const country = row.location?.osm_address_country_code?.trim().toUpperCase();
  return country === 'US';
}

export function formatOpenFoodFactsStoreName(row: OpenFoodFactsPriceRow): string {
  const location = row.location;
  const brand = location?.osm_brand?.trim();
  if (brand) return brand;
  const name = location?.osm_name?.trim();
  if (name) return name;
  return 'Open Food Facts';
}

export function formatOpenFoodFactsProductLabel(row: OpenFoodFactsPriceRow): string | undefined {
  const productName = row.product_name?.trim() || row.product?.product_name?.trim();
  if (!productName) return undefined;
  const brand = row.product?.brands?.trim();
  if (brand && !productName.toLowerCase().includes(brand.toLowerCase())) {
    return `${brand} ${productName}`;
  }
  return productName;
}

export function mapOpenFoodFactsRowsToQuotes(
  rows: OpenFoodFactsPriceRow[],
  itemName: string,
  limit = 5
): PriceQuote[] {
  const quotes: PriceQuote[] = [];

  for (const row of rows) {
    if (!isUsdPrice(row)) continue;
    if (!isUsLocation(row)) continue;
    if (typeof row.price !== 'number' || row.price <= 0) continue;

    quotes.push({
      itemName,
      storeName: formatOpenFoodFactsStoreName(row),
      price: row.price,
      date: row.date?.trim() || new Date().toISOString().slice(0, 10),
      source: 'community',
      productLabel: formatOpenFoodFactsProductLabel(row),
    });

    if (quotes.length >= limit) break;
  }

  return quotes;
}
