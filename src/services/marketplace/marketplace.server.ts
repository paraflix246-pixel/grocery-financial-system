import {
  buildKrogerProductUrl,
  formatKrogerPromoDiscount,
} from '@/src/services/kroger/krogerParse';
import { isKrogerConfigured, searchKrogerPromoDeals } from '@/src/services/kroger/krogerApi.server';
import { isSerpApiConfigured } from '@/src/services/serpapi/serpApi.server';
import { fetchSerpApiGroceryDeals } from '@/src/services/marketplace/serpapiDeals.server';
import {
  STORE_WEEKLY_AD_DEALS,
  weeklyAdDealsForStores,
} from '@/src/services/marketplace/storeWeeklyAds';
import type {
  MarketplaceDeal,
  MarketplaceFetchResult,
  MarketplaceSourceStatus,
} from '@/src/services/marketplace/marketplaceTypes';

function inferKrogerCategory(description: string): { category: string; emoji: string } {
  const lower = description.toLowerCase();
  if (/milk|cheese|yogurt|butter/.test(lower)) return { category: 'Dairy', emoji: '🥛' };
  if (/chicken|beef|pork|turkey|meat/.test(lower)) return { category: 'Meat', emoji: '🍗' };
  if (/lettuce|apple|banana|berry|tomato|produce|salad/.test(lower)) {
    return { category: 'Produce', emoji: '🥬' };
  }
  if (/chip|cracker|cookie|snack|candy|popcorn/.test(lower)) return { category: 'Snacks', emoji: '🍿' };
  if (/towel|tissue|detergent|cleaner/.test(lower)) return { category: 'Household', emoji: '🧻' };
  return { category: 'Grocery', emoji: '🛒' };
}

function mapKrogerPromosToDeals(
  promos: Awaited<ReturnType<typeof searchKrogerPromoDeals>>['promos']
): MarketplaceDeal[] {
  return promos.map((promo) => {
    const meta = inferKrogerCategory(promo.description);
    const label = promo.brand?.trim()
      ? `${promo.brand} ${promo.description}`.trim()
      : promo.description;
    return {
      id: `kroger-${promo.productId}`,
      title: label,
      store: promo.storeName,
      discountLabel: formatKrogerPromoDiscount(promo.regularPrice, promo.promoPrice),
      category: meta.category,
      emoji: meta.emoji,
      url: buildKrogerProductUrl(promo.productId),
      source: 'kroger-api',
      promoPrice: promo.promoPrice,
      regularPrice: promo.regularPrice,
    };
  });
}

function buildStatusMessage(
  liveCount: number,
  weeklyAdCount: number,
  kroger: MarketplaceSourceStatus,
  serpapi: MarketplaceSourceStatus
): string {
  if (liveCount > 0 && weeklyAdCount > 0) {
    return `Showing ${liveCount} live deal${liveCount === 1 ? '' : 's'} plus official store weekly-ad links. Kroger prices are store-specific when your ZIP is set in Settings.`;
  }
  if (liveCount > 0) {
    return `Showing ${liveCount} live deal${liveCount === 1 ? '' : 's'} from connected price sources. Prices may vary by store and change without notice.`;
  }
  if (weeklyAdCount > 0) {
    const reasons: string[] = [];
    if (!kroger.available) reasons.push('Kroger API is not configured');
    else if (kroger.error) reasons.push(kroger.error);
    else if (kroger.count === 0) reasons.push('no Kroger promos found for your store');
    if (!serpapi.available) reasons.push('SerpApi is not configured');
    else if (serpapi.error) reasons.push(serpapi.error);
    const detail = reasons.length > 0 ? ` (${reasons.join('; ')})` : '';
    return `Live deal APIs are unavailable${detail}. Browse official store weekly ads and savings pages below — each link opens the real store site.`;
  }
  return 'No deals available right now. Check your network connection or try again later.';
}

export function getMarketplaceProviderStatus(): {
  krogerConfigured: boolean;
  serpapiConfigured: boolean;
} {
  return {
    krogerConfigured: isKrogerConfigured(),
    serpapiConfigured: isSerpApiConfigured(),
  };
}

export async function fetchMarketplaceDeals(input: {
  zipCode?: string | null;
  locationId?: string | null;
  limit?: number;
}): Promise<MarketplaceFetchResult> {
  const targetLimit = Math.min(input.limit ?? 12, 16);
  const deals: MarketplaceDeal[] = [];
  const seenUrls = new Set<string>();

  const krogerStatus: MarketplaceSourceStatus = {
    available: isKrogerConfigured(),
    count: 0,
  };
  const serpapiStatus: MarketplaceSourceStatus = {
    available: isSerpApiConfigured(),
    count: 0,
  };

  if (krogerStatus.available) {
    try {
      const kroger = await searchKrogerPromoDeals({
        zipCode: input.zipCode,
        locationId: input.locationId,
        limit: Math.min(targetLimit, 8),
      });
      const krogerDeals = mapKrogerPromosToDeals(kroger.promos);
      krogerStatus.count = krogerDeals.length;
      if (krogerDeals.length === 0 && !input.zipCode && !input.locationId) {
        krogerStatus.error = 'Set a ZIP code in Settings for Kroger store deals';
      }
      for (const deal of krogerDeals) {
        if (seenUrls.has(deal.url)) continue;
        seenUrls.add(deal.url);
        deals.push(deal);
      }
    } catch (error) {
      krogerStatus.error = error instanceof Error ? error.message : 'Kroger deal lookup failed';
    }
  }

  if (deals.length < targetLimit && serpapiStatus.available) {
    try {
      const serpDeals = await fetchSerpApiGroceryDeals(targetLimit - deals.length);
      serpapiStatus.count = serpDeals.length;
      for (const deal of serpDeals) {
        if (seenUrls.has(deal.url)) continue;
        seenUrls.add(deal.url);
        deals.push(deal);
      }
    } catch (error) {
      serpapiStatus.error = error instanceof Error ? error.message : 'SerpApi deal lookup failed';
    }
  }

  const liveStores = deals.map((deal) => deal.store);
  const weeklyAds =
    deals.length === 0
      ? STORE_WEEKLY_AD_DEALS
      : weeklyAdDealsForStores(liveStores, 5);

  for (const deal of weeklyAds) {
    if (seenUrls.has(deal.url)) continue;
    seenUrls.add(deal.url);
    deals.push(deal);
  }

  const liveCount = deals.filter((deal) => deal.source !== 'store-weekly-ad').length;

  return {
    deals: deals.slice(0, targetLimit + 5),
    sources: {
      kroger: krogerStatus,
      serpapi: serpapiStatus,
      weeklyAds: { count: weeklyAds.length },
    },
    statusMessage: buildStatusMessage(liveCount, weeklyAds.length, krogerStatus, serpapiStatus),
  };
}
