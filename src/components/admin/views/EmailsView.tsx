import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { formatDate } from '@/src/components/admin/utils';
import { fetchAdminEmails, type EmailLogEntry } from '@/src/services/admin/adminApiService';
import { AdminColors, AdminRadius } from '@/src/theme/adminTheme';

export function EmailsView() {
  const [emails, setEmails] = useState<EmailLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAdminEmails();
      setEmails(result.emails);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load emails.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Email Log</Text>
      <Text style={styles.subtitle}>Welcome, password reset, and re-engagement sends</Text>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.panel}>
        {loading ? (
          <ActivityIndicator color={AdminColors.primary} />
        ) : emails.length === 0 ? (
          <Text style={styles.empty}>No emails logged yet.</Text>
        ) : (
          emails.map((entry) => (
            <View key={entry.id} style={styles.row}>
              <View style={styles.rowMain}>
                <Text style={styles.type}>{entry.email_type}</Text>
                <Text style={styles.email}>{entry.email ?? '—'}</Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.status}>{entry.status}</Text>
                <Text style={styles.date}>{formatDate(entry.created_at)}</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 16 },
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
    gap: 0,
  },
  empty: { color: AdminColors.textMuted, fontSize: 14 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: AdminColors.border,
  },
  rowMain: { flex: 1, gap: 4 },
  type: { fontSize: 14, fontWeight: '700', color: AdminColors.text },
  email: { fontSize: 13, color: AdminColors.textSecondary },
  rowRight: { alignItems: 'flex-end', gap: 4 },
  status: { fontSize: 12, fontWeight: '700', color: AdminColors.primaryDark },
  date: { fontSize: 12, color: AdminColors.textMuted },
});
