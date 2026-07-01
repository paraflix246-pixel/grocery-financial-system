import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { HealthStatusDot } from '@/src/components/admin/HealthStatusDot';
import { formatDate } from '@/src/components/admin/utils';
import { fetchAdminHealth, type AdminHealthReport } from '@/src/services/admin/adminApiService';
import { AdminColors, AdminRadius } from '@/src/theme/adminTheme';

export function HealthView() {
  const [report, setReport] = useState<AdminHealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const load = useCallback(async () => {
    setError(null);
    try {
      setReport(await fetchAdminHealth());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load health report.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => void load(), 15_000);
    return () => clearInterval(timer);
  }, [autoRefresh, load]);

  if (loading && !report) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={AdminColors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>System Health</Text>
        <Text style={styles.subtitle}>Live connectivity and platform status</Text>
        <Pressable style={styles.refreshBtn} onPress={() => void load()}>
          <Text style={styles.refreshBtnText}>Refresh</Text>
        </Pressable>
        <View style={styles.autoRow}>
          <Text style={styles.autoLabel}>Auto-refresh (15s)</Text>
          <Switch
            value={autoRefresh}
            onValueChange={setAutoRefresh}
            trackColor={{ false: AdminColors.border, true: AdminColors.primary }}
            thumbColor={Platform.OS === 'android' ? AdminColors.surface : undefined}
          />
        </View>
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {report ? (
        <>
          <View style={styles.overallPanel}>
            <HealthStatusDot status={report.overall} />
            <Text style={styles.overallDetail}>
              {report.errors24h} errors in 24h · {report.errorRate24h}% error rate
            </Text>
          </View>

          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Service checks</Text>
            {report.checks.map((check) => (
              <View key={check.key} style={styles.checkRow}>
                <View style={styles.checkMain}>
                  <Text style={styles.checkLabel}>{check.label}</Text>
                  <Text style={styles.checkDetail}>{check.detail}</Text>
                </View>
                <HealthStatusDot status={check.status} />
              </View>
            ))}
          </View>

          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Deployment</Text>
            <Text style={styles.metaLine}>
              Environment · {report.deployEnv ?? 'unknown'}
            </Text>
            <Text style={styles.metaLine}>
              Commit · {report.deployCommit ? report.deployCommit.slice(0, 8) : '—'}
            </Text>
            <Text style={styles.metaLine}>
              Checked · {formatDate(report.lastDeployAt ?? new Date().toISOString())}
            </Text>
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 16 },
  center: { padding: 40, alignItems: 'center' },
  header: { gap: 6 },
  title: { fontSize: 18, fontWeight: '800', color: AdminColors.text },
  subtitle: { fontSize: 13, color: AdminColors.textSecondary },
  refreshBtn: {
    alignSelf: 'flex-start',
    marginTop: 8,
    borderWidth: 1,
    borderColor: AdminColors.border,
    borderRadius: AdminRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: AdminColors.surface,
  },
  refreshBtnText: { fontSize: 13, fontWeight: '700', color: AdminColors.text },
  autoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  autoLabel: { fontSize: 13, color: AdminColors.textSecondary, fontWeight: '600' },
  errorBanner: {
    backgroundColor: AdminColors.dangerBg,
    borderWidth: 1,
    borderColor: AdminColors.dangerBorder,
    borderRadius: AdminRadius.md,
    padding: 12,
  },
  errorText: { color: AdminColors.danger, fontWeight: '600' },
  overallPanel: {
    backgroundColor: AdminColors.surface,
    borderRadius: AdminRadius.lg,
    borderWidth: 1,
    borderColor: AdminColors.border,
    padding: 16,
    gap: 8,
  },
  overallDetail: { fontSize: 13, color: AdminColors.textSecondary },
  panel: {
    backgroundColor: AdminColors.surface,
    borderRadius: AdminRadius.lg,
    borderWidth: 1,
    borderColor: AdminColors.border,
    padding: 16,
    gap: 12,
  },
  panelTitle: { fontSize: 16, fontWeight: '700', color: AdminColors.text },
  checkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: AdminColors.border,
  },
  checkMain: { flex: 1, gap: 4 },
  checkLabel: { fontSize: 14, fontWeight: '700', color: AdminColors.text },
  checkDetail: { fontSize: 12, color: AdminColors.textSecondary },
  metaLine: { fontSize: 14, color: AdminColors.textSecondary },
});
