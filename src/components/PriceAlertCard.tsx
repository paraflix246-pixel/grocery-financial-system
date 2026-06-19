import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Text } from '@/components/Themed';
import { ItemEmojiAvatar } from '@/src/components/ItemEmojiAvatar';
import { getItemEmoji } from '@/src/data/commonGroceryItems';
import {
  formatPriceSourceLabel,
  formatRuleStatusLabel,
  type RuleWithCurrentPrice,
} from '@/src/services/priceAlertService';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';
import { formatDisplayDate } from '@/src/utils/dateParser';
import { formatCurrency } from '@/src/utils/priceParser';

type Props = {
  rules: RuleWithCurrentPrice[];
};

function statusBadgeStyle(status: RuleWithCurrentPrice['status']) {
  switch (status) {
    case 'at_target':
      return { bg: SmartCartColors.badge, text: SmartCartColors.primaryMid };
    case 'above_target':
      return { bg: '#FFF3E0', text: '#E65100' };
    case 'no_data':
      return { bg: SmartCartColors.background, text: SmartCartColors.textMuted };
  }
}

function RulePriceSummary({ rule }: { rule: RuleWithCurrentPrice }) {
  const emoji = rule.emoji ?? getItemEmoji(rule.canonicalName, rule.itemName);
  const badge = statusBadgeStyle(rule.status);
  const displayName = rule.canonicalName ?? rule.itemName;

  return (
    <>
      <ItemEmojiAvatar emoji={emoji} size="md" />
      <View style={styles.alertInfo}>
        <Text style={styles.itemName} numberOfLines={1}>
          {displayName}
        </Text>
        {rule.currentPrice ? (
          <View style={styles.priceRow}>
            <Text style={styles.currentLabel}>Current:</Text>
            <Text style={styles.currentPrice}>{formatCurrency(rule.currentPrice.price)}</Text>
            <Text style={styles.sourceLabel}>{formatPriceSourceLabel(rule.currentPrice.source)}</Text>
            <SymbolView
              name={{ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' }}
              tintColor={SmartCartColors.textMuted}
              size={12}
            />
            <Text style={styles.targetLabel}>Alert at:</Text>
            <Text style={styles.targetPrice}>{formatCurrency(rule.targetPrice)}</Text>
          </View>
        ) : (
          <View style={styles.priceRow}>
            <Text style={styles.noDataText}>No price data</Text>
            <SymbolView
              name={{ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' }}
              tintColor={SmartCartColors.textMuted}
              size={12}
            />
            <Text style={styles.targetLabel}>Alert at:</Text>
            <Text style={styles.targetPrice}>{formatCurrency(rule.targetPrice)}</Text>
          </View>
        )}
        {rule.currentPrice?.source === 'receipts' && rule.currentPrice.storeName && rule.currentPrice.observedAt && (
          <Text style={styles.metaText}>
            {rule.currentPrice.storeName} · {formatDisplayDate(rule.currentPrice.observedAt)}
          </Text>
        )}
        <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.statusText, { color: badge.text }]}>{formatRuleStatusLabel(rule.status)}</Text>
        </View>
      </View>
    </>
  );
}

export function PriceAlertCard({ rules }: Props) {
  const router = useRouter();
  const enabledRules = rules.filter((rule) => rule.enabled);
  const [index, setIndex] = useState(0);

  if (enabledRules.length === 0) {
    return (
      <Pressable style={[styles.card, styles.emptyCard]} onPress={() => router.push('/price-alerts')}>
        <View style={styles.emptyHeader}>
          <Text style={styles.title}>Price Alerts</Text>
          <SymbolView
            name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
            tintColor={SmartCartColors.textMuted}
            size={14}
          />
        </View>
        <View style={styles.emptyBody}>
          <View style={styles.bellWrap}>
            <SymbolView
              name={{ ios: 'bell.fill', android: 'notifications', web: 'notifications' }}
              tintColor={SmartCartColors.primary}
              size={22}
            />
          </View>
          <Text style={styles.emptyTitle}>Notify me when price drops</Text>
          <Text style={styles.emptyText}>Set alerts for items you buy often</Text>
        </View>
      </Pressable>
    );
  }

  const rule = enabledRules[index % enabledRules.length];
  const atTargetCount = enabledRules.filter((r) => r.status === 'at_target').length;

  return (
    <Pressable style={styles.card} onPress={() => router.push('/price-alerts')}>
      <View style={styles.cardHeader}>
        <Text style={styles.title}>Price Alerts</Text>
        <View style={styles.headerRight}>
          {atTargetCount > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{atTargetCount} at target</Text>
            </View>
          )}
          <SymbolView
            name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
            tintColor={SmartCartColors.textMuted}
            size={14}
          />
        </View>
      </View>
      <View style={styles.alertBody}>
        <RulePriceSummary rule={rule} />
      </View>
      {enabledRules.length > 1 && (
        <View style={styles.dots}>
          {enabledRules.slice(0, 4).map((_, i) => (
            <Pressable key={i} onPress={() => setIndex(i)}>
              <View style={[styles.dot, i === index % enabledRules.length && styles.dotActive]} />
            </Pressable>
          ))}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    ...SmartCartShadow.card,
  },
  emptyCard: { minHeight: 140, justifyContent: 'center' },
  emptyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 14, fontWeight: '700', color: SmartCartColors.text },
  countBadge: {
    backgroundColor: SmartCartColors.badge,
    borderRadius: SmartCartRadius.pill,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  countText: { fontSize: 10, fontWeight: '700', color: SmartCartColors.primaryDark },
  emptyBody: { alignItems: 'center', gap: 6 },
  bellWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: SmartCartColors.badge,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 13, fontWeight: '700', color: SmartCartColors.text, textAlign: 'center' },
  emptyText: { fontSize: 12, color: SmartCartColors.textSecondary, textAlign: 'center' },
  alertBody: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  alertInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '700', color: SmartCartColors.text, letterSpacing: -0.2 },
  priceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4, flexWrap: 'wrap' },
  currentLabel: { fontSize: 12, color: SmartCartColors.textSecondary, fontWeight: '600' },
  currentPrice: { fontSize: 15, fontWeight: '800', color: SmartCartColors.text, letterSpacing: -0.3 },
  sourceLabel: { fontSize: 10, fontWeight: '600', color: SmartCartColors.textMuted },
  targetLabel: { fontSize: 12, color: SmartCartColors.textSecondary, fontWeight: '600' },
  targetPrice: { fontSize: 14, fontWeight: '700', color: SmartCartColors.primaryMid, letterSpacing: -0.3 },
  noDataText: { fontSize: 12, color: SmartCartColors.textMuted, fontStyle: 'italic' },
  metaText: { fontSize: 11, color: SmartCartColors.textSecondary, marginTop: 4 },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: SmartCartRadius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 6,
  },
  statusText: { fontSize: 10, fontWeight: '700' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 12 },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: SmartCartColors.border,
  },
  dotActive: { backgroundColor: SmartCartColors.primaryMid, width: 16 },
});
