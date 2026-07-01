import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Text } from '@/components/Themed';
import { BackButton } from '@/src/components/BackButton';
import {
  PushNotificationSettings,
  type PushNotificationPrefs,
} from '@/src/components/settings/PushNotificationSettings';
import { PremiumScreenBackground } from '@/src/components/PremiumScreenBackground';
import { DEFAULT_NOTIFICATION_PREFS } from '@/src/services/notificationPreferenceLogic';
import { refreshScheduledNotifications } from '@/src/services/notificationService';
import { useSettingsStore } from '@/src/store/useSettingsStore';
import { SmartCartColors } from '@/src/theme/smartCart';
import { getScreenBottomPadding } from '@/src/utils/safeAreaLayout';

const DEFAULT_PREFS: PushNotificationPrefs = DEFAULT_NOTIFICATION_PREFS;

export default function NotificationSettingsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { settings, loading, loadSettings, saveSettings } = useSettingsStore();
  const [prefs, setPrefs] = useState<PushNotificationPrefs>(DEFAULT_PREFS);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (!settings) return;
    setPrefs({
      pushNotificationsEnabled: settings.pushNotificationsEnabled ?? true,
      notifyPriceAlerts: settings.notifyPriceAlerts,
      notifyPriceChangeAlerts: settings.notifyPriceChangeAlerts ?? true,
      notifySaleAlerts: settings.notifySaleAlerts ?? true,
      notifyCheaperStoreAlerts: settings.notifyCheaperStoreAlerts ?? true,
      notifyBudgetAlerts: settings.notifyBudgetAlerts,
      notifyWeeklySummaryAlerts: settings.notifyWeeklySummaryAlerts ?? false,
      notifyFamilyListAlerts: settings.notifyFamilyListAlerts ?? true,
      notifyPantryLowAlerts: settings.notifyPantryLowAlerts ?? false,
      notifyHouseholdReceiptAlerts: settings.notifyHouseholdReceiptAlerts ?? false,
    });
  }, [settings]);

  const persistPrefs = useCallback(
    async (patch: Partial<PushNotificationPrefs>) => {
      setPrefs((current) => ({ ...current, ...patch }));
      setSaving(true);
      setNotice(null);
      try {
        await saveSettings(patch);
        await refreshScheduledNotifications();
        setNotice(t('common.saved'));
      } catch {
        setNotice(t('common.saveFailed'));
      } finally {
        setSaving(false);
      }
    },
    [saveSettings, t],
  );

  if (loading && !settings) {
    return (
      <PremiumScreenBackground style={styles.center}>
        <ActivityIndicator size="large" color={SmartCartColors.primary} />
      </PremiumScreenBackground>
    );
  }

  return (
    <PremiumScreenBackground style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <BackButton showLabel={false} />
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>{t('settings.pushNotificationsTitle')}</Text>
          <Text style={styles.headerSubtitle}>{t('settings.pushNotificationsSubtitle')}</Text>
        </View>
        <Pressable disabled={saving} hitSlop={8}>
          <Text style={[styles.saveStatus, saving && styles.saveStatusDisabled]}>
            {saving ? '…' : notice ?? ' '}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: getScreenBottomPadding(insets.bottom, Platform.OS === 'web' ? 56 : 40) },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        showsVerticalScrollIndicator={Platform.OS === 'web'}>
        <PushNotificationSettings
          values={prefs}
          onChange={(patch) => void persistPrefs(patch)}
          showDevTests
        />
      </ScrollView>
      </KeyboardAvoidingView>
    </PremiumScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  headerTitleWrap: { flex: 1, alignItems: 'center' },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    color: SmartCartColors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: SmartCartColors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  saveStatus: {
    fontSize: 14,
    fontWeight: '600',
    color: SmartCartColors.primary,
    minWidth: 72,
    textAlign: 'right',
  },
  saveStatusDisabled: { opacity: 0.5 },
  content: { padding: 16 },
});
