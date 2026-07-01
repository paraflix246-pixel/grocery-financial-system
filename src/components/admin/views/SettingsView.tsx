import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { formatDate } from '@/src/components/admin/utils';
import {
  downloadAdminExport,
  fetchAdminSettings,
  updateAdminSettings,
  type AdminExportType,
  type PlatformSettings,
} from '@/src/services/admin/adminApiService';
import { AdminColors, AdminRadius } from '@/src/theme/adminTheme';

const FEATURE_FLAG_KEYS = [
  { key: 'receipt_scanning_paused', label: 'Pause receipt scanning' },
  { key: 'price_compare_paused', label: 'Pause price compare' },
  { key: 'new_signups_paused', label: 'Pause new signups' },
] as const;

const EXPORT_TYPES: Array<{ key: AdminExportType; label: string }> = [
  { key: 'users', label: 'Users' },
  { key: 'subscriptions', label: 'Subscriptions' },
  { key: 'feedback', label: 'Feedback' },
  { key: 'receipts', label: 'Receipts' },
];

function stripeModeLabel(mode: PlatformSettings['stripeMode']): string {
  if (mode === 'test') return 'Test mode';
  if (mode === 'live') return 'Live mode';
  return 'Unknown';
}

function stripeModeStyle(mode: PlatformSettings['stripeMode']) {
  if (mode === 'test') return styles.stripeTest;
  if (mode === 'live') return styles.stripeLive;
  return styles.stripeUnknown;
}

export function SettingsView() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState<AdminExportType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [alertEmail, setAlertEmail] = useState('');
  const [alertSlackWebhook, setAlertSlackWebhook] = useState('');
  const [alertErrorRate, setAlertErrorRate] = useState('');
  const [alertPastDue, setAlertPastDue] = useState('');
  const [alertChurnRisk, setAlertChurnRisk] = useState('');

  const featureFlags = useMemo(
    () => settings?.featureFlags ?? {},
    [settings?.featureFlags]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminSettings();
      setSettings(data);
      setMaintenanceMessage(data.maintenanceMessage);
      setAlertEmail(data.alertSettings.email ?? '');
      setAlertSlackWebhook(data.alertSettings.slackWebhook ?? '');
      setAlertErrorRate(
        data.alertSettings.thresholds?.errorRatePercent != null
          ? String(data.alertSettings.thresholds.errorRatePercent)
          : ''
      );
      setAlertPastDue(
        data.alertSettings.thresholds?.pastDueCount != null
          ? String(data.alertSettings.thresholds.pastDueCount)
          : ''
      );
      setAlertChurnRisk(
        data.alertSettings.thresholds?.churnRiskCount != null
          ? String(data.alertSettings.thresholds.churnRiskCount)
          : ''
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (patch: Parameters<typeof updateAdminSettings>[0]) => {
    setSaving(true);
    setError(null);
    try {
      const data = await updateAdminSettings(patch);
      setSettings(data);
      setMaintenanceMessage(data.maintenanceMessage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save settings.');
    } finally {
      setSaving(false);
    }
  };

  const toggleFeatureFlag = async (key: (typeof FEATURE_FLAG_KEYS)[number]['key'], value: boolean) => {
    await save({
      featureFlags: {
        ...featureFlags,
        [key]: value,
      },
    });
  };

  const saveAlertSettings = async () => {
    await save({
      alertSettings: {
        email: alertEmail.trim() || undefined,
        slackWebhook: alertSlackWebhook.trim() || undefined,
        thresholds: {
          errorRatePercent: alertErrorRate.trim() ? Number(alertErrorRate) : undefined,
          pastDueCount: alertPastDue.trim() ? Number(alertPastDue) : undefined,
          churnRiskCount: alertChurnRisk.trim() ? Number(alertChurnRisk) : undefined,
        },
      },
    });
  };

  const handleExport = async (type: AdminExportType) => {
    setExporting(type);
    setError(null);
    try {
      await downloadAdminExport(type);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not export data.');
    } finally {
      setExporting(null);
    }
  };

  if (loading && !settings) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={AdminColors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Admin Settings</Text>
      <Text style={styles.subtitle}>Platform configuration that affects the live app</Text>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Maintenance mode</Text>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Show maintenance banner in app</Text>
          <Switch
            value={settings?.maintenanceMode ?? false}
            onValueChange={(value) => void save({ maintenanceMode: value })}
            trackColor={{ false: AdminColors.border, true: AdminColors.primary }}
            thumbColor={Platform.OS === 'android' ? AdminColors.surface : undefined}
            disabled={saving}
          />
        </View>
        <TextInput
          value={maintenanceMessage}
          onChangeText={setMaintenanceMessage}
          placeholder="Maintenance message"
          placeholderTextColor={AdminColors.textMuted}
          style={styles.input}
          multiline
        />
        <Pressable
          style={[styles.primaryBtn, saving && styles.btnDisabled]}
          disabled={saving}
          onPress={() => void save({ maintenanceMessage })}>
          <Text style={styles.primaryBtnText}>{saving ? 'Saving…' : 'Save message'}</Text>
        </Pressable>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Login gate</Text>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Disable logins (admins exempt)</Text>
          <Switch
            value={settings?.disableLogins ?? false}
            onValueChange={(value) => void save({ disableLogins: value })}
            trackColor={{ false: AdminColors.border, true: AdminColors.primary }}
            thumbColor={Platform.OS === 'android' ? AdminColors.surface : undefined}
            disabled={saving}
          />
        </View>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Feature flags</Text>
        {FEATURE_FLAG_KEYS.map((flag) => (
          <View key={flag.key} style={styles.switchRow}>
            <Text style={styles.switchLabel}>{flag.label}</Text>
            <Switch
              value={featureFlags[flag.key] === true}
              onValueChange={(value) => void toggleFeatureFlag(flag.key, value)}
              trackColor={{ false: AdminColors.border, true: AdminColors.primary }}
              thumbColor={Platform.OS === 'android' ? AdminColors.surface : undefined}
              disabled={saving}
            />
          </View>
        ))}
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Alert settings</Text>
        <TextInput
          value={alertEmail}
          onChangeText={setAlertEmail}
          placeholder="Alert email"
          placeholderTextColor={AdminColors.textMuted}
          style={styles.inputSingle}
          autoCapitalize="none"
        />
        <TextInput
          value={alertSlackWebhook}
          onChangeText={setAlertSlackWebhook}
          placeholder="Slack webhook URL"
          placeholderTextColor={AdminColors.textMuted}
          style={styles.inputSingle}
          autoCapitalize="none"
        />
        <View style={styles.thresholdRow}>
          <TextInput
            value={alertErrorRate}
            onChangeText={setAlertErrorRate}
            placeholder="Error rate %"
            placeholderTextColor={AdminColors.textMuted}
            style={[styles.inputSingle, styles.thresholdInput]}
            keyboardType="numeric"
          />
          <TextInput
            value={alertPastDue}
            onChangeText={setAlertPastDue}
            placeholder="Past due count"
            placeholderTextColor={AdminColors.textMuted}
            style={[styles.inputSingle, styles.thresholdInput]}
            keyboardType="numeric"
          />
          <TextInput
            value={alertChurnRisk}
            onChangeText={setAlertChurnRisk}
            placeholder="Churn risk count"
            placeholderTextColor={AdminColors.textMuted}
            style={[styles.inputSingle, styles.thresholdInput]}
            keyboardType="numeric"
          />
        </View>
        <Pressable
          style={[styles.primaryBtn, saving && styles.btnDisabled]}
          disabled={saving}
          onPress={() => void saveAlertSettings()}>
          <Text style={styles.primaryBtnText}>{saving ? 'Saving…' : 'Save alert settings'}</Text>
        </Pressable>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>CSV export</Text>
        <View style={styles.exportRow}>
          {EXPORT_TYPES.map((item) => (
            <Pressable
              key={item.key}
              style={[styles.exportBtn, exporting === item.key && styles.btnDisabled]}
              disabled={exporting !== null}
              onPress={() => void handleExport(item.key)}>
              <Text style={styles.exportBtnText}>
                {exporting === item.key ? 'Exporting…' : item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Admin allowlist</Text>
        {settings?.adminEmailsMasked.length ? (
          settings.adminEmailsMasked.map((email) => (
            <Text key={email} style={styles.listItem}>{email}</Text>
          ))
        ) : (
          <Text style={styles.muted}>No ADMIN_EMAILS configured on server.</Text>
        )}
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Integrations</Text>
        <View style={styles.integrationRow}>
          <Text style={styles.listItem}>
            Stripe · {settings?.stripeConfigured ? 'Configured' : 'Not configured'}
          </Text>
          {settings?.stripeConfigured ? (
            <Text style={[styles.stripeBadge, stripeModeStyle(settings.stripeMode)]}>
              {stripeModeLabel(settings.stripeMode)}
            </Text>
          ) : null}
        </View>
        <Text style={styles.listItem}>
          Resend · {settings?.resendConfigured ? 'Configured' : 'Not configured'}
        </Text>
        {settings?.updatedAt ? (
          <Text style={styles.muted}>Last updated · {formatDate(settings.updatedAt)}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 16 },
  center: { padding: 40, alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: AdminColors.text },
  subtitle: { fontSize: 13, color: AdminColors.textSecondary },
  errorBanner: {
    backgroundColor: AdminColors.dangerBg,
    borderWidth: 1,
    borderColor: AdminColors.dangerBorder,
    borderRadius: AdminRadius.md,
    padding: 12,
  },
  errorText: { color: AdminColors.danger, fontWeight: '600' },
  panel: {
    backgroundColor: AdminColors.surface,
    borderRadius: AdminRadius.lg,
    borderWidth: 1,
    borderColor: AdminColors.border,
    padding: 16,
    gap: 10,
  },
  panelTitle: { fontSize: 16, fontWeight: '700', color: AdminColors.text },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchLabel: { fontSize: 14, color: AdminColors.text, flex: 1, paddingRight: 12 },
  input: {
    borderWidth: 1,
    borderColor: AdminColors.border,
    borderRadius: AdminRadius.md,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'web' ? 10 : 8,
    fontSize: 15,
    color: AdminColors.text,
    minHeight: 72,
    textAlignVertical: 'top',
  },
  inputSingle: {
    borderWidth: 1,
    borderColor: AdminColors.border,
    borderRadius: AdminRadius.md,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'web' ? 10 : 8,
    fontSize: 15,
    color: AdminColors.text,
  },
  thresholdRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thresholdInput: { flex: 1, minWidth: 120 },
  primaryBtn: {
    backgroundColor: AdminColors.primary,
    borderRadius: AdminRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: AdminColors.primaryText, fontWeight: '700' },
  exportRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  exportBtn: {
    borderWidth: 1,
    borderColor: AdminColors.border,
    borderRadius: AdminRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: AdminColors.surfaceMuted,
  },
  exportBtnText: { fontWeight: '700', color: AdminColors.text, fontSize: 13 },
  listItem: { fontSize: 14, color: AdminColors.text },
  muted: { fontSize: 13, color: AdminColors.textMuted },
  integrationRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  stripeBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: '800',
    overflow: 'hidden',
  },
  stripeTest: { backgroundColor: AdminColors.warningBg, color: AdminColors.warning },
  stripeLive: { backgroundColor: AdminColors.successBg, color: AdminColors.success },
  stripeUnknown: { backgroundColor: AdminColors.surfaceMuted, color: AdminColors.textSecondary },
});
