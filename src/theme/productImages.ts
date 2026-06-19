const PRODUCT_IMAGES = {
  milk: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=200&h=200&fit=crop',
  banana: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=200&h=200&fit=crop',
  bread: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&h=200&fit=crop',
  cereal: 'https://images.unsplash.com/photo-1587132137056-bfbf01669bc8?w=200&h=200&fit=crop',
  eggs: 'https://images.unsplash.com/photo-1582722878405-44dc4f214782?w=200&h=200&fit=crop',
  meat: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=200&h=200&fit=crop',
  coffee: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=200&h=200&fit=crop',
  default: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&h=200&fit=crop',
} as const;

export const HERO_PRODUCTS = [
  { uri: PRODUCT_IMAGES.milk, top: 8, right: 72, size: 44, rotate: '-14deg', zIndex: 3 },
  { uri: PRODUCT_IMAGES.banana, top: 0, right: 24, size: 48, rotate: '10deg', zIndex: 4 },
  { uri: PRODUCT_IMAGES.cereal, top: 48, right: 52, size: 40, rotate: '-8deg', zIndex: 2 },
  { uri: PRODUCT_IMAGES.bread, top: 40, right: 4, size: 42, rotate: '12deg', zIndex: 3 },
] as const;

export function getProductImageUrl(name: string): string {
  const lower = name.toLowerCase();
  if (/milk/.test(lower)) return PRODUCT_IMAGES.milk;
  if (/banana|apple|fruit|berry/.test(lower)) return PRODUCT_IMAGES.banana;
  if (/bread|bagel|bun/.test(lower)) return PRODUCT_IMAGES.bread;
  if (/cereal|cheerio|oat/.test(lower)) return PRODUCT_IMAGES.cereal;
  if (/egg/.test(lower)) return PRODUCT_IMAGES.eggs;
  if (/chicken|meat|beef/.test(lower)) return PRODUCT_IMAGES.meat;
  if (/coffee|tea/.test(lower)) return PRODUCT_IMAGES.coffee;
  return PRODUCT_IMAGES.default;
}
