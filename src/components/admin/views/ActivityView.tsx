import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { formatDate } from '@/src/components/admin/utils';
import { fetchAdminStats, type AdminAuditEvent } from '@/src/services/admin/adminApiService';
import { AdminColors, AdminRadius } from '@/src/theme/adminTheme';

export function ActivityView() {
  const [events, setEvents] = useState<AdminAuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const stats = await fetchAdminStats();
      setEvents(stats.recentActivity);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={AdminColors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Platform Activity</Text>
      <Text style={styles.subtitle}>Recent audit events across Penny Pantry</Text>
      <View style={styles.panel}>
        {events.length === 0 ? (
          <Text style={styles.empty}>No audit events recorded yet.</Text>
        ) : (
          events.map((event) => (
            <View key={event.id} style={styles.row}>
              <View style={styles.rowMain}>
                <Text style={styles.eventType}>{event.event_type}</Text>
                <Text style={styles.meta}>
                  {event.target_user_id ? `User ${event.target_user_id.slice(0, 8)}…` : 'System'}
                </Text>
              </View>
              <Text style={styles.date}>{formatDate(event.created_at)}</Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  center: { padding: 40, alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: AdminColors.text },
  subtitle: { fontSize: 13, color: AdminColors.textSecondary },
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
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: AdminColors.border,
  },
  rowMain: { flex: 1, gap: 4 },
  eventType: { fontSize: 14, fontWeight: '700', color: AdminColors.text },
  meta: { fontSize: 12, color: AdminColors.textSecondary },
  date: { fontSize: 12, color: AdminColors.textMuted },
});
