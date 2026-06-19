import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import { CategoryBudgetRow } from '@/src/components/CategoryBudgetRow';
import { LinearProgressBar } from '@/src/components/LinearProgressBar';
import { getCategoryBudgets, getMonthlySpendAnalytics } from '@/src/services/analyticsService';
import { useBudgetStore } from '@/src/store/useBudgetStore';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';
import { formatCurrency } from '@/src/utils/priceParser';

export default function BudgetSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { settings, loadSettings, saveSettings } = useBudgetStore();
  const [loading, setLoading] = useState(true);
  const [monthlySpent, setMonthlySpent] = useState(0);
  const [categoryBudgets, setCategoryBudgets] = useState<Awaited<ReturnType<typeof getCategoryBudgets>>>([]);
  const [editing, setEditing] = useState(false);
  const [weeklyBudget, setWeeklyBudget] = useState('200');
  const [alertThreshold, setAlertThreshold] = useState('90');

  const monthlyBudget = (parseFloat(weeklyBudget) || 200) * 4;

  const load = useCallback(async () => {
    setLoading(true);
    await loadSettings();
    const s = useBudgetStore.getState().settings;
    if (s) {
      setWeeklyBudget(String(s.weeklyBudget));
      setAlertThreshold(String(Math.round(s.alertThreshold * 100)));
    }
    const budget = (s?.weeklyBudget ?? 200) * 4;
    const [analytics, budgets] = await Promise.all([
      getMonthlySpendAnalytics(),
      getCategoryBudgets(budget),
    ]);
    setMonthlySpent(analytics.monthlyTotal);
    setCategoryBudgets(budgets);
    setLoading(false);
  }, [loadSettings]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    const budget = parseFloat(weeklyBudget) || 200;
    const threshold = (parseFloat(alertThreshold) || 90) / 100;
    await saveSettings(budget, Math.min(Math.max(threshold, 0.5), 1));
    setEditing(false);
    await load();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={SmartCartColors.primary} />
      </View>
    );
  }

  const percent = monthlyBudget > 0 ? monthlySpent / monthlyBudget : 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <SymbolView name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }} tintColor={SmartCartColors.text} size={22} />
        </Pressable>
        <Text style={styles.headerTitle}>Budget</Text>
        <Pressable onPress={() => setEditing((e) => !e)}>
          <SymbolView name={{ ios: 'plus', android: 'add', web: 'add' }} tintColor={SmartCartColors.text} size={22} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.monthlyCard}>
          <View style={styles.monthlyHeader}>
            <Text style={styles.monthlyLabel}>Monthly Budget</Text>
            <Pressable onPress={() => setEditing(true)}>
              <Text style={styles.editLink}>Edit</Text>
            </Pressable>
          </View>
          <Text style={styles.monthlyAmount}>{formatCurrency(monthlyBudget)}</Text>
          <Text style={styles.spentText}>{formatCurrency(monthlySpent)} spent</Text>
          <LinearProgressBar percent={percent} height={10} />
          <Text style={styles.percentText}>{Math.round(percent * 100)}%</Text>
        </View>

        {editing && (
          <View style={styles.editCard}>
            <Text style={styles.editTitle}>Edit Budget</Text>
            <Text style={styles.fieldLabel}>Weekly Budget ($)</Text>
            <TextInput
              style={styles.input}
              value={weeklyBudget}
              onChangeText={setWeeklyBudget}
              keyboardType="decimal-pad"
            />
            <Text style={styles.fieldLabel}>Alert Threshold (%)</Text>
            <TextInput
              style={styles.input}
              value={alertThreshold}
              onChangeText={setAlertThreshold}
              keyboardType="number-pad"
            />
            <Pressable style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Save Settings</Text>
            </Pressable>
          </View>
        )}

        <Text style={styles.sectionTitle}>Budget by Category</Text>
        {categoryBudgets.map((cat) => (
          <CategoryBudgetRow key={cat.category} category={cat.category} spent={cat.spent} limit={cat.limit} />
        ))}
      </ScrollView>
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
  headerTitle: { flex: 1, fontSize: 28, fontWeight: '800', color: SmartCartColors.text },
  content: { padding: 16, paddingBottom: 40 },
  monthlyCard: {
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.md,
    padding: 20,
    marginBottom: 28,
    ...SmartCartShadow.card,
  },
  monthlyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  monthlyLabel: { fontSize: 14, color: SmartCartColors.textSecondary, fontWeight: '500' },
  editLink: { fontSize: 14, fontWeight: '600', color: SmartCartColors.primary },
  monthlyAmount: { fontSize: 36, fontWeight: '800', color: SmartCartColors.text, marginTop: 8, letterSpacing: -0.5 },
  spentText: { fontSize: 14, color: SmartCartColors.textSecondary, marginTop: 8, marginBottom: 12 },
  percentText: { fontSize: 13, fontWeight: '700', color: SmartCartColors.textSecondary, marginTop: 6, textAlign: 'right' },
  editCard: {
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.md,
    padding: 16,
    marginBottom: 24,
    gap: 8,
    ...SmartCartShadow.card,
  },
  editTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  fieldLabel: { fontSize: 13, color: SmartCartColors.textSecondary, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    borderRadius: SmartCartRadius.sm,
    padding: 12,
    fontSize: 16,
    backgroundColor: SmartCartColors.background,
    color: SmartCartColors.text,
  },
  saveBtn: {
    backgroundColor: SmartCartColors.primary,
    borderRadius: SmartCartRadius.sm,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: { color: '#fff', fontWeight: '700' },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: SmartCartColors.text, marginBottom: 16 },
});
