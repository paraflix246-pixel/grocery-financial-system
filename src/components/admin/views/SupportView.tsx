import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { formatDate } from '@/src/components/admin/utils';
import { fetchAdminSupport, type SupportItem } from '@/src/services/admin/adminApiService';
import { AdminColors, AdminRadius } from '@/src/theme/adminTheme';

const TYPE_LABELS: Record<SupportItem['type'], string> = {
  feedback: 'Feedback',
  ban: 'Banned',
  privacy: 'Privacy',
};

export function SupportView() {
  const [items, setItems] = useState<SupportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAdminSupport();
      setItems(result.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load support items.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Support & Disputes</Text>
      <Text style={styles.subtitle}>Open feedback, banned accounts, and privacy-related events</Text>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.panel}>
        {loading ? (
          <ActivityIndicator color={AdminColors.primary} />
        ) : items.length === 0 ? (
          <Text style={styles.empty}>No support items yet.</Text>
        ) : (
          items.map((item) => (
            <View key={item.id} style={styles.row}>
              <View style={styles.rowMain}>
                <Text style={styles.badge}>{TYPE_LABELS[item.type]}</Text>
                <Text style={styles.summary}>{item.summary}</Text>
                <Text style={styles.meta}>
                  {item.email ?? item.userId?.slice(0, 8) ?? 'System'} · {item.status}
                </Text>
              </View>
              <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
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
  rowMain: { flex: 1, gap: 6 },
  badge: {
    fontSize: 11,
    fontWeight: '800',
    color: AdminColors.primaryDark,
    textTransform: 'uppercase',
  },
  summary: { fontSize: 14, color: AdminColors.text },
  meta: { fontSize: 12, color: AdminColors.textSecondary },
  date: { fontSize: 12, color: AdminColors.textMuted },
});
