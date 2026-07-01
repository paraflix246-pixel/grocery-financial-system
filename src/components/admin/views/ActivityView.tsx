import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { formatDate } from '@/src/components/admin/utils';
import {
  fetchAdminActivity,
  type AdminAuditEvent,
} from '@/src/services/admin/adminApiService';
import { AdminColors, AdminRadius } from '@/src/theme/adminTheme';

const FILTER_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'user.banned', label: 'Bans' },
  { key: 'user.unbanned', label: 'Unbans' },
  { key: 'user.deleted', label: 'Deletes' },
  { key: 'receipt.parse.success', label: 'Receipt parse OK' },
  { key: 'receipt.parse.failed', label: 'Receipt parse fail' },
  { key: 'admin.re_engagement_email', label: 'Emails' },
  { key: 'user.feedback_submitted', label: 'Feedback' },
  { key: 'admin.settings_updated', label: 'Settings' },
];

export function ActivityView() {
  const [events, setEvents] = useState<AdminAuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [eventType, setEventType] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const limit = 30;
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAdminActivity({
        page,
        limit,
        eventType: eventType === 'all' ? undefined : eventType,
      });
      setEvents(result.events);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load activity.');
    } finally {
      setLoading(false);
    }
  }, [page, eventType]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Platform Activity</Text>
      <Text style={styles.subtitle}>Audit events — signups, bans, admin actions</Text>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.filters}>
        {FILTER_OPTIONS.map((opt) => {
          const active = eventType === opt.key;
          return (
            <Pressable
              key={opt.key}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => {
                setPage(1);
                setEventType(opt.key);
              }}>
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.panel}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={AdminColors.primary} />
          </View>
        ) : events.length === 0 ? (
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

      <View style={styles.pagination}>
        <Pressable
          style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
          disabled={page <= 1}
          onPress={() => setPage((p) => Math.max(1, p - 1))}>
          <Text style={styles.pageBtnText}>Previous</Text>
        </Pressable>
        <Text style={styles.pageInfo}>
          Page {page} of {totalPages} · {total.toLocaleString()} events
        </Text>
        <Pressable
          style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}
          disabled={page >= totalPages}
          onPress={() => setPage((p) => p + 1)}>
          <Text style={styles.pageBtnText}>Next</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  center: { padding: 32, alignItems: 'center' },
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
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: AdminColors.surfaceMuted,
  },
  filterChipActive: { backgroundColor: AdminColors.primary },
  filterText: { fontSize: 12, fontWeight: '700', color: AdminColors.textSecondary },
  filterTextActive: { color: AdminColors.primaryText },
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
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  pageBtn: {
    borderWidth: 1,
    borderColor: AdminColors.border,
    borderRadius: AdminRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  pageBtnDisabled: { opacity: 0.45 },
  pageBtnText: { fontWeight: '600', color: AdminColors.text },
  pageInfo: { flex: 1, textAlign: 'center', fontSize: 13, color: AdminColors.textSecondary },
});
