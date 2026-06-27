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
  useWindowDimensions,
  View,
  type ViewStyle,
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
import { AdminColors, AdminRadius, AdminShadow } from '@/src/theme/adminTheme';

const MOBILE_BREAKPOINT = 480;
const COMPACT_BREAKPOINT = 640;
const TOUCH_TARGET = 44;

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

function StatCard({
  label,
  value,
  accent,
  style,
}: {
  label: string;
  value: number;
  accent?: string;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.statCard, style]}>
      <Text style={[styles.statValue, accent ? { color: accent } : null]}>{value.toLocaleString()}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function UserListCard({ user, onPress }: { user: AdminProfile; onPress: () => void }) {
  return (
    <Pressable style={styles.userCard} onPress={onPress}>
      <View style={styles.userCardHeader}>
        <Text style={styles.userCardEmail} numberOfLines={2}>
          {user.email ?? '(no email)'}
        </Text>
        <StatusBadge profile={user} />
      </View>
      <Text style={styles.userCardMeta}>Joined · {formatDate(user.created_at)}</Text>
      <Text style={styles.userCardMeta}>Last seen · {formatDate(user.last_seen_at)}</Text>
    </Pressable>
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
  const { width, height } = useWindowDimensions();
  const isMobile = width < MOBILE_BREAKPOINT;
  const isCompact = width < COMPACT_BREAKPOINT;
  const pagePadding = isMobile ? 16 : 24;
  const statCardStyle = useMemo<ViewStyle>(
    () =>
      isMobile
        ? { flexBasis: '47%', flexGrow: 0, minWidth: 0 }
        : isCompact
          ? { flexBasis: '47%', flexGrow: 0, minWidth: 0 }
          : { flexGrow: 1, minWidth: 150 },
    [isCompact, isMobile]
  );
  const modalMaxHeight = Math.min(height * 0.92, isMobile ? height - 24 : height * 0.9);
  const modalBodyMaxHeight = Math.min(height * (isMobile ? 0.72 : 0.65), 560);

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
    <ScrollView
      style={styles.page}
      contentContainerStyle={[styles.pageContent, { padding: pagePadding }]}
      keyboardShouldPersistTaps="handled">
      <View style={[styles.hero, isMobile && styles.heroMobile]}>
        <PennyPantryLogo
          variant="inline"
          size={isMobile ? 36 : 40}
          showName
          nameColor={AdminColors.text}
        />
        <View style={styles.heroText}>
          <Text style={[styles.heroTitle, isMobile && styles.heroTitleMobile]}>CEO Control Panel</Text>
          <Text style={styles.heroSubtitle} numberOfLines={isMobile ? 3 : 2}>
            {adminEmail ? `Welcome, ${adminEmail}` : 'Platform oversight for Penny Pantry'}
          </Text>
        </View>
      </View>

      {error ? (
        <View style={[styles.errorBanner, isMobile && styles.errorBannerMobile]}>
          <Text style={styles.errorBannerText}>{error}</Text>
          <Pressable onPress={() => setError(null)} style={styles.touchTarget}>
            <Text style={styles.dismissLink}>Dismiss</Text>
          </Pressable>
        </View>
      ) : null}

      {loading && !stats ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={AdminColors.primary} />
        </View>
      ) : (
        <>
          <View style={styles.statsRow}>
            <StatCard label="Total users" value={stats?.totalUsers ?? 0} style={statCardStyle} />
            <StatCard
              label="Signups today"
              value={stats?.signupsToday ?? 0}
              accent={AdminColors.primaryDark}
              style={statCardStyle}
            />
            <StatCard
              label="Pro subscribers"
              value={stats?.proCount ?? 0}
              accent={AdminColors.success}
              style={statCardStyle}
            />
            <StatCard
              label="Banned"
              value={stats?.bannedCount ?? 0}
              accent={AdminColors.danger}
              style={statCardStyle}
            />
          </View>

          <View style={styles.panel}>
            <View style={[styles.panelHeader, isMobile && styles.panelHeaderMobile]}>
              <Text style={styles.panelTitle}>User registry</Text>
              <View style={[styles.searchRow, isMobile && styles.searchRowMobile]}>
                <TextInput
                  value={searchInput}
                  onChangeText={setSearchInput}
                  placeholder="Search by email"
                  placeholderTextColor={AdminColors.textMuted}
                  style={[styles.searchInput, isMobile && styles.searchInputMobile]}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onSubmitEditing={() => {
                    setPage(1);
                    setSearch(searchInput.trim());
                  }}
                />
                <Pressable
                  style={[styles.searchButton, isMobile && styles.searchButtonMobile]}
                  onPress={() => {
                    setPage(1);
                    setSearch(searchInput.trim());
                  }}>
                  <Text style={styles.searchButtonText}>Search</Text>
                </Pressable>
              </View>
            </View>

            {isMobile ? (
              <View style={styles.userList}>
                {users.map((user) => (
                  <UserListCard key={user.id} user={user} onPress={() => void openUserDetail(user.id)} />
                ))}
                {users.length === 0 ? (
                  <View style={styles.emptyRow}>
                    <Text style={styles.emptyText}>No users found.</Text>
                  </View>
                ) : null}
              </View>
            ) : (
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
            )}

            <View style={[styles.pagination, isMobile && styles.paginationMobile]}>
              <Pressable
                style={[
                  styles.pageButton,
                  isMobile && styles.pageButtonMobile,
                  page <= 1 && styles.pageButtonDisabled,
                ]}
                disabled={page <= 1}
                onPress={() => setPage((p) => Math.max(1, p - 1))}>
                <Text style={styles.pageButtonText}>Previous</Text>
              </Pressable>
              <Text style={[styles.pageInfo, isMobile && styles.pageInfoMobile]}>
                Page {page} of {totalPages} · {total.toLocaleString()} users
              </Text>
              <Pressable
                style={[
                  styles.pageButton,
                  isMobile && styles.pageButtonMobile,
                  page >= totalPages && styles.pageButtonDisabled,
                ]}
                disabled={page >= totalPages}
                onPress={() => setPage((p) => p + 1)}>
                <Text style={styles.pageButtonText}>Next</Text>
              </Pressable>
            </View>
          </View>
        </>
      )}

      <Modal visible={Boolean(selectedUserId)} animationType="fade" transparent onRequestClose={closeDetail}>
        <View style={[styles.modalBackdrop, isMobile && styles.modalBackdropMobile]}>
          <View style={[styles.modalCard, { maxHeight: modalMaxHeight }, isMobile && styles.modalCardMobile]}>
            <View style={[styles.modalHeader, isMobile && styles.modalHeaderMobile]}>
              <Text style={styles.modalTitle}>User detail</Text>
              <Pressable onPress={closeDetail} hitSlop={8} style={styles.touchTarget}>
                <Text style={styles.closeButton}>Close</Text>
              </Pressable>
            </View>

            {detailLoading || !detail ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={AdminColors.primary} />
              </View>
            ) : (
              <ScrollView
                style={[styles.modalBody, { maxHeight: modalBodyMaxHeight }]}
                contentContainerStyle={[styles.modalBodyContent, isMobile && styles.modalBodyContentMobile]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator>
                <Text style={[styles.detailEmail, isMobile && styles.detailEmailMobile]}>
                  {detail.profile.email ?? detail.profile.id}
                </Text>
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

                <View style={[styles.actionRow, isMobile && styles.actionRowMobile]}>
                  {detail.profile.is_banned ? (
                    <Pressable
                      style={[styles.actionButton, styles.actionPrimary, isMobile && styles.actionButtonMobile]}
                      disabled={actionLoading}
                      onPress={() => void handleUnban()}>
                      <Text style={styles.actionPrimaryText}>{actionLoading ? 'Working…' : 'Re-enable account'}</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      style={[styles.actionButton, styles.actionDangerOutline, isMobile && styles.actionButtonMobile]}
                      disabled={actionLoading}
                      onPress={() => setShowBanForm((v) => !v)}>
                      <Text style={styles.actionDangerText}>Ban account</Text>
                    </Pressable>
                  )}

                  <Pressable
                    style={[styles.actionButton, styles.actionDanger, isMobile && styles.actionButtonMobile]}
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
                      placeholderTextColor={AdminColors.textMuted}
                      style={[styles.banInput, isMobile && styles.banInputMobile]}
                    />
                    <Pressable
                      style={[
                        styles.actionButton,
                        styles.actionDanger,
                        isMobile && styles.actionButtonMobile,
                        actionLoading && styles.pageButtonDisabled,
                      ]}
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
                    <View key={event.id} style={[styles.auditRow, isMobile && styles.auditRowMobile]}>
                      <Text style={[styles.auditType, isMobile && styles.auditTypeMobile]}>{event.event_type}</Text>
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
      <Text style={styles.detailValue} selectable>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: AdminColors.background,
  },
  pageContent: {
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
    width: '100%',
  },
  heroMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 10,
  },
  heroText: {
    gap: 2,
    flexShrink: 1,
    minWidth: 0,
    width: '100%',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: AdminColors.text,
    letterSpacing: -0.3,
  },
  heroTitleMobile: {
    fontSize: 20,
  },
  heroSubtitle: {
    fontSize: 15,
    color: AdminColors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    width: '100%',
  },
  statCard: {
    backgroundColor: AdminColors.surface,
    borderRadius: AdminRadius.lg,
    borderWidth: 1,
    borderColor: AdminColors.border,
    padding: 16,
    ...AdminShadow.cardSoft,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: AdminColors.text,
  },
  statLabel: {
    marginTop: 4,
    fontSize: 13,
    color: AdminColors.textSecondary,
    fontWeight: '600',
  },
  panel: {
    backgroundColor: AdminColors.surface,
    borderRadius: AdminRadius.lg,
    borderWidth: 1,
    borderColor: AdminColors.border,
    overflow: 'hidden',
    ...AdminShadow.card,
  },
  panelHeader: {
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: AdminColors.border,
    gap: 12,
  },
  panelHeaderMobile: {
    padding: 14,
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AdminColors.text,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  searchRowMobile: {
    flexDirection: 'column',
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: AdminColors.border,
    borderRadius: AdminRadius.md,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'web' ? 10 : 8,
    fontSize: 15,
    color: AdminColors.text,
    backgroundColor: AdminColors.surface,
    minHeight: TOUCH_TARGET,
  },
  searchInputMobile: {
    width: '100%',
    flex: undefined,
  },
  searchButton: {
    backgroundColor: AdminColors.primary,
    borderRadius: AdminRadius.md,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: TOUCH_TARGET,
  },
  searchButtonMobile: {
    width: '100%',
  },
  searchButtonText: {
    color: AdminColors.primaryText,
    fontWeight: '700',
    fontSize: 14,
  },
  table: {
    width: '100%',
  },
  userList: {
    width: '100%',
  },
  userCard: {
    borderBottomWidth: 1,
    borderBottomColor: AdminColors.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 6,
    backgroundColor: AdminColors.surface,
  },
  userCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  userCardEmail: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    fontWeight: '700',
    color: AdminColors.text,
  },
  userCardMeta: {
    fontSize: 13,
    color: AdminColors.textSecondary,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: AdminColors.border,
    paddingHorizontal: 18,
    paddingVertical: 12,
    gap: 8,
  },
  tableHead: {
    backgroundColor: AdminColors.surfaceMuted,
  },
  headText: {
    fontSize: 12,
    fontWeight: '700',
    color: AdminColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  cell: {
    flex: 1,
    fontSize: 14,
    color: AdminColors.text,
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
    backgroundColor: AdminColors.successBg,
    color: AdminColors.success,
  },
  badgeAdmin: {
    backgroundColor: '#EFF6FF',
    color: AdminColors.primaryDark,
  },
  badgeDanger: {
    backgroundColor: AdminColors.dangerBg,
    color: AdminColors.danger,
  },
  badgeMuted: {
    backgroundColor: AdminColors.surfaceMuted,
    color: AdminColors.textSecondary,
  },
  emptyRow: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: AdminColors.textSecondary,
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    gap: 12,
    width: '100%',
  },
  paginationMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    padding: 14,
  },
  pageButton: {
    borderWidth: 1,
    borderColor: AdminColors.border,
    borderRadius: AdminRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: AdminColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: TOUCH_TARGET,
  },
  pageButtonMobile: {
    width: '100%',
  },
  pageButtonDisabled: {
    opacity: 0.45,
  },
  pageButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: AdminColors.text,
  },
  pageInfo: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    color: AdminColors.textSecondary,
  },
  pageInfoMobile: {
    flex: undefined,
    width: '100%',
    paddingVertical: 4,
  },
  touchTarget: {
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  errorBanner: {
    backgroundColor: AdminColors.dangerBg,
    borderColor: AdminColors.dangerBorder,
    borderWidth: 1,
    borderRadius: AdminRadius.md,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  errorBannerMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  errorBannerText: {
    flex: 1,
    color: AdminColors.danger,
    fontSize: 14,
    fontWeight: '600',
  },
  dismissLink: {
    color: AdminColors.primaryDark,
    fontWeight: '700',
    fontSize: 13,
  },
  errorText: {
    color: AdminColors.textSecondary,
    fontSize: 15,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: AdminColors.modalBackdrop,
    justifyContent: 'center',
    padding: 20,
  },
  modalBackdropMobile: {
    padding: 12,
    justifyContent: 'flex-end',
  },
  modalCard: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 640,
    backgroundColor: AdminColors.surface,
    borderRadius: AdminRadius.lg,
    overflow: 'hidden',
    ...AdminShadow.card,
  },
  modalCardMobile: {
    maxWidth: '100%',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: AdminColors.border,
  },
  modalHeaderMobile: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AdminColors.text,
  },
  closeButton: {
    color: AdminColors.primaryDark,
    fontWeight: '700',
    fontSize: 14,
  },
  modalBody: {
    flexGrow: 0,
  },
  modalBodyContent: {
    padding: 20,
    gap: 14,
  },
  modalBodyContentMobile: {
    padding: 16,
    paddingBottom: 24,
  },
  detailEmail: {
    fontSize: 20,
    fontWeight: '800',
    color: AdminColors.text,
  },
  detailEmailMobile: {
    fontSize: 18,
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
    color: AdminColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  detailValue: {
    fontSize: 14,
    color: AdminColors.text,
    flexShrink: 1,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  actionRowMobile: {
    flexDirection: 'column',
  },
  actionButton: {
    borderRadius: AdminRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: TOUCH_TARGET,
  },
  actionButtonMobile: {
    width: '100%',
  },
  actionPrimary: {
    backgroundColor: AdminColors.primary,
  },
  actionPrimaryText: {
    color: AdminColors.primaryText,
    fontWeight: '700',
  },
  actionDangerOutline: {
    borderWidth: 1,
    borderColor: AdminColors.danger,
    backgroundColor: AdminColors.surface,
  },
  actionDangerText: {
    color: AdminColors.danger,
    fontWeight: '700',
  },
  actionDanger: {
    backgroundColor: AdminColors.danger,
  },
  actionDangerFilledText: {
    color: AdminColors.primaryText,
    fontWeight: '700',
  },
  banForm: {
    gap: 8,
    padding: 12,
    borderRadius: AdminRadius.md,
    backgroundColor: AdminColors.surfaceMuted,
    borderWidth: 1,
    borderColor: AdminColors.border,
  },
  banLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: AdminColors.textSecondary,
  },
  banInput: {
    borderWidth: 1,
    borderColor: AdminColors.border,
    borderRadius: AdminRadius.md,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'web' ? 10 : 8,
    fontSize: 14,
    color: AdminColors.text,
    backgroundColor: AdminColors.surface,
    minHeight: TOUCH_TARGET,
  },
  banInputMobile: {
    width: '100%',
  },
  auditTitle: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: '700',
    color: AdminColors.text,
  },
  auditEmpty: {
    fontSize: 13,
    color: AdminColors.textSecondary,
  },
  auditRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: AdminColors.border,
  },
  auditRowMobile: {
    flexDirection: 'column',
    gap: 4,
  },
  auditType: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: AdminColors.text,
  },
  auditTypeMobile: {
    flex: undefined,
  },
  auditDate: {
    fontSize: 12,
    color: AdminColors.textMuted,
  },
});
