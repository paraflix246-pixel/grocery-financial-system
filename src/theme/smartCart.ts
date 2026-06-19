export const SmartCartColors = {
  primaryDark: '#16A34A',
  primary: '#22C55E',
  primaryMid: '#22C55E',
  primaryLight: '#4ADE80',
  primaryMuted: '#86EFAC',
  background: '#F5F5F7',
  card: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  accentOrange: '#F97316',
  accentPurple: '#A855F7',
  accentBlue: '#3B82F6',
  accentPink: '#EC4899',
  success: '#22C55E',
  danger: '#EF4444',
  badge: '#DCFCE7',
  badgeGreen: '#F0FDF4',
  bannerGreen: '#ECFDF5',
};

export const SmartCartShadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardSoft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  fab: {
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  pill: {
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
};

export const SmartCartRadius = {
  sm: 12,
  md: 16,
  lg: 20,
  pill: 999,
};

export const SmartCartTypography = {
  heading: { fontWeight: '600' as const, letterSpacing: -0.3 },
  title: { fontWeight: '700' as const, letterSpacing: -0.4 },
  display: { fontWeight: '800' as const, letterSpacing: -0.6 },
};

export const CATEGORY_COLORS: Record<string, string> = {
  Groceries: '#EC4899',
  Household: '#3B82F6',
  Snacks: '#F97316',
  Beverages: '#22C55E',
  Produce: '#84CC16',
  Dairy: '#06B6D4',
  Pantry: '#A855F7',
  Meat: '#EF4444',
  Bakery: '#F59E0B',
  Other: '#9CA3AF',
};

export function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function getStoreInitials(store: string): string {
  return store.slice(0, 1).toUpperCase();
}

export const STORE_COLORS: Record<string, string> = {
  Aldi: '#F57900',
  Walmart: '#0071CE',
  Target: '#CC0000',
  Costco: '#003087',
  Kroger: '#004B87',
};

export const STORE_BRAND: Record<string, { color: string; bg: string; label: string }> = {
  Aldi: { color: '#F57900', bg: '#FFF4E6', label: 'A' },
  Walmart: { color: '#0071CE', bg: '#E8F4FD', label: 'W' },
  Target: { color: '#CC0000', bg: '#FDECEC', label: 'T' },
  Costco: { color: '#003087', bg: '#E8EEF8', label: 'C' },
  Kroger: { color: '#004B87', bg: '#E8F0F8', label: 'K' },
};

export function mapToSpendingCategory(name: string): string {
  const lower = name.toLowerCase();
  if (/milk|cheese|yogurt|egg|butter|banana|apple|orange|berry|fruit|vegetable|lettuce|tomato|bread|bagel|chicken|beef|pork|fish|meat/.test(lower)) {
    return 'Groceries';
  }
  if (/paper|soap|detergent|clean|tissue|towel|household/.test(lower)) return 'Household';
  if (/chip|snack|candy|cookie|cracker/.test(lower)) return 'Snacks';
  if (/soda|juice|water|coffee|tea|beverage|drink/.test(lower)) return 'Beverages';
  return 'Groceries';
}
