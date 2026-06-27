import { useCallback, useEffect, useState } from 'react';
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
  fetchAdminSettings,
  updateAdminSettings,
  type PlatformSettings,
} from '@/src/services/admin/adminApiService';
import { AdminColors, AdminRadius } from '@/src/theme/adminTheme';

export function SettingsView() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminSettings();
      setSettings(data);
      setMaintenanceMessage(data.maintenanceMessage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (patch: {
    maintenanceMode?: boolean;
    maintenanceMessage?: string;
  }) => {
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
        <Text style={styles.listItem}>
          Stripe · {settings?.stripeConfigured ? 'Configured' : 'Not configured'}
        </Text>
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
  switchLabel: { fontSize: 14, color: AdminColors.text, flex: 1 },
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
  primaryBtn: {
    backgroundColor: AdminColors.primary,
    borderRadius: AdminRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: AdminColors.primaryText, fontWeight: '700' },
  listItem: { fontSize: 14, color: AdminColors.text },
  muted: { fontSize: 13, color: AdminColors.textMuted },
});
