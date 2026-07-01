import { memo } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Text } from '@/components/Themed';
import { StoreBrandAvatar } from '@/src/components/StoreBrandAvatar';
import type { Receipt } from '@/src/models/types';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';
import { formatDisplayDate } from '@/src/utils/dateParser';
import { formatCurrency } from '@/src/utils/priceParser';
import { getReceiptDisplayTotal } from '@/src/utils/receiptTotals';

type Props = {
  receipts: Receipt[];
  /** When viewing the household workspace, open receipt detail in workspace scope. */
  receiptScope?: 'personal' | 'workspace';
};

const MAX_VISIBLE_ROWS = 4;
const ROW_HEIGHT = 68;
const LIST_MAX_HEIGHT = MAX_VISIBLE_ROWS * ROW_HEIGHT;

function ReceiptRow({ receipt, onPress }: { receipt: Receipt; onPress: () => void }) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <StoreBrandAvatar store={receipt.storeName} variant="card" size={42} />
      <View style={styles.rowBody}>
        <Text style={styles.storeName} numberOfLines={1}>
          {receipt.storeName}
        </Text>
        <Text style={styles.date} numberOfLines={1}>
          {formatDisplayDate(receipt.date)}
        </Text>
      </View>
      <Text style={styles.total} numberOfLines={1}>
        {formatCurrency(getReceiptDisplayTotal(receipt))}
      </Text>
    </Pressable>
  );
}

export const RecentReceiptsCard = memo(function RecentReceiptsCard({
  receipts,
  receiptScope = 'personal',
}: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const openReceipt = (id: string) => {
    if (receiptScope === 'workspace') {
      router.push({ pathname: '/receipt/[id]', params: { id, scope: 'workspace' } });
      return;
    }
    router.push(`/receipt/${id}`);
  };
  const openAll = () => router.push('/(tabs)/receipts');

  const rows = receipts.map((receipt, index) => (
    <View key={receipt.id}>
      {index > 0 ? <View style={styles.divider} /> : null}
      <ReceiptRow receipt={receipt} onPress={() => openReceipt(receipt.id)} />
    </View>
  ));

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{t('receipts.recentTitle')}</Text>
        <Pressable onPress={openAll}>
          <Text style={styles.seeAll}>{t('common.viewAll')}</Text>
        </Pressable>
      </View>

      {receipts.length === 0 ? (
        <Text style={styles.empty}>{t('receipts.emptyTitle')}</Text>
      ) : receipts.length <= MAX_VISIBLE_ROWS ? (
        <View style={styles.list}>{rows}</View>
      ) : (
        <ScrollView
          style={styles.scrollList}
          contentContainerStyle={styles.list}
          nestedScrollEnabled
          showsVerticalScrollIndicator>
          {rows}
        </ScrollView>
      )}
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 15, fontWeight: '700', color: SmartCartColors.text },
  seeAll: { fontSize: 13, fontWeight: '600', color: SmartCartColors.primaryMid },
  empty: { fontSize: 12, color: SmartCartColors.textSecondary, textAlign: 'center', paddingVertical: 20 },
  list: { gap: 0 },
  scrollList: { maxHeight: LIST_MAX_HEIGHT, flexGrow: 0, flexShrink: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 8,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: SmartCartColors.border,
  },
  rowBody: { flex: 1, minWidth: 0 },
  storeName: { fontSize: 13, fontWeight: '700', color: SmartCartColors.text, letterSpacing: -0.1 },
  date: { fontSize: 11, color: SmartCartColors.textSecondary, marginTop: 2 },
  total: {
    flexShrink: 0,
    maxWidth: 72,
    fontSize: 13,
    fontWeight: '800',
    color: SmartCartColors.text,
    letterSpacing: -0.3,
    textAlign: 'right',
  },
});
