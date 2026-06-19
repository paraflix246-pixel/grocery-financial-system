import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import type { ComponentProps } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import { useSettingsStore } from '@/src/store/useSettingsStore';
import { refreshScheduledNotifications } from '@/src/services/notificationService';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

type MenuItem = {
  label: string;
  subtitle: string;
  icon: SymbolName;
  route: string;
};

const MENU_ITEMS: MenuItem[] = [
  {
    label: 'Budget',
    subtitle: 'Weekly limits & category budgets',
    icon: { ios: 'dollarsign.circle', android: 'payments', web: 'payments' },
    route: '/settings/budget',
  },
  {
    label: 'Stores',
    subtitle: 'Browse stores from your receipts',
    icon: { ios: 'storefront.fill', android: 'store', web: 'store' },
    route: '/stores',
  },
  {
    label: 'Price Alerts',
    subtitle: 'Price drops from receipt history',
    icon: { ios: 'bell.badge.fill', android: 'notifications_active', web: 'notifications_active' },
    route: '/price-alerts',
  },
];

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { settings, loadSettings, saveSettings } = useSettingsStore();
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [notifyPriceAlerts, setNotifyPriceAlerts] = useState(true);
  const [notifyBudgetAlerts, setNotifyBudgetAlerts] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    await loadSettings();
    const s = useSettingsStore.getState().settings;
    if (s) {
      setDisplayName(s.displayName);
      setNotifyPriceAlerts(s.notifyPriceAlerts);
      setNotifyBudgetAlerts(s.notifyBudgetAlerts);
    }
    setLoading(false);
  }, [loadSettings]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSettings({
        displayName: displayName.trim(),
        notifyPriceAlerts,
        notifyBudgetAlerts,
      });
      await refreshScheduledNotifications();
    } finally {
      setSaving(false);
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
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <SymbolView name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }} tintColor={SmartCartColors.text} size={22} />
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <Pressable onPress={handleSave} disabled={saving} hitSlop={8}>
          <Text style={styles.saveLink}>{saving ? '...' : 'Save'}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Profile</Text>
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Display name</Text>
          <Text style={styles.fieldHint}>Used in your home screen greeting</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your name"
            placeholderTextColor={SmartCartColors.textMuted}
            autoCapitalize="words"
          />
        </View>

        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Price alerts</Text>
              <Text style={styles.toggleHint}>Notify when item prices drop</Text>
            </View>
            <Switch
              value={notifyPriceAlerts}
              onValueChange={setNotifyPriceAlerts}
              trackColor={{ false: SmartCartColors.border, true: SmartCartColors.primaryMuted }}
              thumbColor="#fff"
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Budget alerts</Text>
              <Text style={styles.toggleHint}>Notify when approaching weekly limit</Text>
            </View>
            <Switch
              value={notifyBudgetAlerts}
              onValueChange={setNotifyBudgetAlerts}
              trackColor={{ false: SmartCartColors.border, true: SmartCartColors.primaryMuted }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.menu}>
          {MENU_ITEMS.map((item) => (
            <Pressable
              key={item.label}
              style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
              onPress={() => router.push(item.route as never)}>
              <View style={styles.menuIcon}>
                <SymbolView name={item.icon} tintColor={SmartCartColors.primary} size={20} />
              </View>
              <View style={styles.menuText}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuSub}>{item.subtitle}</Text>
              </View>
              <SymbolView
                name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                tintColor={SmartCartColors.textMuted}
                size={16}
              />
            </Pressable>
          ))}
        </View>
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
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', textAlign: 'center', color: SmartCartColors.text },
  saveLink: { fontSize: 16, fontWeight: '700', color: SmartCartColors.primary },
  content: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: SmartCartColors.text, marginBottom: 12, marginTop: 8 },
  card: {
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.md,
    padding: 16,
    marginBottom: 20,
    ...SmartCartShadow.card,
  },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: SmartCartColors.text },
  fieldHint: { fontSize: 12, color: SmartCartColors.textSecondary, marginTop: 2, marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    borderRadius: SmartCartRadius.sm,
    padding: 12,
    fontSize: 16,
    backgroundColor: SmartCartColors.background,
    color: SmartCartColors.text,
  },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  toggleInfo: { flex: 1 },
  toggleLabel: { fontSize: 15, fontWeight: '600', color: SmartCartColors.text },
  toggleHint: { fontSize: 12, color: SmartCartColors.textSecondary, marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: SmartCartColors.border, marginVertical: 14 },
  menu: { gap: 10 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.md,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    ...SmartCartShadow.cardSoft,
  },
  menuItemPressed: { backgroundColor: SmartCartColors.badge, borderColor: SmartCartColors.primary },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${SmartCartColors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: '700', color: SmartCartColors.text },
  menuSub: { fontSize: 12, color: SmartCartColors.textSecondary, marginTop: 2 },
});
