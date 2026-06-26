import { memo } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import { Text } from '@/components/Themed';
import { ItemEmojiAvatar } from '@/src/components/ItemEmojiAvatar';
import { getItemEmoji } from '@/src/data/commonGroceryItems';
import { type RuleWithCurrentPrice, type StorePriceQuote } from '@/src/services/priceAlertService';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';
import { formatCurrency } from '@/src/utils/priceParser';

type Props = {
  rules: RuleWithCurrentPrice[];
};

type AlertRowDisplay = {
  id: string;
  emoji: string;
  itemName: string;
  primaryStore: string;
  otherStores: StorePriceQuote[];
  currentPrice: number;
  targetPrice: number;
  atTarget: boolean;
  percentBelowTarget: number;
};

const MAX_VISIBLE_ROWS = 4;
const ROW_HEIGHT = 92;
const LIST_MAX_HEIGHT = MAX_VISIBLE_ROWS * ROW_HEIGHT;

function normalizeStoreKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+supercenter$/i, '').replace(/\s+/g, ' ');
}

function shortStoreName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length <= 18) return trimmed;
  return trimmed.split(' ')[0];
}

function buildAlertRows(rules: RuleWithCurrentPrice[]): AlertRowDisplay[] {
  return rules.filter((rule) => rule.enabled).map((rule) => {
    const emoji = rule.emoji ?? getItemEmoji(rule.canonicalName, rule.itemName);
    const displayName = rule.canonicalName ?? rule.itemName;
    const storePrices = rule.storePrices ?? [];
    const receiptPrices = storePrices.filter((quote) => quote.source === 'receipts');

    const latestReceipt =
      rule.currentPrice?.source === 'receipts'
        ? rule.currentPrice
        : receiptPrices.length > 0
          ? receiptPrices.reduce((latest, quote) =>
              (quote.observedAt ?? '') > (latest.observedAt ?? '') ? quote : latest
            )
          : null;

    const bestPrice = receiptPrices[0] ?? storePrices[0] ?? null;
    const currentPrice = bestPrice?.price ?? rule.currentPrice?.price ?? rule.targetPrice;
    const primaryStore =
      latestReceipt?.storeName ?? bestPrice?.storeName ?? rule.currentPrice?.storeName ?? 'Unknown store';
    const primaryKey = normalizeStoreKey(primaryStore);

    const otherStores = (receiptPrices.length > 0 ? receiptPrices : storePrices).filter(
      (quote) => normalizeStoreKey(quote.storeName) !== primaryKey
    );

    const atTarget = rule.status === 'at_target';
    const percentBelowTarget =
      atTarget && rule.targetPrice > 0
        ? ((rule.targetPrice - currentPrice) / rule.targetPrice) * 100
        : 0;

    return {
      id: rule.id,
      emoji,
      itemName: displayName,
      primaryStore,
      otherStores,
      currentPrice,
      targetPrice: rule.targetPrice,
      atTarget,
      percentBelowTarget,
    };
  });
}

function formatOtherStoresLine(stores: StorePriceQuote[]): string | null {
  if (stores.length === 0) return null;
  return stores
    .map((quote) => `${shortStoreName(quote.storeName)} ${formatCurrency(quote.price)}`)
    .join(' · ');
}

function AlertListRow({ row, t }: { row: AlertRowDisplay; t: TFunction }) {
  const otherStoresLine = formatOtherStoresLine(row.otherStores);

  return (
    <View style={styles.alertRow}>
      <ItemEmojiAvatar emoji={row.emoji} size="md" shape="square" />
      <View style={styles.alertInfo}>
        <Text style={styles.itemName} numberOfLines={1}>
          {row.itemName}
        </Text>
        <Text style={styles.storeName} numberOfLines={1}>
          {row.primaryStore}
        </Text>
        {otherStoresLine ? (
          <Text style={styles.extraStores} numberOfLines={1}>
            {t('common.also')}: {otherStoresLine}
          </Text>
        ) : null}
        <View style={styles.priceRow}>
          <Text style={styles.currentLabel}>{t('common.current')}:</Text>
          <Text style={styles.currentPrice}>{formatCurrency(row.currentPrice)}</Text>
          <Text style={styles.targetLabel}>{t('common.alertAt')}:</Text>
          <Text style={styles.targetPrice}>{formatCurrency(row.targetPrice)}</Text>
          {row.atTarget && row.percentBelowTarget >= 1 ? (
            <View style={styles.dropBadge}>
              <Text style={styles.dropText}>↓ {Math.round(row.percentBelowTarget)}%</Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function AlertList({
  rows,
  onPressRow,
  t,
}: {
  rows: AlertRowDisplay[];
  onPressRow: () => void;
  t: TFunction;
}) {
  const content = rows.map((row, index) => (
    <View key={row.id}>
      {index > 0 ? <View style={styles.divider} /> : null}
      <Pressable onPress={onPressRow}>
        <AlertListRow row={row} t={t} />
      </Pressable>
    </View>
  ));

  if (rows.length <= MAX_VISIBLE_ROWS) {
    return <View style={styles.list}>{content}</View>;
  }

  return (
    <ScrollView
      style={styles.scrollList}
      contentContainerStyle={styles.list}
      nestedScrollEnabled
      showsVerticalScrollIndicator>
      {content}
    </ScrollView>
  );
}

export const PriceAlertCard = memo(function PriceAlertCard({ rules }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const rows = buildAlertRows(rules);
  const openAlerts = () => router.push('/price-tracker?tab=alerts' as never);

  if (rows.length === 0) {
    return (
      <Pressable style={[styles.card, styles.emptyCard]} onPress={openAlerts}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{t('alerts.title')}</Text>
          <Text style={styles.seeAll}>{t('common.viewAll')}</Text>
        </View>
        <View style={styles.emptyBody}>
          <Text style={styles.emptyTitle}>{t('alerts.emptyTitle')}</Text>
          <Text style={styles.emptyText}>{t('alerts.emptyText')}</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <View style={styles.card}>
      <Pressable style={styles.headerRow} onPress={openAlerts}>
        <Text style={styles.title}>{t('alerts.title')}</Text>
        <Text style={styles.seeAll}>{t('common.viewAll')}</Text>
      </Pressable>
      <AlertList rows={rows} onPressRow={openAlerts} t={t} />
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    overflow: 'hidden',
    flexShrink: 0,
    ...SmartCartShadow.card,
  },
  emptyCard: { minHeight: 140, justifyContent: 'center' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: { fontSize: 15, fontWeight: '700', color: SmartCartColors.text },
  seeAll: { fontSize: 13, fontWeight: '600', color: SmartCartColors.primaryMid },
  emptyBody: { alignItems: 'center', gap: 6, paddingVertical: 8 },
  emptyTitle: { fontSize: 13, fontWeight: '700', color: SmartCartColors.text, textAlign: 'center' },
  emptyText: { fontSize: 12, color: SmartCartColors.textSecondary, textAlign: 'center' },
  list: { gap: 0 },
  scrollList: { maxHeight: LIST_MAX_HEIGHT, flexGrow: 0, flexShrink: 0 },
  alertRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10 },
  alertInfo: { flex: 1, minWidth: 0 },
  itemName: { fontSize: 14, fontWeight: '700', color: SmartCartColors.text, letterSpacing: -0.2 },
  storeName: { fontSize: 12, color: SmartCartColors.textSecondary, marginTop: 2 },
  extraStores: { fontSize: 10, color: SmartCartColors.textMuted, marginTop: 2, lineHeight: 14 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, flexWrap: 'wrap' },
  currentLabel: { fontSize: 11, color: SmartCartColors.textSecondary, fontWeight: '600' },
  currentPrice: { fontSize: 13, fontWeight: '800', color: SmartCartColors.text },
  targetLabel: { fontSize: 11, color: SmartCartColors.textSecondary, fontWeight: '600' },
  targetPrice: { fontSize: 12, fontWeight: '700', color: SmartCartColors.primaryMid },
  dropBadge: {
    backgroundColor: SmartCartColors.badge,
    borderRadius: SmartCartRadius.pill,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  dropText: { fontSize: 10, fontWeight: '700', color: SmartCartColors.primaryMid },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: SmartCartColors.border,
  },
});
