import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { formatDate } from '@/src/components/admin/utils';
import {
  fetchAdminFeedback,
  updateAdminFeedbackStatus,
  type UserFeedbackEntry,
} from '@/src/services/admin/adminApiService';
import { AdminColors, AdminRadius } from '@/src/theme/adminTheme';

const STATUS_OPTIONS: Array<UserFeedbackEntry['status']> = ['open', 'reviewed', 'resolved'];

export function FeedbackView() {
  const [feedback, setFeedback] = useState<UserFeedbackEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAdminFeedback();
      setFeedback(result.feedback);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load feedback.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleStatus = async (id: string, status: UserFeedbackEntry['status']) => {
    setUpdatingId(id);
    try {
      await updateAdminFeedbackStatus(id, status);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update feedback.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>User Feedback</Text>
      <Text style={styles.subtitle}>In-app feedback submissions from Settings</Text>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.panel}>
        {loading ? (
          <ActivityIndicator color={AdminColors.primary} />
        ) : feedback.length === 0 ? (
          <Text style={styles.empty}>No feedback yet.</Text>
        ) : (
          feedback.map((entry) => (
            <View key={entry.id} style={styles.row}>
              <View style={styles.rowMain}>
                <Text style={styles.message}>{entry.message}</Text>
                <Text style={styles.meta}>
                  {entry.email ?? entry.user_id?.slice(0, 8) ?? 'Guest'} · {entry.category} ·{' '}
                  {entry.status}
                </Text>
                <Text style={styles.date}>{formatDate(entry.created_at)}</Text>
              </View>
              <View style={styles.actions}>
                {STATUS_OPTIONS.map((status) => (
                  <Pressable
                    key={status}
                    style={[
                      styles.statusBtn,
                      entry.status === status && styles.statusBtnActive,
                      updatingId === entry.id && styles.btnDisabled,
                    ]}
                    disabled={updatingId === entry.id}
                    onPress={() => void handleStatus(entry.id, status)}>
                    <Text
                      style={[
                        styles.statusBtnText,
                        entry.status === status && styles.statusBtnTextActive,
                      ]}>
                      {status}
                    </Text>
                  </Pressable>
                ))}
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
  rowMain: { flex: 1, gap: 6 },
  message: { fontSize: 14, color: AdminColors.text },
  meta: { fontSize: 12, color: AdminColors.textSecondary },
  date: { fontSize: 12, color: AdminColors.textMuted },
  actions: { gap: 6 },
  statusBtn: {
    borderWidth: 1,
    borderColor: AdminColors.border,
    borderRadius: AdminRadius.md,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  statusBtnActive: { backgroundColor: AdminColors.primary, borderColor: AdminColors.primary },
  statusBtnText: { fontSize: 11, fontWeight: '700', color: AdminColors.textSecondary },
  statusBtnTextActive: { color: AdminColors.primaryText },
  btnDisabled: { opacity: 0.5 },
});
