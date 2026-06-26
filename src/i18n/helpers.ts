import type { TFunction } from 'i18next';

import type { GatedFeature } from '@/src/services/featureGateLogic';
import type { RobinhoodChartRange } from '@/src/utils/robinhoodSpendAnalytics';
import type { SpendingPeriod } from '@/src/utils/spendingPeriodAnalytics';

export function translateCategory(t: TFunction, category: string): string {
  const key = `categories.${category}`;
  const translated = t(key);
  return translated === key ? category : translated;
}

export function getSpendingPeriodOptions(t: TFunction) {
  return [
    { id: 'day' as SpendingPeriod, label: t('periods.day'), pillLabel: t('periods.today') },
    { id: 'week' as SpendingPeriod, label: t('periods.week'), pillLabel: t('periods.thisWeek') },
    { id: 'month' as SpendingPeriod, label: t('periods.month'), pillLabel: t('periods.thisMonth') },
    { id: 'year' as SpendingPeriod, label: t('periods.year'), pillLabel: t('periods.thisYear') },
  ];
}

export function getFeatureLabelI18n(t: TFunction, feature: GatedFeature): string {
  return t(`features.labels.${feature}`);
}

export function getRobinhoodComparisonLabel(t: TFunction, range: RobinhoodChartRange): string {
  return t(`chart.comparison.${range}`);
}

export type RobinhoodEmptyMessageKey = 'noReceipts' | 'noPeriod';

export function getRobinhoodEmptyMessage(t: TFunction, key: RobinhoodEmptyMessageKey): string {
  return t(`chart.empty.${key}`);
}
