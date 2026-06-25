import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Text } from '@/components/Themed';
import { ItemPicker, TargetPricePicker } from '@/src/components/ItemPicker';
import { ItemEmojiAvatar } from '@/src/components/ItemEmojiAvatar';
import {
  MockupCard,
  MockupPrimaryButton,
  MockupTabs,
} from '@/src/components/mockup/MockupUI';
import { getItemEmoji } from '@/src/data/commonGroceryItems';
import type { PriceAlertRule } from '@/src/models/types';
import type { PriceAlert } from '@/src/services/analyticsService';
import type { ItemPickerSelection } from '@/src/services/itemPickerService';
import { resolveCanonicalName } from '@/src/services/itemNormalizationService';
import {
  getAllPriceAlerts,
  getEnabledRulesWithCurrentPrice,
  persistPriceAlertRule,
  type RuleWithCurrentPrice,
} from '@/src/services/priceAlertService';
import { deletePriceAlertRule } from '@/src/services/storageService';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';
import { confirmDestructiveAction } from '@/src/utils/confirmDelete';
import { generateId } from '@/src/utils/id';
import { formatCurrency } from '@/src/utils/priceParser';
import type { PriceAlertsFormRequest } from '@/src/utils/priceWatchTabParams';

type Props = {
  formRequest?: PriceAlertsFormRequest | null;
  onFormRequestHandled?: () => void;
  onRulesChanged?: () => void;
};

function ActiveRuleCard({
  rule,
  onToggle,
  onEdit,
  onDelete,
}: {
  rule: RuleWithCurrentPrice;
  onToggle: (enabled: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const emoji = rule.emoji ?? getItemEmoji(rule.canonicalName, rule.itemName);
  const displayName = rule.canonicalName ?? rule.itemName;
  const store = rule.storePrices?.[0]?.storeName ?? rule.currentPrice?.storeName ?? 'Any store';
  const wasPrice = rule.currentPrice?.price ?? rule.targetPrice * 1.15;
  const nowPrice = rule.targetPrice;
  const dropPct = wasPrice > 0 ? Math.round(((wasPrice - nowPrice) / wasPrice) * 100) : 0;

  return (
    <MockupCard style={styles.alertCard}>
      <View style={styles.alertRow}>
        <ItemEmojiAvatar emoji={emoji} size="md" shape="square" />
        <View style={styles.alertInfo}>
          <Text style={styles.alertName}>{displayName}</Text>
          <Text style={styles.alertStore}>{store}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.oldPrice}>{formatCurrency(wasPrice)}</Text>
            <SymbolView
              name={{ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' }}
              tintColor={SmartCartColors.textMuted}
              size={12}
            />
            <Text style={styles.newPrice}>{formatCurrency(nowPrice)}</Text>
            <View style={styles.dropBadge}>
              <Text style={styles.dropText}>↓ {Math.max(dropPct, 0)}%</Text>
            </View>
          </View>
        </View>
        <View style={styles.ruleActions}>
          <Switch
            value={rule.enabled}
            onValueChange={onToggle}
            trackColor={{ false: SmartCartColors.border, true: SmartCartColors.primaryMuted }}
            thumbColor={rule.enabled ? SmartCartColors.primary : '#f4f3f4'}
          />
          <Pressable style={styles.ruleAction} onPress={onEdit} accessibilityLabel="Edit alert">
            <SymbolView name={{ ios: 'pencil', android: 'edit', web: 'edit' }} tintColor={SmartCartColors.textSecondary} size={16} />
          </Pressable>
          <Pressable style={styles.ruleAction} onPress={onDelete} accessibilityLabel="Delete alert">
            <SymbolView name={{ ios: 'trash', android: 'delete', web: 'delete' }} tintColor={SmartCartColors.danger} size={16} />
          </Pressable>
        </View>
      </View>
    </MockupCard>
  );
}

function HistoryAlertCard({ alert }: { alert: PriceAlert }) {
  return (
    <MockupCard style={styles.alertCard}>
      <View style={styles.alertRow}>
        <ItemEmojiAvatar emoji={alert.emoji} size="md" shape="square" />
        <View style={styles.alertInfo}>
          <Text style={styles.alertName}>{alert.itemName}</Text>
          <Text style={styles.alertStore}>{alert.store}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.oldPrice}>{formatCurrency(alert.oldPrice)}</Text>
            <SymbolView
              name={{ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' }}
              tintColor={SmartCartColors.textMuted}
              size={12}
            />
            <Text style={styles.newPrice}>{formatCurrency(alert.newPrice)}</Text>
            <View style={styles.dropBadge}>
              <Text style={styles.dropText}>↓ {Math.round(alert.percentDrop)}%</Text>
            </View>
          </View>
        </View>
      </View>
    </MockupCard>
  );
}

export function PriceAlertsPanel({ formRequest, onFormRequestHandled, onRulesChanged }: Props) {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [rules, setRules] = useState<RuleWithCurrentPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');
  const [showForm, setShowForm] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [itemSelection, setItemSelection] = useState<ItemPickerSelection | null>(null);
  const [targetPrice, setTargetPrice] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [alertData, ruleData] = await Promise.all([
        getAllPriceAlerts(50),
        getEnabledRulesWithCurrentPrice(),
      ]);
      setAlerts(alertData);
      setRules(ruleData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = useCallback(() => {
    setItemSelection(null);
    setTargetPrice('');
    setEditingRuleId(null);
    setShowForm(false);
  }, []);

  const openAddForm = useCallback((prefill?: ItemPickerSelection) => {
    setEditingRuleId(null);
    setItemSelection(prefill ?? null);
    setTargetPrice(
      prefill?.suggestedTargetPrice != null ? prefill.suggestedTargetPrice.toFixed(2) : ''
    );
    setShowForm(true);
  }, []);

  const openEditForm = useCallback((rule: PriceAlertRule) => {
    setEditingRuleId(rule.id);
    setItemSelection({
      itemName: rule.itemName,
      canonicalName: rule.canonicalName ?? resolveCanonicalName(rule.itemName),
      emoji: rule.emoji ?? getItemEmoji(rule.canonicalName, rule.itemName),
    });
    setTargetPrice(rule.targetPrice.toFixed(2));
    setShowForm(true);
  }, []);

  useEffect(() => {
    if (!formRequest || loading) return;

    if (formRequest.type === 'edit') {
      const rule = rules.find((entry) => entry.id === formRequest.ruleId);
      if (rule) {
        openEditForm(rule);
        onFormRequestHandled?.();
      }
      return;
    }

    const canonical = formRequest.itemName
      ? resolveCanonicalName(formRequest.itemName) ?? formRequest.itemName
      : undefined;
    openAddForm(
      formRequest.itemName
        ? {
            itemName: formRequest.itemName,
            canonicalName: canonical,
            emoji: getItemEmoji(canonical, formRequest.itemName),
          }
        : undefined
    );
    onFormRequestHandled?.();
  }, [formRequest, loading, rules, openAddForm, openEditForm, onFormRequestHandled]);

  const confirmDelete = (rule: PriceAlertRule) => {
    confirmDestructiveAction({
      title: 'Delete alert?',
      message: `Remove alert for "${rule.canonicalName ?? rule.itemName}" at ${formatCurrency(rule.targetPrice)}. Are you sure?`,
      onConfirm: async () => {
        await deletePriceAlertRule(rule.id);
        await load();
        onRulesChanged?.();
      },
    });
  };

  const handleSaveRule = async () => {
    const trimmedName = itemSelection?.itemName.trim() ?? '';
    const price = parseFloat(targetPrice.replace(/[^0-9.]/g, ''));

    if (!trimmedName) {
      Alert.alert('Missing item', 'Select an item for your alert.');
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      Alert.alert('Invalid price', 'Enter a valid target price greater than zero.');
      return;
    }

    setSaving(true);
    try {
      const canonicalName =
        itemSelection?.canonicalName ?? resolveCanonicalName(trimmedName) ?? undefined;
      const emoji = itemSelection?.emoji ?? getItemEmoji(canonicalName, trimmedName);

      await persistPriceAlertRule({
        id: editingRuleId ?? generateId(),
        itemName: trimmedName,
        canonicalName,
        emoji,
        targetPrice: price,
        enabled: true,
      });

      resetForm();
      await load();
      onRulesChanged?.();
    } finally {
      setSaving(false);
    }
  };

  const handleToggleRule = async (rule: PriceAlertRule, enabled: boolean) => {
    await persistPriceAlertRule({ ...rule, enabled });
    await load();
    onRulesChanged?.();
  };

  const handleItemSelect = (selection: ItemPickerSelection) => {
    setItemSelection(selection);
    if (selection.suggestedTargetPrice != null && !targetPrice.trim()) {
      setTargetPrice(selection.suggestedTargetPrice.toFixed(2));
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={SmartCartColors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      <ScrollView contentContainerStyle={styles.content}>
        <MockupTabs
          tabs={[
            { id: 'active', label: 'Active' },
            { id: 'history', label: 'History' },
          ]}
          active={activeTab}
          onChange={setActiveTab}
        />

        {showForm ? (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>{editingRuleId ? 'Edit alert' : 'New alert'}</Text>
            <ItemPicker
              selection={itemSelection}
              onSelect={handleItemSelect}
              onClear={() => setItemSelection(null)}
            />
            <TargetPricePicker
              value={targetPrice}
              suggestedPrice={itemSelection?.suggestedTargetPrice}
              onChange={setTargetPrice}
            />
            <View style={styles.formActions}>
              <Pressable style={styles.cancelBtn} onPress={resetForm}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.saveBtn} onPress={handleSaveRule} disabled={saving}>
                <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save alert'}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {activeTab === 'active' ? (
          rules.length === 0 ? (
            <MockupCard>
              <Text style={styles.emptyTitle}>No active alerts</Text>
              <Text style={styles.emptyBody}>
                Tap Add Price Alert below to set target prices. Scan receipts to populate your watchlist.
              </Text>
            </MockupCard>
          ) : (
            rules.map((rule) => (
              <ActiveRuleCard
                key={rule.id}
                rule={rule}
                onToggle={(enabled) => handleToggleRule(rule, enabled)}
                onEdit={() => openEditForm(rule)}
                onDelete={() => confirmDelete(rule)}
              />
            ))
          )
        ) : alerts.length === 0 ? (
          <MockupCard>
            <Text style={styles.emptyTitle}>No price drops yet</Text>
            <Text style={styles.emptyBody}>
              History shows detected price drops from your receipts and alerts.
            </Text>
          </MockupCard>
        ) : (
          alerts.map((alert, index) => (
            <HistoryAlertCard key={`${alert.itemName}-${alert.store}-${alert.ruleId ?? index}`} alert={alert} />
          ))
        )}
      </ScrollView>

      {!showForm ? (
        <View style={styles.footer}>
          <MockupPrimaryButton label="Add Price Alert" icon="add" onPress={() => openAddForm()} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 200 },
  content: { padding: 16, paddingBottom: 100 },
  alertCard: { paddingVertical: 12 },
  alertRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  alertInfo: { flex: 1 },
  alertName: { fontSize: 15, fontWeight: '700', color: SmartCartColors.text },
  alertStore: { fontSize: 12, color: SmartCartColors.textSecondary, marginTop: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  oldPrice: { fontSize: 13, color: SmartCartColors.textMuted, textDecorationLine: 'line-through' },
  newPrice: { fontSize: 16, fontWeight: '800', color: SmartCartColors.primaryMid },
  dropBadge: {
    backgroundColor: SmartCartColors.badge,
    borderRadius: SmartCartRadius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  dropText: { fontSize: 11, fontWeight: '700', color: SmartCartColors.primaryMid },
  ruleActions: { alignItems: 'flex-end', gap: 4 },
  ruleAction: { padding: 4 },
  formCard: {
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.lg,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    ...SmartCartShadow.card,
  },
  formTitle: { fontSize: 16, fontWeight: '700', color: SmartCartColors.text, marginBottom: 12 },
  formActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: SmartCartRadius.pill,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    alignItems: 'center',
  },
  cancelText: { fontSize: 15, fontWeight: '600', color: SmartCartColors.textSecondary },
  saveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: SmartCartRadius.pill,
    backgroundColor: SmartCartColors.primary,
    alignItems: 'center',
  },
  saveText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: SmartCartColors.text, textAlign: 'center' },
  emptyBody: {
    fontSize: 14,
    color: SmartCartColors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  footer: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
  },
});
