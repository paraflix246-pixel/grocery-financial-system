import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import { Text } from '@/components/Themed';
import type { PriceAlert } from '@/src/services/analyticsService';
import { getAllPriceAlerts } from '@/src/services/priceAlertService';
import {
  deletePriceAlertRule,
  getDistinctItemNames,
  getPriceAlertRules,
  savePriceAlertRule,
} from '@/src/services/storageService';
import type { PriceAlertRule } from '@/src/models/types';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';
import { generateId } from '@/src/utils/id';
import { formatCurrency } from '@/src/utils/priceParser';

function PriceAlertRow({ alert }: { alert: PriceAlert }) {
  const isCustom = alert.source === 'custom';

  return (
    <View style={styles.alertRow}>
      <Text style={styles.alertEmoji}>{alert.emoji}</Text>
      <View style={styles.alertInfo}>
        <View style={styles.alertTitleRow}>
          <Text style={styles.alertName}>{alert.itemName}</Text>
          {isCustom && (
            <View style={styles.customBadge}>
              <Text style={styles.customBadgeText}>Your alert</Text>
            </View>
          )}
        </View>
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
            <Text style={styles.dropText}>
              {isCustom ? 'At target' : `↓ ${Math.round(alert.percentDrop)}%`}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function RuleRow({
  rule,
  onToggle,
  onEdit,
  onDelete,
}: {
  rule: PriceAlertRule;
  onToggle: (enabled: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={styles.ruleRow}>
      <View style={styles.ruleInfo}>
        <Text style={styles.ruleName}>{rule.itemName}</Text>
        <Text style={styles.ruleTarget}>Notify at {formatCurrency(rule.targetPrice)} or below</Text>
      </View>
      <Switch
        value={rule.enabled}
        onValueChange={onToggle}
        trackColor={{ false: SmartCartColors.border, true: SmartCartColors.primaryMuted }}
        thumbColor={rule.enabled ? SmartCartColors.primary : '#f4f3f4'}
      />
      <Pressable style={styles.ruleAction} onPress={onEdit} accessibilityLabel="Edit alert">
        <SymbolView
          name={{ ios: 'pencil', android: 'edit', web: 'edit' }}
          tintColor={SmartCartColors.textSecondary}
          size={18}
        />
      </Pressable>
      <Pressable style={styles.ruleAction} onPress={onDelete} accessibilityLabel="Delete alert">
        <SymbolView
          name={{ ios: 'trash', android: 'delete', web: 'delete' }}
          tintColor={SmartCartColors.danger}
          size={18}
        />
      </Pressable>
    </View>
  );
}

export default function PriceAlertsScreen() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [rules, setRules] = useState<PriceAlertRule[]>([]);
  const [itemSuggestions, setItemSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [itemName, setItemName] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [alertData, ruleData, names] = await Promise.all([
        getAllPriceAlerts(50),
        getPriceAlertRules(),
        getDistinctItemNames(),
      ]);
      setAlerts(alertData);
      setRules(ruleData);
      setItemSuggestions(names);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filteredSuggestions = useMemo(() => {
    const query = itemName.trim().toLowerCase();
    if (!query) return itemSuggestions.slice(0, 6);
    return itemSuggestions.filter((name) => name.toLowerCase().includes(query)).slice(0, 6);
  }, [itemName, itemSuggestions]);

  const resetForm = () => {
    setItemName('');
    setTargetPrice('');
    setEditingRuleId(null);
    setShowForm(false);
  };

  const openAddForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (rule: PriceAlertRule) => {
    setEditingRuleId(rule.id);
    setItemName(rule.itemName);
    setTargetPrice(rule.targetPrice.toFixed(2));
    setShowForm(true);
  };

  const confirmDelete = (rule: PriceAlertRule) => {
    const message = `Remove alert for "${rule.itemName}" at ${formatCurrency(rule.targetPrice)}?`;
    if (Platform.OS === 'web') {
      if (window.confirm(message)) {
        void deletePriceAlertRule(rule.id).then(load);
      }
      return;
    }
    Alert.alert('Delete alert', message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void deletePriceAlertRule(rule.id).then(load);
        },
      },
    ]);
  };

  const handleSaveRule = async () => {
    const trimmedName = itemName.trim();
    const price = parseFloat(targetPrice.replace(/[^0-9.]/g, ''));
    if (!trimmedName) {
      Alert.alert('Missing item', 'Enter an item name for your alert.');
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      Alert.alert('Invalid price', 'Enter a valid target price greater than zero.');
      return;
    }

    setSaving(true);
    try {
      await savePriceAlertRule({
        id: editingRuleId ?? generateId(),
        itemName: trimmedName,
        targetPrice: price,
        enabled: true,
      });
      resetForm();
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleToggleRule = async (rule: PriceAlertRule, enabled: boolean) => {
    await savePriceAlertRule({ ...rule, enabled });
    await load();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.headerTitle}>Price Alerts</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={SmartCartColors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.bellCard}>
            <View style={styles.bellIconWrap}>
              <SymbolView
                name={{ ios: 'bell.fill', android: 'notifications', web: 'notifications' }}
                tintColor={SmartCartColors.primary}
                size={28}
              />
            </View>
            <Text style={styles.bellTitle}>Notify me when price drops</Text>
            <Text style={styles.bellBody}>
              Set a target price for any item. We&apos;ll alert you when your receipt history shows it at or below that price.
            </Text>
            {!showForm && (
              <Pressable style={styles.ctaBtn} onPress={openAddForm}>
                <SymbolView name={{ ios: 'plus', android: 'add', web: 'add' }} tintColor="#fff" size={16} />
                <Text style={styles.ctaText}>Add price alert</Text>
              </Pressable>
            )}
          </View>

          {showForm && (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>{editingRuleId ? 'Edit alert' : 'New alert'}</Text>
              <Text style={styles.inputLabel}>Item name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Whole Milk"
                placeholderTextColor={SmartCartColors.textMuted}
                value={itemName}
                onChangeText={setItemName}
                autoCapitalize="words"
              />
              {filteredSuggestions.length > 0 && (
                <View style={styles.suggestions}>
                  {filteredSuggestions.map((name) => (
                    <Pressable key={name} style={styles.suggestionChip} onPress={() => setItemName(name)}>
                      <Text style={styles.suggestionText}>{name}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
              <Text style={styles.inputLabel}>Target price</Text>
              <View style={styles.priceInputRow}>
                <Text style={styles.currencyPrefix}>$</Text>
                <TextInput
                  style={[styles.input, styles.priceInput]}
                  placeholder="4.00"
                  placeholderTextColor={SmartCartColors.textMuted}
                  value={targetPrice}
                  onChangeText={setTargetPrice}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.formActions}>
                <Pressable style={styles.cancelBtn} onPress={resetForm}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.saveBtn} onPress={handleSaveRule} disabled={saving}>
                  <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save alert'}</Text>
                </Pressable>
              </View>
            </View>
          )}

          {rules.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your alerts ({rules.length})</Text>
              <View style={styles.listCard}>
                {rules.map((rule, index) => (
                  <View key={rule.id}>
                    {index > 0 && <View style={styles.divider} />}
                    <RuleRow
                      rule={rule}
                      onToggle={(enabled) => handleToggleRule(rule, enabled)}
                      onEdit={() => openEditForm(rule)}
                      onDelete={() => confirmDelete(rule)}
                    />
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {alerts.length > 0 ? `Active alerts (${alerts.length})` : 'Detected price drops'}
            </Text>
            {alerts.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No price drops yet</Text>
                <Text style={styles.emptyBody}>
                  {rules.length === 0
                    ? 'Add a custom alert above, or scan receipts over time to detect automatic price drops.'
                    : 'None of your alerts have been triggered yet. Keep scanning receipts — we compare prices automatically.'}
                </Text>
                {rules.length === 0 && (
                  <Pressable style={styles.secondaryBtn} onPress={openAddForm}>
                    <Text style={styles.secondaryBtnText}>Create your first alert</Text>
                  </Pressable>
                )}
              </View>
            ) : (
              <View style={styles.listCard}>
                {alerts.map((alert, index) => (
                  <View key={`${alert.itemName}-${alert.store}-${alert.ruleId ?? index}`}>
                    {index > 0 && <View style={styles.divider} />}
                    <PriceAlertRow alert={alert} />
                  </View>
                ))}
              </View>
            )}
          </View>

          <Pressable style={styles.historyLink} onPress={() => router.push('/(tabs)/receipts')}>
            <SymbolView name={{ ios: 'doc.text', android: 'receipt_long', web: 'receipt_long' }} tintColor={SmartCartColors.primary} size={18} />
            <Text style={styles.historyLinkText}>View receipt history</Text>
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SmartCartColors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', textAlign: 'center', color: SmartCartColors.text },
  headerSpacer: { width: 72 },
  content: { padding: 16, paddingBottom: 40 },
  bellCard: {
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.md,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    ...SmartCartShadow.card,
  },
  bellIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: SmartCartColors.badge,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  bellTitle: { fontSize: 18, fontWeight: '700', color: SmartCartColors.text, textAlign: 'center' },
  bellBody: {
    fontSize: 14,
    color: SmartCartColors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  ctaBtn: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: SmartCartColors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: SmartCartRadius.pill,
  },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  formCard: {
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.md,
    padding: 16,
    marginBottom: 16,
    ...SmartCartShadow.card,
  },
  formTitle: { fontSize: 16, fontWeight: '700', color: SmartCartColors.text, marginBottom: 12 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: SmartCartColors.textSecondary, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    borderRadius: SmartCartRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: SmartCartColors.text,
    backgroundColor: SmartCartColors.background,
    marginBottom: 12,
  },
  priceInputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  currencyPrefix: { fontSize: 18, fontWeight: '700', color: SmartCartColors.text, marginRight: 6 },
  priceInput: { flex: 1, marginBottom: 0 },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12, marginTop: -4 },
  suggestionChip: {
    backgroundColor: SmartCartColors.badge,
    borderRadius: SmartCartRadius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  suggestionText: { fontSize: 12, fontWeight: '600', color: SmartCartColors.primaryDark },
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
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: SmartCartColors.text, marginBottom: 10 },
  listCard: {
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.md,
    padding: 4,
    ...SmartCartShadow.card,
  },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
  ruleInfo: { flex: 1 },
  ruleName: { fontSize: 15, fontWeight: '700', color: SmartCartColors.text },
  ruleTarget: { fontSize: 12, color: SmartCartColors.textSecondary, marginTop: 2 },
  ruleAction: { padding: 6 },
  alertRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 12 },
  alertEmoji: { fontSize: 28, marginTop: 2 },
  alertInfo: { flex: 1 },
  alertTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  alertName: { fontSize: 15, fontWeight: '700', color: SmartCartColors.text },
  customBadge: {
    backgroundColor: SmartCartColors.badge,
    borderRadius: SmartCartRadius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  customBadgeText: { fontSize: 10, fontWeight: '700', color: SmartCartColors.primaryDark },
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
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: SmartCartColors.border, marginHorizontal: 12 },
  emptyCard: {
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.md,
    padding: 24,
    alignItems: 'center',
    ...SmartCartShadow.card,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: SmartCartColors.text },
  emptyBody: { fontSize: 14, color: SmartCartColors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  secondaryBtn: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: SmartCartRadius.pill,
    borderWidth: 1,
    borderColor: SmartCartColors.primary,
  },
  secondaryBtnText: { fontSize: 14, fontWeight: '600', color: SmartCartColors.primary },
  historyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    padding: 12,
  },
  historyLinkText: { fontSize: 15, fontWeight: '600', color: SmartCartColors.primary },
});
