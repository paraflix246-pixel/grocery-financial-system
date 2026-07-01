import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { formatDate, MOBILE_BREAKPOINT, TOUCH_TARGET, type LocaleFilter } from '@/src/components/admin/utils';
import { fetchAdminUsers, type AdminProfile } from '@/src/services/admin/adminApiService';
import { AdminColors, AdminRadius } from '@/src/theme/adminTheme';

type UsersViewProps = {
  onSelectUser: (userId: string) => void;
  localeFilter?: LocaleFilter;
};

type TierFilter = 'all' | 'free' | 'pro' | 'family' | 'premium';
type RoleFilter = 'all' | 'admin' | 'user';
type BannedFilter = 'all' | 'banned' | 'active';
type SortBy = 'created_at' | 'last_seen_at' | 'email';

const TIER_OPTIONS: Array<{ key: TierFilter; label: string }> = [
  { key: 'all', label: 'All tiers' },
  { key: 'premium', label: 'Premium' },
  { key: 'pro', label: 'Pro' },
  { key: 'family', label: 'Family' },
  { key: 'free', label: 'Free' },
];

const ROLE_OPTIONS: Array<{ key: RoleFilter; label: string }> = [
  { key: 'all', label: 'All roles' },
  { key: 'admin', label: 'Admin' },
  { key: 'user', label: 'User' },
];

const BANNED_OPTIONS: Array<{ key: BannedFilter; label: string }> = [
  { key: 'all', label: 'All status' },
  { key: 'active', label: 'Active' },
  { key: 'banned', label: 'Banned' },
];

const SORT_OPTIONS: Array<{ key: SortBy; label: string }> = [
  { key: 'created_at', label: 'Joined' },
  { key: 'last_seen_at', label: 'Last seen' },
  { key: 'email', label: 'Email' },
];

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

function HealthBadge({ score }: { score?: number }) {
  const value = score ?? 0;
  const tone =
    value >= 70 ? styles.healthGood : value >= 40 ? styles.healthMid : styles.healthLow;
  return <Text style={[styles.healthBadge, tone]}>{value}</Text>;
}

export function UsersView({ onSelectUser, localeFilter = 'all' }: UsersViewProps) {
  const { width } = useWindowDimensions();
  const isMobile = width < MOBILE_BREAKPOINT;

  const [users, setUsers] = useState<AdminProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [tier, setTier] = useState<TierFilter>('all');
  const [role, setRole] = useState<RoleFilter>('all');
  const [banned, setBanned] = useState<BannedFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const limit = 20;
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAdminUsers({
        search,
        page,
        limit,
        tier,
        role,
        banned,
        sortBy,
        sortDir,
        locale: localeFilter,
      });
      setUsers(result.users);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load users.');
    } finally {
      setLoading(false);
    }
  }, [page, search, tier, role, banned, sortBy, sortDir, localeFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [localeFilter]);

  const runSearch = () => {
    setPage(1);
    setSearch(searchInput.trim());
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>User Registry</Text>
        <Text style={styles.subtitle}>Search, review, and manage Penny Pantry accounts</Text>
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.panel}>
        <View style={[styles.panelHeader, isMobile && styles.panelHeaderMobile]}>
          <View style={[styles.searchRow, isMobile && styles.searchRowMobile]}>
            <TextInput
              value={searchInput}
              onChangeText={setSearchInput}
              placeholder="Search by email"
              placeholderTextColor={AdminColors.textMuted}
              style={[styles.searchInput, isMobile && styles.searchInputMobile]}
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={runSearch}
            />
            <Pressable
              style={[styles.searchButton, isMobile && styles.searchButtonMobile]}
              onPress={runSearch}>
              <Text style={styles.searchButtonText}>Search</Text>
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <View style={styles.filterRow}>
              {TIER_OPTIONS.map((opt) => (
                <FilterChip
                  key={opt.key}
                  label={opt.label}
                  active={tier === opt.key}
                  onPress={() => {
                    setPage(1);
                    setTier(opt.key);
                  }}
                />
              ))}
            </View>
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <View style={styles.filterRow}>
              {ROLE_OPTIONS.map((opt) => (
                <FilterChip
                  key={opt.key}
                  label={opt.label}
                  active={role === opt.key}
                  onPress={() => {
                    setPage(1);
                    setRole(opt.key);
                  }}
                />
              ))}
              {BANNED_OPTIONS.map((opt) => (
                <FilterChip
                  key={opt.key}
                  label={opt.label}
                  active={banned === opt.key}
                  onPress={() => {
                    setPage(1);
                    setBanned(opt.key);
                  }}
                />
              ))}
            </View>
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <View style={styles.filterRow}>
              {SORT_OPTIONS.map((opt) => (
                <FilterChip
                  key={opt.key}
                  label={`Sort · ${opt.label}`}
                  active={sortBy === opt.key}
                  onPress={() => {
                    setPage(1);
                    if (sortBy === opt.key) {
                      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'));
                    } else {
                      setSortBy(opt.key);
                      setSortDir('desc');
                    }
                  }}
                />
              ))}
              <Text style={styles.sortDirLabel}>{sortDir === 'asc' ? '↑ Asc' : '↓ Desc'}</Text>
            </View>
          </ScrollView>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={AdminColors.primary} />
          </View>
        ) : isMobile ? (
          <View>
            {users.map((user) => (
              <Pressable key={user.id} style={styles.userCard} onPress={() => onSelectUser(user.id)}>
                <View style={styles.userCardHeader}>
                  <Text style={styles.userCardEmail} numberOfLines={2}>
                    {user.email ?? '(no email)'}
                  </Text>
                  <View style={styles.userCardBadges}>
                    <HealthBadge score={user.healthScore} />
                    <StatusBadge profile={user} />
                  </View>
                </View>
                <Text style={styles.userCardMeta}>
                  Health {user.healthScore ?? 0} · {user.receiptCount ?? 0} receipts
                </Text>
                <Text style={styles.userCardMeta}>Joined · {formatDate(user.created_at)}</Text>
                <Text style={styles.userCardMeta}>Last seen · {formatDate(user.last_seen_at)}</Text>
              </Pressable>
            ))}
            {users.length === 0 ? <Text style={styles.empty}>No users found.</Text> : null}
          </View>
        ) : (
          <View>
            <View style={[styles.tableRow, styles.tableHead]}>
              <Text style={[styles.cell, styles.cellEmail, styles.headText]}>Email</Text>
              <Text style={[styles.cell, styles.headText]}>Health</Text>
              <Text style={[styles.cell, styles.headText]}>Joined</Text>
              <Text style={[styles.cell, styles.headText]}>Last seen</Text>
              <Text style={[styles.cell, styles.headText]}>Status</Text>
            </View>
            {users.map((user) => (
              <Pressable key={user.id} style={styles.tableRow} onPress={() => onSelectUser(user.id)}>
                <Text style={[styles.cell, styles.cellEmail]} numberOfLines={1}>
                  {user.email ?? '(no email)'}
                </Text>
                <View style={styles.cell}>
                  <HealthBadge score={user.healthScore} />
                </View>
                <Text style={styles.cell}>{formatDate(user.created_at)}</Text>
                <Text style={styles.cell}>{formatDate(user.last_seen_at)}</Text>
                <View style={styles.cell}>
                  <StatusBadge profile={user} />
                </View>
              </Pressable>
            ))}
            {users.length === 0 ? <Text style={styles.empty}>No users found.</Text> : null}
          </View>
        )}

        <View style={[styles.pagination, isMobile && styles.paginationMobile]}>
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
    </View>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.filterChip, active && styles.filterChipActive]} onPress={onPress}>
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 16 },
  header: { gap: 4 },
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
    overflow: 'hidden',
  },
  panelHeader: { padding: 16, borderBottomWidth: 1, borderBottomColor: AdminColors.border, gap: 12 },
  panelHeaderMobile: { padding: 14 },
  searchRow: { flexDirection: 'row', gap: 8 },
  searchRowMobile: { flexDirection: 'column' },
  filterScroll: { flexGrow: 0 },
  filterRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  filterChip: {
    borderWidth: 1,
    borderColor: AdminColors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: AdminColors.surface,
  },
  filterChipActive: {
    backgroundColor: AdminColors.primary,
    borderColor: AdminColors.primary,
  },
  filterChipText: { fontSize: 12, fontWeight: '600', color: AdminColors.textSecondary },
  filterChipTextActive: { color: AdminColors.primaryText },
  sortDirLabel: { fontSize: 12, color: AdminColors.textMuted, fontWeight: '600' },
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
  searchInputMobile: { width: '100%', flex: undefined },
  searchButton: {
    backgroundColor: AdminColors.primary,
    borderRadius: AdminRadius.md,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: TOUCH_TARGET,
  },
  searchButtonMobile: { width: '100%' },
  searchButtonText: { color: AdminColors.primaryText, fontWeight: '700' },
  center: { padding: 32, alignItems: 'center' },
  userCard: {
    borderBottomWidth: 1,
    borderBottomColor: AdminColors.border,
    padding: 14,
    gap: 6,
  },
  userCardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  userCardBadges: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  userCardEmail: { flex: 1, fontSize: 15, fontWeight: '700', color: AdminColors.text },
  userCardMeta: { fontSize: 13, color: AdminColors.textSecondary },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: AdminColors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  tableHead: { backgroundColor: AdminColors.surfaceMuted },
  headText: {
    fontSize: 12,
    fontWeight: '700',
    color: AdminColors.textSecondary,
    textTransform: 'uppercase',
  },
  cell: { flex: 1, fontSize: 14, color: AdminColors.text },
  cellEmail: { flex: 2, fontWeight: '600' },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
  },
  healthBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: '800',
    overflow: 'hidden',
  },
  healthGood: { backgroundColor: AdminColors.successBg, color: AdminColors.success },
  healthMid: { backgroundColor: AdminColors.warningBg, color: AdminColors.warning },
  healthLow: { backgroundColor: AdminColors.dangerBg, color: AdminColors.danger },
  badgePro: { backgroundColor: AdminColors.successBg, color: AdminColors.success },
  badgeAdmin: { backgroundColor: '#EFF6FF', color: AdminColors.primaryDark },
  badgeDanger: { backgroundColor: AdminColors.dangerBg, color: AdminColors.danger },
  badgeMuted: { backgroundColor: AdminColors.surfaceMuted, color: AdminColors.textSecondary },
  empty: { padding: 24, textAlign: 'center', color: AdminColors.textSecondary },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    gap: 12,
  },
  paginationMobile: { flexDirection: 'column' },
  pageButton: {
    borderWidth: 1,
    borderColor: AdminColors.border,
    borderRadius: AdminRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
  },
  pageButtonDisabled: { opacity: 0.45 },
  pageButtonText: { fontWeight: '600', color: AdminColors.text },
  pageInfo: { flex: 1, textAlign: 'center', fontSize: 13, color: AdminColors.textSecondary },
});
