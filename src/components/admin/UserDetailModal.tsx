import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { formatDate, MOBILE_BREAKPOINT, TOUCH_TARGET } from '@/src/components/admin/utils';
import {
  banAdminUser,
  deleteAdminUser,
  fetchAdminUserDetail,
  unbanAdminUser,
  type AdminProfile,
  type AdminUserDetailResponse,
} from '@/src/services/admin/adminApiService';
import { AdminColors, AdminRadius, AdminShadow } from '@/src/theme/adminTheme';

type UserDetailModalProps = {
  userId: string | null;
  onClose: () => void;
  onUpdated: () => void;
};

function StatusBadge({ profile }: { profile: AdminProfile }) {
  if (profile.is_banned) {
    return <Text style={[styles.badge, styles.badgeDanger]}>Banned</Text>;
  }
  if (profile.role === 'admin') {
    return <Text style={[styles.badge, styles.badgeAdmin]}>Admin</Text>;
  }
  if (profile.subscription_status === 'active' || profile.subscription_status === 'trialing') {
    return <Text style={[styles.badge, styles.badgePro]}>Pro</Text>;
  }
  return <Text style={[styles.badge, styles.badgeMuted]}>Free</Text>;
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} selectable>
        {value}
      </Text>
    </View>
  );
}

export function UserDetailModal({ userId, onClose, onUpdated }: UserDetailModalProps) {
  const { width, height } = useWindowDimensions();
  const isMobile = width < MOBILE_BREAKPOINT;
  const modalMaxHeight = Math.min(height * 0.92, isMobile ? height - 24 : height * 0.9);
  const modalBodyMaxHeight = Math.min(height * (isMobile ? 0.72 : 0.65), 560);

  const [detail, setDetail] = useState<AdminUserDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [showBanForm, setShowBanForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    setError(null);
    try {
      const result = await fetchAdminUserDetail(id);
      setDetail(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load user detail.');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userId) {
      setDetail(null);
      setShowBanForm(false);
      setBanReason('');
      return;
    }
    void loadDetail(userId);
  }, [loadDetail, userId]);

  const handleBan = async () => {
    if (!userId) return;
    setActionLoading(true);
    try {
      await banAdminUser(userId, banReason);
      setShowBanForm(false);
      setBanReason('');
      await loadDetail(userId);
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not ban user.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnban = async () => {
    if (!userId) return;
    setActionLoading(true);
    try {
      await unbanAdminUser(userId);
      await loadDetail(userId);
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not unban user.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!userId || !detail?.profile.email) return;
    const confirmed =
      typeof window !== 'undefined'
        ? window.confirm(`Permanently delete ${detail.profile.email}? This cannot be undone.`)
        : false;
    if (!confirmed) return;

    setActionLoading(true);
    try {
      await deleteAdminUser(userId);
      onUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete user.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Modal visible={Boolean(userId)} animationType="fade" transparent onRequestClose={onClose}>
      <View style={[styles.backdrop, isMobile && styles.backdropMobile]}>
        <View style={[styles.card, { maxHeight: modalMaxHeight }, isMobile && styles.cardMobile]}>
          <View style={styles.header}>
            <Text style={styles.title}>User detail</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Text style={styles.close}>Close</Text>
            </Pressable>
          </View>

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {detailLoading || !detail ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={AdminColors.primary} />
            </View>
          ) : (
            <ScrollView
              style={{ maxHeight: modalBodyMaxHeight }}
              contentContainerStyle={styles.body}
              keyboardShouldPersistTaps="handled">
              <Text style={styles.email}>{detail.profile.email ?? detail.profile.id}</Text>
              <StatusBadge profile={detail.profile} />

              <View style={styles.grid}>
                <DetailItem label="User ID" value={detail.profile.id} />
                <DetailItem label="Signup date" value={formatDate(detail.profile.created_at)} />
                <DetailItem label="Last login" value={formatDate(detail.lastSignIn)} />
                <DetailItem label="Last seen" value={formatDate(detail.profile.last_seen_at)} />
                <DetailItem
                  label="Provider"
                  value={
                    typeof detail.providers === 'string'
                      ? detail.providers
                      : Array.isArray(detail.providers)
                        ? detail.providers.join(', ')
                        : detail.profile.signup_provider ?? '—'
                  }
                />
                <DetailItem label="Plan" value={detail.profile.plan_type ?? 'free'} />
                <DetailItem label="Subscription" value={detail.profile.subscription_status ?? 'none'} />
                <DetailItem label="Role" value={detail.profile.role} />
                {detail.profile.is_banned ? (
                  <DetailItem label="Ban reason" value={detail.profile.banned_reason ?? '—'} />
                ) : null}
              </View>

              <View style={[styles.actions, isMobile && styles.actionsMobile]}>
                {detail.profile.is_banned ? (
                  <Pressable
                    style={[styles.btn, styles.btnPrimary]}
                    disabled={actionLoading}
                    onPress={() => void handleUnban()}>
                    <Text style={styles.btnPrimaryText}>{actionLoading ? 'Working…' : 'Re-enable account'}</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    style={[styles.btn, styles.btnDangerOutline]}
                    disabled={actionLoading}
                    onPress={() => setShowBanForm((v) => !v)}>
                    <Text style={styles.btnDangerText}>Ban account</Text>
                  </Pressable>
                )}
                <Pressable
                  style={[styles.btn, styles.btnDanger]}
                  disabled={actionLoading}
                  onPress={() => void handleDelete()}>
                  <Text style={styles.btnDangerFilledText}>Delete user</Text>
                </Pressable>
              </View>

              {showBanForm && !detail.profile.is_banned ? (
                <View style={styles.banForm}>
                  <Text style={styles.banLabel}>Ban reason</Text>
                  <TextInput
                    value={banReason}
                    onChangeText={setBanReason}
                    placeholder="Reason for ban (optional)"
                    placeholderTextColor={AdminColors.textMuted}
                    style={styles.banInput}
                  />
                  <Pressable
                    style={[styles.btn, styles.btnDanger, actionLoading && styles.btnDisabled]}
                    disabled={actionLoading}
                    onPress={() => void handleBan()}>
                    <Text style={styles.btnDangerFilledText}>{actionLoading ? 'Banning…' : 'Confirm ban'}</Text>
                  </Pressable>
                </View>
              ) : null}

              <Text style={styles.auditTitle}>Recent audit events</Text>
              {detail.auditEvents.length === 0 ? (
                <Text style={styles.auditEmpty}>No audit events for this user.</Text>
              ) : (
                detail.auditEvents.map((event) => (
                  <View key={event.id} style={styles.auditRow}>
                    <Text style={styles.auditType}>{event.event_type}</Text>
                    <Text style={styles.auditDate}>{formatDate(event.created_at)}</Text>
                  </View>
                ))
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: AdminColors.modalBackdrop,
    justifyContent: 'center',
    padding: 20,
  },
  backdropMobile: { padding: 12, justifyContent: 'flex-end' },
  card: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 640,
    backgroundColor: AdminColors.surface,
    borderRadius: AdminRadius.lg,
    overflow: 'hidden',
    ...AdminShadow.card,
  },
  cardMobile: { maxWidth: '100%', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: AdminColors.border,
  },
  title: { fontSize: 18, fontWeight: '700', color: AdminColors.text },
  close: { color: AdminColors.primaryDark, fontWeight: '700' },
  errorBanner: {
    margin: 16,
    marginBottom: 0,
    backgroundColor: AdminColors.dangerBg,
    borderRadius: AdminRadius.md,
    padding: 10,
  },
  errorText: { color: AdminColors.danger, fontWeight: '600' },
  center: { padding: 32, alignItems: 'center' },
  body: { padding: 16, gap: 14 },
  email: { fontSize: 20, fontWeight: '800', color: AdminColors.text },
  grid: { gap: 10 },
  detailItem: { gap: 2 },
  detailLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: AdminColors.textSecondary,
    textTransform: 'uppercase',
  },
  detailValue: { fontSize: 14, color: AdminColors.text },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionsMobile: { flexDirection: 'column' },
  btn: {
    borderRadius: AdminRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
  },
  btnPrimary: { backgroundColor: AdminColors.primary },
  btnPrimaryText: { color: AdminColors.primaryText, fontWeight: '700' },
  btnDangerOutline: { borderWidth: 1, borderColor: AdminColors.danger },
  btnDangerText: { color: AdminColors.danger, fontWeight: '700' },
  btnDanger: { backgroundColor: AdminColors.danger },
  btnDangerFilledText: { color: AdminColors.primaryText, fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },
  banForm: {
    gap: 8,
    padding: 12,
    borderRadius: AdminRadius.md,
    backgroundColor: AdminColors.surfaceMuted,
    borderWidth: 1,
    borderColor: AdminColors.border,
  },
  banLabel: { fontSize: 13, fontWeight: '700', color: AdminColors.textSecondary },
  banInput: {
    borderWidth: 1,
    borderColor: AdminColors.border,
    borderRadius: AdminRadius.md,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'web' ? 10 : 8,
    fontSize: 14,
    color: AdminColors.text,
    minHeight: TOUCH_TARGET,
  },
  auditTitle: { fontSize: 15, fontWeight: '700', color: AdminColors.text, marginTop: 8 },
  auditEmpty: { fontSize: 13, color: AdminColors.textSecondary },
  auditRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: AdminColors.border,
    gap: 12,
  },
  auditType: { flex: 1, fontSize: 13, fontWeight: '600', color: AdminColors.text },
  auditDate: { fontSize: 12, color: AdminColors.textMuted },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
  },
  badgePro: { backgroundColor: AdminColors.successBg, color: AdminColors.success },
  badgeAdmin: { backgroundColor: '#EFF6FF', color: AdminColors.primaryDark },
  badgeDanger: { backgroundColor: AdminColors.dangerBg, color: AdminColors.danger },
  badgeMuted: { backgroundColor: AdminColors.surfaceMuted, color: AdminColors.textSecondary },
});
