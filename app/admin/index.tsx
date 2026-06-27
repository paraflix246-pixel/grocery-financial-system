import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { PennyPantryLogo } from '@/src/components/PennyPantryLogo';
import {
  banAdminUser,
  deleteAdminUser,
  fetchAdminStats,
  fetchAdminUserDetail,
  fetchAdminUsers,
  unbanAdminUser,
  type AdminProfile,
  type AdminStats,
  type AdminUserDetailResponse,
} from '@/src/services/admin/adminApiService';
import { getSession } from '@/src/services/authService';
import { OnboardingColors } from '@/src/theme/onboardingTheme';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, accent ? { color: accent } : null]}>{value.toLocaleString()}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

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

export default function AdminDashboardScreen() {
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminUserDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [showBanForm, setShowBanForm] = useState(false);

  const limit = 20;
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsResult, usersResult] = await Promise.all([
        fetchAdminStats(),
        fetchAdminUsers({ search, page, limit }),
      ]);
      setStats(statsResult);
      setUsers(usersResult.users);
      setTotal(usersResult.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load admin dashboard.');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    void getSession().then((session) => {
      setAdminEmail(session?.user?.email ?? null);
    });
    void loadDashboard();
  }, [loadDashboard]);

  const openUserDetail = useCallback(async (userId: string) => {
    setSelectedUserId(userId);
    setDetail(null);
    setDetailLoading(true);
    setShowBanForm(false);
    setBanReason('');
    try {
      const result = await fetchAdminUserDetail(userId);
      setDetail(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load user detail.');
      setSelectedUserId(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const closeDetail = useCallback(() => {
    setSelectedUserId(null);
    setDetail(null);
    setShowBanForm(false);
    setBanReason('');
  }, []);

  const refreshAfterAction = useCallback(async () => {
    await loadDashboard();
    if (selectedUserId) {
      const result = await fetchAdminUserDetail(selectedUserId);
      setDetail(result);
    }
  }, [loadDashboard, selectedUserId]);

  const handleBan = useCallback(async () => {
    if (!selectedUserId) return;
    setActionLoading(true);
    try {
      await banAdminUser(selectedUserId, banReason);
      setShowBanForm(false);
      setBanReason('');
      await refreshAfterAction();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not ban user.');
    } finally {
      setActionLoading(false);
    }
  }, [banReason, refreshAfterAction, selectedUserId]);

  const handleUnban = useCallback(async () => {
    if (!selectedUserId) return;
    setActionLoading(true);
    try {
      await unbanAdminUser(selectedUserId);
      await refreshAfterAction();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not unban user.');
    } finally {
      setActionLoading(false);
    }
  }, [refreshAfterAction, selectedUserId]);

  const handleDelete = useCallback(async () => {
    if (!selectedUserId || !detail?.profile.email) return;
    const confirmed =
      typeof window !== 'undefined'
        ? window.confirm(`Permanently delete ${detail.profile.email}? This cannot be undone.`)
        : false;
    if (!confirmed) return;

    setActionLoading(true);
    try {
      await deleteAdminUser(selectedUserId);
      closeDetail();
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete user.');
    } finally {
      setActionLoading(false);
    }
  }, [closeDetail, detail?.profile.email, loadDashboard, selectedUserId]);

  if (Platform.OS !== 'web') {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Admin dashboard is available on web only.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      <View style={styles.hero}>
        <PennyPantryLogo variant="inline" size={40} showName />
        <View style={styles.heroText}>
          <Text style={styles.heroTitle}>CEO Control Panel</Text>
          <Text style={styles.heroSubtitle}>
            {adminEmail ? `Welcome, ${adminEmail}` : 'Platform oversight for Penny Pantry'}
          </Text>
        </View>
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
          <Pressable onPress={() => setError(null)}>
            <Text style={styles.dismissLink}>Dismiss</Text>
          </Pressable>
        </View>
      ) : null}

      {loading && !stats ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={SmartCartColors.primary} />
        </View>
      ) : (
        <>
          <View style={styles.statsRow}>
            <StatCard label="Total users" value={stats?.totalUsers ?? 0} />
            <StatCard label="Signups today" value={stats?.signupsToday ?? 0} accent={SmartCartColors.primaryDark} />
            <StatCard label="Pro subscribers" value={stats?.proCount ?? 0} accent={SmartCartColors.primaryDark} />
            <StatCard label="Banned" value={stats?.bannedCount ?? 0} accent={SmartCartColors.danger} />
          </View>

          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>User registry</Text>
              <View style={styles.searchRow}>
                <TextInput
                  value={searchInput}
                  onChangeText={setSearchInput}
                  placeholder="Search by email"
                  placeholderTextColor={SmartCartColors.textMuted}
                  style={styles.searchInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onSubmitEditing={() => {
                    setPage(1);
                    setSearch(searchInput.trim());
                  }}
                />
                <Pressable
                  style={styles.searchButton}
                  onPress={() => {
                    setPage(1);
                    setSearch(searchInput.trim());
                  }}>
                  <Text style={styles.searchButtonText}>Search</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHead]}>
                <Text style={[styles.cell, styles.cellEmail, styles.headText]}>Email</Text>
                <Text style={[styles.cell, styles.headText]}>Joined</Text>
                <Text style={[styles.cell, styles.headText]}>Last seen</Text>
                <Text style={[styles.cell, styles.headText]}>Status</Text>
              </View>

              {users.map((user) => (
                <Pressable key={user.id} style={styles.tableRow} onPress={() => void openUserDetail(user.id)}>
                  <Text style={[styles.cell, styles.cellEmail]} numberOfLines={1}>
                    {user.email ?? '(no email)'}
                  </Text>
                  <Text style={styles.cell}>{formatDate(user.created_at)}</Text>
                  <Text style={styles.cell}>{formatDate(user.last_seen_at)}</Text>
                  <View style={styles.cell}>
                    <StatusBadge profile={user} />
                  </View>
                </Pressable>
              ))}

              {users.length === 0 ? (
                <View style={styles.emptyRow}>
                  <Text style={styles.emptyText}>No users found.</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.pagination}>
              <Pressable
                style={[styles.pageButton, page <= 1 && styles.pageButtonDisabled]}
                disabled={page <= 1}
                onPress={() => setPage((p) => Math.max(1, p - 1))}>
                <Text style={styles.pageButtonText}>Previous</Text>
              </Pressable>
              <Text style={styles.pageInfo}>
                Page {page} of {totalPages} · {total.toLocaleString()} users
              </Text>
              <Pressable
                style={[styles.pageButton, page >= totalPages && styles.pageButtonDisabled]}
                disabled={page >= totalPages}
                onPress={() => setPage((p) => p + 1)}>
                <Text style={styles.pageButtonText}>Next</Text>
              </Pressable>
            </View>
          </View>
        </>
      )}

      <Modal visible={Boolean(selectedUserId)} animationType="fade" transparent onRequestClose={closeDetail}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>User detail</Text>
              <Pressable onPress={closeDetail} hitSlop={8}>
                <Text style={styles.closeButton}>Close</Text>
              </Pressable>
            </View>

            {detailLoading || !detail ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={SmartCartColors.primary} />
              </View>
            ) : (
              <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent}>
                <Text style={styles.detailEmail}>{detail.profile.email ?? detail.profile.id}</Text>
                <StatusBadge profile={detail.profile} />

                <View style={styles.detailGrid}>
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

                <View style={styles.actionRow}>
                  {detail.profile.is_banned ? (
                    <Pressable
                      style={[styles.actionButton, styles.actionPrimary]}
                      disabled={actionLoading}
                      onPress={() => void handleUnban()}>
                      <Text style={styles.actionPrimaryText}>{actionLoading ? 'Working…' : 'Re-enable account'}</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      style={[styles.actionButton, styles.actionDangerOutline]}
                      disabled={actionLoading}
                      onPress={() => setShowBanForm((v) => !v)}>
                      <Text style={styles.actionDangerText}>Ban account</Text>
                    </Pressable>
                  )}

                  <Pressable
                    style={[styles.actionButton, styles.actionDanger]}
                    disabled={actionLoading}
                    onPress={() => void handleDelete()}>
                    <Text style={styles.actionDangerFilledText}>Delete user</Text>
                  </Pressable>
                </View>

                {showBanForm && !detail.profile.is_banned ? (
                  <View style={styles.banForm}>
                    <Text style={styles.banLabel}>Ban reason</Text>
                    <TextInput
                      value={banReason}
                      onChangeText={setBanReason}
                      placeholder="Reason for ban (optional)"
                      placeholderTextColor={SmartCartColors.textMuted}
                      style={styles.banInput}
                    />
                    <Pressable
                      style={[styles.actionButton, styles.actionDanger, actionLoading && styles.pageButtonDisabled]}
                      disabled={actionLoading}
                      onPress={() => void handleBan()}>
                      <Text style={styles.actionDangerFilledText}>
                        {actionLoading ? 'Banning…' : 'Confirm ban'}
                      </Text>
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
    </ScrollView>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: OnboardingColors.background,
  },
  pageContent: {
    padding: 24,
    gap: 20,
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroText: {
    gap: 2,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: SmartCartColors.text,
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontSize: 15,
    color: SmartCartColors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flexGrow: 1,
    minWidth: 150,
    backgroundColor: OnboardingColors.card,
    borderRadius: SmartCartRadius.lg,
    borderWidth: 1,
    borderColor: OnboardingColors.border,
    padding: 18,
    ...SmartCartShadow.cardSoft,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: SmartCartColors.text,
  },
  statLabel: {
    marginTop: 4,
    fontSize: 13,
    color: SmartCartColors.textSecondary,
    fontWeight: '600',
  },
  panel: {
    backgroundColor: OnboardingColors.card,
    borderRadius: SmartCartRadius.lg,
    borderWidth: 1,
    borderColor: OnboardingColors.border,
    overflow: 'hidden',
    ...SmartCartShadow.card,
  },
  panelHeader: {
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: OnboardingColors.border,
    gap: 12,
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: SmartCartColors.text,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: OnboardingColors.border,
    borderRadius: SmartCartRadius.md,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'web' ? 10 : 8,
    fontSize: 15,
    color: SmartCartColors.text,
    backgroundColor: '#FFFFFF',
  },
  searchButton: {
    backgroundColor: SmartCartColors.primary,
    borderRadius: SmartCartRadius.md,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  table: {
    width: '100%',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: OnboardingColors.border,
    paddingHorizontal: 18,
    paddingVertical: 12,
    gap: 8,
  },
  tableHead: {
    backgroundColor: '#FAFAFA',
  },
  headText: {
    fontSize: 12,
    fontWeight: '700',
    color: SmartCartColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  cell: {
    flex: 1,
    fontSize: 14,
    color: SmartCartColors.text,
  },
  cellEmail: {
    flex: 2,
    fontWeight: '600',
  },
  badge: {
    alignSelf: 'flex-start',
    overflow: 'hidden',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: '700',
  },
  badgePro: {
    backgroundColor: SmartCartColors.badgeGreen,
    color: SmartCartColors.primaryDark,
  },
  badgeAdmin: {
    backgroundColor: '#EFF6FF',
    color: '#2563EB',
  },
  badgeDanger: {
    backgroundColor: '#FEF2F2',
    color: SmartCartColors.danger,
  },
  badgeMuted: {
    backgroundColor: '#F3F4F6',
    color: SmartCartColors.textSecondary,
  },
  emptyRow: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: SmartCartColors.textSecondary,
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    gap: 12,
  },
  pageButton: {
    borderWidth: 1,
    borderColor: OnboardingColors.border,
    borderRadius: SmartCartRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  pageButtonDisabled: {
    opacity: 0.45,
  },
  pageButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: SmartCartColors.text,
  },
  pageInfo: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    color: SmartCartColors.textSecondary,
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: SmartCartRadius.md,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  errorBannerText: {
    flex: 1,
    color: SmartCartColors.danger,
    fontSize: 14,
  },
  dismissLink: {
    color: SmartCartColors.primaryDark,
    fontWeight: '700',
    fontSize: 13,
  },
  errorText: {
    color: SmartCartColors.textSecondary,
    fontSize: 15,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 640,
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: SmartCartRadius.lg,
    overflow: 'hidden',
    ...SmartCartShadow.card,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: OnboardingColors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: SmartCartColors.text,
  },
  closeButton: {
    color: SmartCartColors.primaryDark,
    fontWeight: '700',
    fontSize: 14,
  },
  modalBody: {
    maxHeight: 560,
  },
  modalBodyContent: {
    padding: 20,
    gap: 14,
  },
  detailEmail: {
    fontSize: 20,
    fontWeight: '800',
    color: SmartCartColors.text,
  },
  detailGrid: {
    gap: 10,
  },
  detailItem: {
    gap: 2,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: SmartCartColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  detailValue: {
    fontSize: 14,
    color: SmartCartColors.text,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  actionButton: {
    borderRadius: SmartCartRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  actionPrimary: {
    backgroundColor: SmartCartColors.primary,
  },
  actionPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  actionDangerOutline: {
    borderWidth: 1,
    borderColor: SmartCartColors.danger,
    backgroundColor: '#FFFFFF',
  },
  actionDangerText: {
    color: SmartCartColors.danger,
    fontWeight: '700',
  },
  actionDanger: {
    backgroundColor: SmartCartColors.danger,
  },
  actionDangerFilledText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  banForm: {
    gap: 8,
    padding: 12,
    borderRadius: SmartCartRadius.md,
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: OnboardingColors.border,
  },
  banLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: SmartCartColors.textSecondary,
  },
  banInput: {
    borderWidth: 1,
    borderColor: OnboardingColors.border,
    borderRadius: SmartCartRadius.md,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'web' ? 10 : 8,
    fontSize: 14,
    color: SmartCartColors.text,
    backgroundColor: '#FFFFFF',
  },
  auditTitle: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: '700',
    color: SmartCartColors.text,
  },
  auditEmpty: {
    fontSize: 13,
    color: SmartCartColors.textSecondary,
  },
  auditRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: OnboardingColors.border,
  },
  auditType: {
    fontSize: 13,
    fontWeight: '600',
    color: SmartCartColors.text,
  },
  auditDate: {
    fontSize: 12,
    color: SmartCartColors.textMuted,
  },
});
