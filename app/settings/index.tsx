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
import { signOut, getSession, getStoredUser } from '@/src/services/authService';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';
import {
  getOpenLastListPreference,
  setOpenLastListPreference,
} from '@/src/utils/listNavigationPrefs';
import {
  getEffectiveKrogerZipCode,
  getKrogerPricingZipCode,
  setKrogerPricingZipCode,
} from '@/src/utils/regionPreference';
import { getKrogerStatus } from '@/src/services/kroger/krogerClient';
import { DeleteAccountSheet } from '@/src/components/settings/DeleteAccountSheet';

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
  const [krogerConfigured, setKrogerConfigured] = useState<boolean | null>(null);
  const [effectiveKrogerZip, setEffectiveKrogerZip] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [devResetting, setDevResetting] = useState(false);
  const [devTierSwitching, setDevTierSwitching] = useState(false);
  const [deleteSheetVisible, setDeleteSheetVisible] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const tier = useSubscriptionStore((s) => s.tier);
  const subscriptionSource = useSubscriptionStore((s) => s.subscriptionSource);
  const upgradeToPro = useSubscriptionStore((s) => s.upgradeToPro);
  const downgradeToFree = useSubscriptionStore((s) => s.downgradeToFree);

  const load = useCallback(async () => {
    setLoading(true);
    const openLast = await getOpenLastListPreference();
    setOpenLastList(openLast);
    const [savedZip, effectiveZip, krogerStatus] = await Promise.all([
      getKrogerPricingZipCode(),
      getEffectiveKrogerZipCode(),
      getKrogerStatus(),
    ]);
    setKrogerZipCode(savedZip ?? '');
    setEffectiveKrogerZip(effectiveZip);
    setKrogerConfigured(krogerStatus.configured);
    await loadSettings();
    const s = useSettingsStore.getState().settings;
    if (s) {
      setDisplayName(s.displayName);
      setNotifyPriceAlerts(s.notifyPriceAlerts);
      setNotifyBudgetAlerts(s.notifyBudgetAlerts);
    }
    const storedUser = await getStoredUser();
    const session = await getSession();
    setIsGuest(Boolean(storedUser?.isGuest || !session?.user));
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
      } else {
        await upgradeToPro('monthly');
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

        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <Text style={styles.fieldHint}>
            {isGuest
              ? 'Remove all receipts, lists, and preferences stored on this device.'
              : 'Permanently delete your cloud account and clear local app data.'}
          </Text>
          <Pressable
            style={({ pressed }) => [styles.dangerBtn, pressed && styles.dangerBtnPressed]}
            onPress={() => setDeleteSheetVisible(true)}
            accessibilityRole="button"
            accessibilityLabel={isGuest ? 'Clear all local data' : 'Delete account'}
          >
            <Text style={styles.dangerBtnText}>
              {isGuest ? 'Clear all local data' : 'Delete account'}
            </Text>
          </Pressable>
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
            Live Kroger prices use your ZIP to find the nearest store.
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
                Current: {tier === 'free' ? 'Free' : 'Pro'}
                {subscriptionSource === 'trial' ? ' (trial)' : ''}
              </Text>
              <View style={styles.tierToggle}>
                {(['free', 'pro'] as const).map((option) => (
                  <Pressable
                    key={option}
                    style={[styles.tierBtn, tier === option && styles.tierBtnActive]}
                    onPress={() => handleDevTier(option)}
                    disabled={devTierSwitching}
                    accessibilityRole="button"
                    accessibilityLabel={`Set ${option === 'free' ? 'Free' : 'Pro'}`}
                  >
                    <Text style={[styles.tierBtnText, tier === option && styles.tierBtnTextActive]}>
                      {option === 'free' ? 'Free' : 'Pro'}
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

        <Text style={styles.sectionTitle}>Legal</Text>
        <View style={styles.menu}>
          <Pressable
            style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
            onPress={() => router.push('/privacy')}
            accessibilityRole="link"
            accessibilityLabel="Privacy Policy"
          >
            <View style={styles.menuIcon}>
              <SymbolView
                name={{ ios: 'hand.raised.fill', android: 'privacy_tip', web: 'privacy_tip' }}
                tintColor={SmartCartColors.primary}
                size={20}
              />
            </View>
            <View style={styles.menuText}>
              <Text style={styles.menuLabel}>Privacy Policy</Text>
              <Text style={styles.menuSub}>How we collect and use your data</Text>
            </View>
            <SymbolView
              name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
              tintColor={SmartCartColors.textMuted}
              size={16}
            />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
            onPress={() => router.push('/terms')}
            accessibilityRole="link"
            accessibilityLabel="Terms of Service"
          >
            <View style={styles.menuIcon}>
              <SymbolView
                name={{ ios: 'doc.text.fill', android: 'description', web: 'description' }}
                tintColor={SmartCartColors.primary}
                size={20}
              />
            </View>
            <View style={styles.menuText}>
              <Text style={styles.menuLabel}>Terms of Service</Text>
              <Text style={styles.menuSub}>Usage rules and subscription terms</Text>
            </View>
            <SymbolView
              name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
              tintColor={SmartCartColors.textMuted}
              size={16}
            />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
            onPress={() => router.push('/copyright')}
            accessibilityRole="link"
            accessibilityLabel="Copyright and DMCA Policy"
          >
            <View style={styles.menuIcon}>
              <SymbolView
                name={{ ios: 'c.circle.fill', android: 'copyright', web: 'copyright' }}
                tintColor={SmartCartColors.primary}
                size={20}
              />
            </View>
            <View style={styles.menuText}>
              <Text style={styles.menuLabel}>Copyright &amp; DMCA</Text>
              <Text style={styles.menuSub}>Report copyright infringement</Text>
            </View>
            <SymbolView
              name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
              tintColor={SmartCartColors.textMuted}
              size={16}
            />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
            onPress={() => router.push('/privacy-request')}
            accessibilityRole="link"
            accessibilityLabel="Privacy Requests"
          >
            <View style={styles.menuIcon}>
              <SymbolView
                name={{ ios: 'envelope.fill', android: 'mail', web: 'mail' }}
                tintColor={SmartCartColors.primary}
                size={20}
              />
            </View>
            <View style={styles.menuText}>
              <Text style={styles.menuLabel}>Privacy Requests</Text>
              <Text style={styles.menuSub}>Access, delete, or export your data</Text>
            </View>
            <SymbolView
              name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
              tintColor={SmartCartColors.textMuted}
              size={16}
            />
          </Pressable>
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

      <DeleteAccountSheet
        visible={deleteSheetVisible}
        onClose={() => setDeleteSheetVisible(false)}
      />
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
  dangerBtn: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: SmartCartRadius.sm,
    borderWidth: 1,
    borderColor: SmartCartColors.danger,
    alignItems: 'center',
  },
  dangerBtnPressed: { backgroundColor: `${SmartCartColors.danger}12` },
  dangerBtnText: { fontSize: 15, fontWeight: '700', color: SmartCartColors.danger },
});
