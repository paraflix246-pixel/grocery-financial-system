export type BarcodeProductLookup = {
  barcode: string;
  name: string;
  brand?: string;
  category?: string;
};

/** Resolve a UPC/EAN via Open Food Facts public product API (no auth). */
export async function lookupBarcodeProduct(barcode: string): Promise<BarcodeProductLookup | null> {
  const normalized = barcode.replace(/\D/g, '');
  if (normalized.length < 8) return null;

  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(normalized)}.json`
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      status?: number;
      product?: {
        product_name?: string;
        brands?: string;
        categories_tags?: string[];
      };
    };
    if (payload.status !== 1 || !payload.product) return null;

    const name =
      payload.product.product_name?.trim() ||
      payload.product.brands?.trim() ||
      `Product ${normalized}`;
    const categoryTag = payload.product.categories_tags?.[0];
    const category = categoryTag?.replace(/^en:/, '').replace(/-/g, ' ');

    return {
      barcode: normalized,
      name,
      brand: payload.product.brands?.trim() || undefined,
      category,
    };
  } catch {
    return null;
  }
}
