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
import { Text } from '@/components/Themed';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSettingsStore } from '@/src/store/useSettingsStore';
import {
  useSubscriptionStore,
  type SubscriptionTier,
} from '@/src/store/useSubscriptionStore';
import { refreshScheduledNotifications } from '@/src/services/notificationService';
import { signOut, getSession } from '@/src/services/authService';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';
import {
  getOpenLastListPreference,
  setOpenLastListPreference,
} from '@/src/utils/listNavigationPrefs';
import {
  getEffectiveKrogerZipCode,
  getKrogerLocationIdOverride,
  getKrogerPricingZipCode,
  setKrogerLocationIdOverride,
  setKrogerPricingZipCode,
} from '@/src/utils/regionPreference';
import { getKrogerStatus } from '@/src/services/kroger/krogerClient';

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
    label: 'Track & Alerts',
    subtitle: 'Watch items and set target-price alerts',
    icon: { ios: 'bell.badge.fill', android: 'notifications_active', web: 'notifications_active' },
    route: '/price-tracker?tab=alerts',
  },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { settings, loadSettings, saveSettings } = useSettingsStore();
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [notifyPriceAlerts, setNotifyPriceAlerts] = useState(true);
  const [notifyBudgetAlerts, setNotifyBudgetAlerts] = useState(true);
  const [openLastList, setOpenLastList] = useState(true);
  const [krogerZipCode, setKrogerZipCode] = useState('');
  const [krogerLocationId, setKrogerLocationId] = useState('');
  const [krogerConfigured, setKrogerConfigured] = useState<boolean | null>(null);
  const [effectiveKrogerZip, setEffectiveKrogerZip] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [devResetting, setDevResetting] = useState(false);
  const [devTierSwitching, setDevTierSwitching] = useState(false);
  const tier = useSubscriptionStore((s) => s.tier);
  const upgradeToPro = useSubscriptionStore((s) => s.upgradeToPro);
  const upgradeToHousehold = useSubscriptionStore((s) => s.upgradeToHousehold);
  const downgradeToFree = useSubscriptionStore((s) => s.downgradeToFree);

  const load = useCallback(async () => {
    setLoading(true);
    const openLast = await getOpenLastListPreference();
    setOpenLastList(openLast);
    const [savedZip, savedLocationId, effectiveZip, krogerStatus] = await Promise.all([
      getKrogerPricingZipCode(),
      getKrogerLocationIdOverride(),
      getEffectiveKrogerZipCode(),
      getKrogerStatus(),
    ]);
    setKrogerZipCode(savedZip ?? '');
    setKrogerLocationId(savedLocationId ?? '');
    setEffectiveKrogerZip(effectiveZip);
    setKrogerConfigured(krogerStatus.configured);
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

  const handleDevTier = async (target: SubscriptionTier) => {
    if (target === tier) return;
    setDevTierSwitching(true);
    try {
      if (target === 'free') {
        await downgradeToFree();
      } else if (target === 'pro') {
        await upgradeToPro('monthly');
      } else {
        await upgradeToHousehold('monthly');
      }
    } finally {
      setDevTierSwitching(false);
    }
  };

  const handleDevReset = async () => {
    setDevResetting(true);
    try {
      await AsyncStorage.removeItem('grocery_onboarding_complete');
      const session = await getSession();
      if (session) await signOut();
      router.replace('/onboarding' as never);
    } finally {
      setDevResetting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      await saveSettings({
        displayName: displayName.trim(),
        notifyPriceAlerts,
        notifyBudgetAlerts,
      });
      await refreshScheduledNotifications();
      await setOpenLastListPreference(openLastList);
      await setKrogerPricingZipCode(krogerZipCode.trim() || null);
      await setKrogerLocationIdOverride(krogerLocationId.trim() || null);
      setEffectiveKrogerZip(await getEffectiveKrogerZipCode());
      setSaveMessage('Saved');
    } catch {
      setSaveMessage('Could not save');
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
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.headerTitle}>Settings</Text>
        <Pressable onPress={handleSave} disabled={saving} hitSlop={8}>
          <Text style={styles.saveLink}>{saving ? '...' : saveMessage ?? 'Save'}</Text>
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
          <View style={styles.divider} />
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Open last list</Text>
              <Text style={styles.toggleHint}>Resume the shopping list you viewed last</Text>
            </View>
            <Switch
              value={openLastList}
              onValueChange={setOpenLastList}
              trackColor={{ false: SmartCartColors.border, true: SmartCartColors.primaryMuted }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Kroger pricing</Text>
        <View style={styles.card}>
          <View style={styles.statusRow}>
            <Text style={styles.fieldLabel}>Kroger API</Text>
            <Text
              style={[
                styles.statusBadge,
                krogerConfigured ? styles.statusConnected : styles.statusDisconnected,
              ]}>
              {krogerConfigured == null ? 'Checking…' : krogerConfigured ? 'Connected' : 'Not configured'}
            </Text>
          </View>
          <Text style={styles.fieldHint}>
            Live Kroger prices use your ZIP to find the nearest store when no location ID is set.
          </Text>
          <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>ZIP / postal code</Text>
          <TextInput
            style={styles.input}
            value={krogerZipCode}
            onChangeText={setKrogerZipCode}
            placeholder={effectiveKrogerZip ? `Using ${effectiveKrogerZip} from receipts` : 'e.g. 45202'}
            placeholderTextColor={SmartCartColors.textMuted}
            keyboardType="numbers-and-punctuation"
            autoCapitalize="characters"
          />
          <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>Location ID (optional)</Text>
          <Text style={styles.fieldHint}>Override nearest-store lookup with a specific Kroger location ID.</Text>
          <TextInput
            style={styles.input}
            value={krogerLocationId}
            onChangeText={setKrogerLocationId}
            placeholder="Kroger location ID"
            placeholderTextColor={SmartCartColors.textMuted}
            autoCapitalize="none"
          />
        </View>

        <Text style={styles.sectionTitle}>Receipt scanning</Text>
        <View style={styles.card}>
          <Text style={styles.infoText}>
            Receipts are scanned automatically. Scanning usually takes 15–45 seconds;
            long receipts can take up to 2 minutes. Every scan opens for review before it&apos;s saved.
          </Text>
        </View>

        {__DEV__ && (
          <>
            <Text style={styles.sectionTitle}>Developer</Text>
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>Subscription tier</Text>
              <Text style={styles.fieldHint}>
                Current: {tier === 'free' ? 'Free' : tier === 'pro' ? 'Pro' : 'Household'}
              </Text>
              <View style={styles.tierToggle}>
                {(['free', 'pro', 'household'] as const).map((option) => (
                  <Pressable
                    key={option}
                    style={[styles.tierBtn, tier === option && styles.tierBtnActive]}
                    onPress={() => handleDevTier(option)}
                    disabled={devTierSwitching}
                    accessibilityRole="button"
                    accessibilityLabel={`Set ${option === 'free' ? 'Free' : option === 'pro' ? 'Pro' : 'Household'}`}
                  >
                    <Text style={[styles.tierBtnText, tier === option && styles.tierBtnTextActive]}>
                      {option === 'free' ? 'Free' : option === 'pro' ? 'Pro' : 'Household'}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.divider} />
              <Pressable
                onPress={handleDevReset}
                disabled={devResetting}
                accessibilityRole="button"
                accessibilityLabel="Reset onboarding"
              >
                <Text style={styles.devResetText}>
                  {devResetting ? 'Resetting…' : 'Reset onboarding'}
                </Text>
              </Pressable>
            </View>
          </>
        )}

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
  headerSpacer: { width: 72 },
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
  fieldLabelSpaced: { marginTop: 14 },
  fieldHint: { fontSize: 12, color: SmartCartColors.textSecondary, marginTop: 2, marginBottom: 10 },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  statusBadge: { fontSize: 12, fontWeight: '700', paddingHorizontal: 10, paddingVertical: 4, borderRadius: SmartCartRadius.pill },
  statusConnected: { color: SmartCartColors.primaryMid, backgroundColor: `${SmartCartColors.primaryMid}18` },
  statusDisconnected: { color: SmartCartColors.textSecondary, backgroundColor: SmartCartColors.background },
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
  toggleNote: { fontSize: 12, color: SmartCartColors.danger, marginTop: 6, lineHeight: 17 },
  infoText: { fontSize: 14, color: SmartCartColors.textSecondary, lineHeight: 20 },
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
  devResetText: { fontSize: 13, color: SmartCartColors.textMuted, textAlign: 'center', paddingVertical: 4 },
  tierToggle: {
    flexDirection: 'row',
    backgroundColor: SmartCartColors.background,
    borderRadius: SmartCartRadius.sm,
    padding: 4,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
  },
  tierBtn: { flex: 1, paddingVertical: 8, borderRadius: SmartCartRadius.sm - 2, alignItems: 'center' },
  tierBtnActive: { backgroundColor: SmartCartColors.primary },
  tierBtnText: { fontSize: 13, fontWeight: '600', color: SmartCartColors.textSecondary },
  tierBtnTextActive: { color: '#fff' },
});
