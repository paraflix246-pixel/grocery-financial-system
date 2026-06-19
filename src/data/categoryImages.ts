export type SpendingCategory = 'Groceries' | 'Household' | 'Snacks' | 'Beverages';

export const CATEGORY_IMAGES: Record<SpendingCategory, string> = {
  Groceries:
    'https://images.unsplash.com/photo-1542838132-92c53300491e?w=120&h=120&fit=crop&crop=center',
  Household:
    'https://images.unsplash.com/photo-1585421514284-efb74c2b69bb?w=120&h=120&fit=crop&crop=center',
  Snacks:
    'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=120&h=120&fit=crop&crop=center',
  Beverages:
    'https://images.unsplash.com/photo-1544145945-f904253de820?w=120&h=120&fit=crop&crop=center',
};

export const DEFAULT_CATEGORY_IMAGE =
  'https://images.unsplash.com/photo-1542838132-92c53300491e?w=120&h=120&fit=crop&crop=center';

export function getCategoryImageUrl(category: string): string {
  if (category in CATEGORY_IMAGES) {
    return CATEGORY_IMAGES[category as SpendingCategory];
  }
  return DEFAULT_CATEGORY_IMAGE;
}
