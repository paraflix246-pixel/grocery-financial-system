export const MOBILE_BREAKPOINT = 768;
export const SIDEBAR_WIDTH = 240;
export const TOUCH_TARGET = 44;

export type AdminSection =
  | 'analytics'
  | 'health'
  | 'messages'
  | 'emails'
  | 'payments'
  | 'support'
  | 'users'
  | 'activity'
  | 'feedback'
  | 'settings';

export type LocaleFilter = 'all' | 'en' | 'es';

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatShortDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

export const ADMIN_NAV: Array<{
  key: AdminSection;
  label: string;
  badgeKey?: keyof AdminNavBadges;
}> = [
  { key: 'analytics', label: 'Analytics' },
  { key: 'health', label: 'Health' },
  { key: 'messages', label: 'Messages', badgeKey: 'messages' },
  { key: 'emails', label: 'Emails' },
  { key: 'payments', label: 'Payments' },
  { key: 'support', label: 'Support', badgeKey: 'support' },
  { key: 'users', label: 'Users' },
  { key: 'activity', label: 'Activity' },
  { key: 'feedback', label: 'Feedback' },
  { key: 'settings', label: 'Settings' },
];

export type AdminNavBadges = {
  messages: number;
  support: number;
};
