import type { PantryItem } from '@/src/models/types';

import {
  addDaysToISO,
  daysBetweenISO,
  isValidISODate,
  normalizeReceiptDate,
  todayISO,
} from '@/src/utils/dateParser';



export type PantryStatus = 'in_stock' | 'running_low' | 'expiring_soon';



export const DEFAULT_LOW_STOCK_THRESHOLD = 3;

export const MAX_LOW_STOCK_THRESHOLD = 999;

export const LOW_STOCK_THRESHOLD_OPTIONS = [1, 2, 3, 5] as const;



export const EXPIRING_SOON_WINDOW_DAYS = 3;

export const SHELF_LIFE_OPTIONS = [3, 5, 7, 14, 30] as const;



const PERISHABLE_PATTERN =

  /milk|cheese|yogurt|egg|butter|banana|apple|orange|berry|fruit|vegetable|lettuce|tomato|bread|chicken|beef|pork|fish|meat|cream|salad/;



const PERISHABLE_CATEGORIES = new Set(['Dairy', 'Produce', 'Meat', 'Bakery', 'Frozen']);



function daysSince(isoDate: string): number {

  const then = new Date(`${normalizeReceiptDate(isoDate)}T12:00:00`);

  const now = new Date(`${todayISO()}T12:00:00`);

  return Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24));

}



export function isPerishableItem(item: Pick<PantryItem, 'name' | 'category'>): boolean {

  if (PERISHABLE_PATTERN.test(item.name.toLowerCase())) return true;

  return PERISHABLE_CATEGORIES.has(item.category);

}



export function inferDefaultShelfLifeDays(item: Pick<PantryItem, 'name' | 'category'>): number | null {

  if (!isPerishableItem(item)) return null;

  switch (item.category) {

    case 'Dairy':

      return 7;

    case 'Produce':

      return 5;

    case 'Meat':

      return 3;

    case 'Bakery':

      return 5;

    case 'Frozen':

      return 30;

    default:

      return 7;

  }

}



export function getLowStockThreshold(item: Pick<PantryItem, 'lowStockThreshold'>): number {

  return item.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD;

}



export function clampLowStockThreshold(value: number): number {

  return Math.min(MAX_LOW_STOCK_THRESHOLD, Math.max(1, Math.floor(value)));

}



export function parseLowStockThresholdInput(raw: string): number | null {

  const trimmed = raw.trim();

  if (!trimmed) return null;

  const parsed = parseInt(trimmed, 10);

  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > MAX_LOW_STOCK_THRESHOLD) return null;

  return parsed;

}



export function computeExpiresOnDate(addedDate: string, shelfLifeDays: number): string | null {

  if (shelfLifeDays <= 0) return null;

  return addDaysToISO(addedDate, shelfLifeDays);

}



export function computeShelfLifeDaysFromExpires(addedDate: string, expiresOn: string): number | null {

  if (!isValidISODate(expiresOn)) return null;

  const days = daysBetweenISO(addedDate, expiresOn);

  if (days < 0) return null;

  return days;

}



export function isRunningLowByQuantity(item: Pick<PantryItem, 'quantity' | 'lowStockThreshold'>): boolean {

  return item.quantity <= getLowStockThreshold(item);

}



/** Omitted = infer for perishables; 0 = no expiry; positive = explicit shelf life. */

export function getShelfLifeDays(item: Pick<PantryItem, 'name' | 'category' | 'shelfLifeDays'>): number | null {

  if (item.shelfLifeDays === 0) return null;

  if (item.shelfLifeDays != null && item.shelfLifeDays > 0) return item.shelfLifeDays;

  return inferDefaultShelfLifeDays(item);

}



export function getDaysUntilExpiry(

  item: Pick<PantryItem, 'name' | 'category' | 'shelfLifeDays' | 'addedDate'>

): number | null {

  const shelfLife = getShelfLifeDays(item);

  if (shelfLife == null) return null;

  return shelfLife - daysSince(item.addedDate);

}



export function isExpiringSoon(

  item: Pick<PantryItem, 'name' | 'category' | 'shelfLifeDays' | 'addedDate'>

): boolean {

  const daysLeft = getDaysUntilExpiry(item);

  if (daysLeft == null) return false;

  return daysLeft <= EXPIRING_SOON_WINDOW_DAYS;

}



export function formatExpiryStatusLabel(daysLeft: number): string {

  if (daysLeft < 0) return 'Expired';

  if (daysLeft === 0) return 'Expires today';

  if (daysLeft === 1) return 'Expires in 1 day';

  return `Expires in ${daysLeft} days`;

}



export function computePantryStatus(

  item: PantryItem

): { status: PantryStatus; statusLabel: string } {

  const daysLeft = getDaysUntilExpiry(item);

  if (daysLeft != null && daysLeft <= EXPIRING_SOON_WINDOW_DAYS) {

    return { status: 'expiring_soon', statusLabel: formatExpiryStatusLabel(daysLeft) };

  }

  if (isRunningLowByQuantity(item)) {

    return { status: 'running_low', statusLabel: `Running Low (${item.quantity} left)` };

  }

  return { status: 'in_stock', statusLabel: 'In Stock' };

}


