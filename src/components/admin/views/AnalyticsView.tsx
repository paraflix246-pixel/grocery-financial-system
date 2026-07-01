import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';

import { SimpleBarChart } from '@/src/components/admin/SimpleBarChart';
import { StatCard } from '@/src/components/admin/StatCard';
import { formatCurrency, formatDate, formatPercent, MOBILE_BREAKPOINT } from '@/src/components/admin/utils';
import {
  fetchAdminStats,
  sendReEngagementEmail,
  type AdminStats,
} from '@/src/services/admin/adminApiService';
import { AdminColors, AdminRadius } from '@/src/theme/adminTheme';

type AnalyticsViewProps = {
  onSelectUser: (userId: string) => void;
};

export function AnalyticsView({ onSelectUser }: AnalyticsViewProps) {
  const { width } = useWindowDimensions();
  const isMobile = width < MOBILE_BREAKPOINT;
  const statStyle = useMemo<ViewStyle>(
    () => (isMobile ? { flexBasis: '47%', flexGrow: 0, minWidth: 0 } : { flexGrow: 1, minWidth: 140 }),
    [isMobile]
  );

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [emailSending, setEmailSending] = useState<string | null>(null);
  const [connected, setConnected] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchAdminStats();
      setStats(data);
      setConnected(true);
      setLastUpdated(new Date());
    } catch (err) {
      setConnected(false);
      setError(err instanceof Error ? err.message : 'Could not load analytics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => void load(), 10_000);
    return () => clearInterval(timer);
  }, [autoRefresh, load]);

  const handleReEngage = async (userId: string) => {
    setEmailSending(userId);
    try {
      await sendReEngagementEmail(userId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send email.');
    } finally {
      setEmailSending(null);
    }
  };

  if (loading && !stats) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={AdminColors.primary} />
      </View>
    );
  }

  const healthLabel =
    stats?.systemHealth === 'healthy' ? '🟢 Healthy' : stats?.systemHealth === 'degraded' ? '🟡 Degraded' : '⚪ Unknown';

  return (
    <View style={styles.wrap}>
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => setError(null)}>
            <Text style={styles.dismiss}>Dismiss</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.section}>
        <View style={[styles.sectionHeader, isMobile && styles.sectionHeaderMobile]}>
          <View style={styles.sectionHeaderText}>
            <Text style={styles.sectionTitle}>Real-Time Platform Monitor</Text>
            <Text style={styles.sectionSub}>Live grocery platform metrics</Text>
          </View>
          <View style={[styles.monitorControls, isMobile && styles.monitorControlsMobile]}>
            <Text style={styles.connected}>{connected ? '🟢 Connected' : '🔴 Disconnected'}</Text>
            {lastUpdated ? (
              <Text style={styles.lastUpdated}>Updated · {formatDate(lastUpdated.toISOString())}</Text>
            ) : null}
            <Pressable style={styles.refreshBtn} onPress={() => void load()}>
              <Text style={styles.refreshBtnText}>Refresh</Text>
            </Pressable>
            <View style={styles.autoRow}>
              <Text style={styles.autoLabel}>Auto</Text>
              <Switch
                value={autoRefresh}
                onValueChange={setAutoRefresh}
                trackColor={{ false: AdminColors.border, true: AdminColors.primary }}
                thumbColor={Platform.OS === 'android' ? AdminColors.surface : undefined}
              />
            </View>
          </View>
        </View>

        <View style={styles.statGrid}>
          <StatCard label="Online Now" value={stats?.onlineNow ?? 0} style={statStyle} />
          <StatCard label="Receipt Scans Today" value={stats?.receiptScansToday ?? 0} style={statStyle} />
          <StatCard
            label="Pending Signups"
            value={stats?.pendingSignups ?? 0}
            accent={AdminColors.warning}
            style={statStyle}
          />
          <StatCard label="Payments Today" value={stats?.paymentsToday ?? 0} style={statStyle} />
          <StatCard
            label="Past Due"
            value={stats?.pastDueCount ?? 0}
            accent={AdminColors.warning}
            style={statStyle}
          />
          <StatCard
            label="Premium Users"
            value={stats?.premiumUsers ?? 0}
            accent={AdminColors.success}
            subtitle="Pro + Family"
            style={statStyle}
          />
          <StatCard label="System Health" value={healthLabel} style={statStyle} />
        </View>
      </View>

      <View style={styles.statGrid}>
        <StatCard
          label="30-Day Revenue (MRR est.)"
          value={formatCurrency(stats?.revenue30Day ?? 0)}
          subtitle={stats?.revenue30DayNote}
          style={statStyle}
        />
        <StatCard
          label="Flagged Accounts"
          value={stats?.flaggedAccounts ?? 0}
          accent={AdminColors.danger}
          style={statStyle}
        />
        <StatCard label="Support Tickets" value={stats?.supportTickets ?? 0} style={statStyle} />
      </View>

      <View style={[styles.panelRow, isMobile && styles.panelRowMobile]}>
        <View style={[styles.panel, styles.panelHalf]}>
          <Text style={styles.panelTitle}>Recent Activity</Text>
          <Text style={styles.panelSub}>Latest audit events</Text>
          {stats?.recentActivity.length ? (
            stats.recentActivity.slice(0, 8).map((event) => (
              <View key={event.id} style={styles.activityRow}>
                <Text style={styles.activityType}>{event.event_type}</Text>
                <Text style={styles.activityMeta}>{formatDate(event.created_at)}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.empty}>No recent activity.</Text>
          )}
        </View>

        <View style={[styles.panel, styles.panelHalf]}>
          <Text style={styles.panelTitle}>Abuse & Fraud Signals</Text>
          <Text style={styles.panelSub}>Heuristic counts — review manually</Text>
          <View style={styles.metricList}>
            <MetricRow label="Banned accounts" value={stats?.abuseHeuristics.bannedAccounts ?? 0} />
            <MetricRow label="Past-due subscriptions" value={stats?.abuseHeuristics.pastDueSubscriptions ?? 0} />
            <MetricRow label="Signups (24h)" value={stats?.abuseHeuristics.signupsLast24h ?? 0} />
            <MetricRow label="Signups (1h)" value={stats?.abuseHeuristics.signupsLastHour ?? 0} />
            <MetricRow label="Open feedback" value={stats?.abuseHeuristics.openFeedback ?? 0} />
            <MetricRow
              label="High-volume email domains"
              value={stats?.abuseHeuristics.highVolumeEmailDomains ?? 0}
            />
          </View>
        </View>
      </View>

      <View style={[styles.panelRow, isMobile && styles.panelRowMobile]}>
        <View style={[styles.panel, styles.panelHalf]}>
          <Text style={styles.panelTitle}>Tier Distribution</Text>
          <View style={styles.tierList}>
            <TierRow label="Free" count={stats?.tierFree ?? 0} color={AdminColors.textMuted} total={stats?.totalUsers ?? 1} />
            <TierRow label="Pro" count={stats?.tierPro ?? 0} color={AdminColors.primary} total={stats?.totalUsers ?? 1} />
            <TierRow label="Family" count={stats?.tierFamily ?? 0} color={AdminColors.success} total={stats?.totalUsers ?? 1} />
          </View>
        </View>

        <View style={[styles.panel, styles.panelHalf]}>
          <Text style={styles.panelTitle}>Platform Activity</Text>
          <View style={styles.metricList}>
            <MetricRow label="Total receipt scans" value={stats?.totalReceiptScans ?? 0} />
            <MetricRow label="Completed parses" value={stats?.completedParses ?? 0} />
            <MetricRow label="Completion rate" value={formatPercent(stats?.completionRate ?? 0)} />
            <MetricRow label="Shopping lists created" value={stats?.shoppingListsCreated ?? 0} />
            <MetricRow label="Price comparisons run" value={stats?.priceComparisonsRun ?? 0} />
          </View>
        </View>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Top Users</Text>
        <Text style={styles.panelSub}>Top 10 by recent activity</Text>
        {stats?.topUsers.length ? (
          stats.topUsers.map((user, index) => (
            <Pressable key={user.id} style={styles.tableRow} onPress={() => onSelectUser(user.id)}>
              <Text style={[styles.cellRank, styles.cell]}>{index + 1}</Text>
              <Text style={[styles.cellEmail, styles.cell]} numberOfLines={1}>
                {user.email ?? user.id.slice(0, 8)}
              </Text>
              <Text style={[styles.cell, styles.cellHideMobile]}>{user.planTier}</Text>
              <Text style={[styles.cell, styles.cellHideMobile]}>{user.activityScore}</Text>
              <Text style={[styles.cell, styles.cellHideMobile]}>{formatDate(user.lastSeenAt)}</Text>
            </Pressable>
          ))
        ) : (
          <Text style={styles.empty}>No user activity yet.</Text>
        )}
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Churn Prediction</Text>
        <Text style={styles.panelSub}>Users inactive 30+ days — at risk of churning</Text>
        {stats?.churnRisk.length ? (
          stats.churnRisk.map((user) => (
            <View key={user.id} style={[styles.churnRow, isMobile && styles.churnRowMobile]}>
              <View style={styles.churnInfo}>
                <Text style={styles.churnEmail} numberOfLines={1}>
                  {user.email ?? user.id.slice(0, 8)}
                </Text>
                <Text style={styles.churnMeta}>
                  {user.planTier} · {user.daysInactive}d inactive · Risk {user.riskScore}
                </Text>
                <Text style={styles.churnMeta}>Last active · {formatDate(user.lastSeenAt)}</Text>
              </View>
              <Pressable
                style={[styles.reengageBtn, !stats.resendConfigured && styles.reengageBtnDisabled]}
                disabled={!stats.resendConfigured || emailSending === user.id}
                onPress={() => void handleReEngage(user.id)}>
                <Text style={styles.reengageBtnText}>
                  {emailSending === user.id
                    ? 'Sending…'
                    : stats.resendConfigured
                      ? 'Send Re-engagement Email'
                      : 'Resend not configured'}
                </Text>
              </Pressable>
            </View>
          ))
        ) : (
          <Text style={styles.empty}>No at-risk users detected.</Text>
        )}
      </View>

      <View style={styles.footerStats}>
        <StatCard
          label="Pro revenue potential (MRR)"
          value={formatCurrency(stats?.totalProRevenuePotential ?? 0)}
          style={statStyle}
        />
        <StatCard label="Total users" value={stats?.totalUsers ?? 0} style={statStyle} />
        <StatCard
          label="Users today"
          value={stats?.signupsToday ?? 0}
          subtitle={`${stats?.proCount ?? 0} Pro · ${stats?.bannedCount ?? 0} banned`}
          style={statStyle}
        />
      </View>

      <View style={[styles.panelRow, isMobile && styles.panelRowMobile]}>
        <View style={styles.panelHalf}>
          <SimpleBarChart title="Activity velocity — daily signups (30d)" data={stats?.dailySignups ?? []} />
        </View>
        <View style={styles.panelHalf}>
          <SimpleBarChart
            title="Receipt scans — daily (30d)"
            data={stats?.dailyScans ?? []}
            color={AdminColors.success}
          />
        </View>
      </View>

      <SimpleBarChart
        title="User growth — cumulative (30d)"
        data={stats?.cumulativeUsers ?? []}
        color={AdminColors.primaryDark}
        emptyLabel="Signups will appear here as users join"
      />
    </View>
  );
}

function TierRow({
  label,
  count,
  color,
  total,
}: {
  label: string;
  count: number;
  color: string;
  total: number;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <View style={styles.tierRow}>
      <View style={styles.tierHeader}>
        <Text style={styles.tierLabel}>{label}</Text>
        <Text style={styles.tierCount}>
          {count.toLocaleString()} ({pct}%)
        </Text>
      </View>
      <View style={styles.tierTrack}>
        <View style={[styles.tierFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function MetricRow({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{typeof value === 'number' ? value.toLocaleString() : value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 20 },
  center: { alignItems: 'center', padding: 40 },
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
  },
  errorText: { flex: 1, color: AdminColors.danger, fontWeight: '600', fontSize: 14 },
  dismiss: { color: AdminColors.primaryDark, fontWeight: '700' },
  section: { gap: 14 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  sectionHeaderMobile: { flexDirection: 'column' },
  sectionHeaderText: { gap: 4, flex: 1 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: AdminColors.text },
  sectionSub: { fontSize: 13, color: AdminColors.textSecondary },
  monitorControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  monitorControlsMobile: { flexWrap: 'wrap' },
  connected: { fontSize: 13, fontWeight: '600', color: AdminColors.textSecondary },
  lastUpdated: { fontSize: 12, color: AdminColors.textMuted },
  refreshBtn: {
    borderWidth: 1,
    borderColor: AdminColors.border,
    borderRadius: AdminRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: AdminColors.surface,
  },
  refreshBtnText: { fontSize: 13, fontWeight: '700', color: AdminColors.text },
  autoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  autoLabel: { fontSize: 13, color: AdminColors.textSecondary, fontWeight: '600' },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  panelRow: { flexDirection: 'row', gap: 16 },
  panelRowMobile: { flexDirection: 'column' },
  panel: {
    backgroundColor: AdminColors.surface,
    borderRadius: AdminRadius.lg,
    borderWidth: 1,
    borderColor: AdminColors.border,
    padding: 16,
    gap: 10,
  },
  panelHalf: { flex: 1, minWidth: 0 },
  panelTitle: { fontSize: 16, fontWeight: '700', color: AdminColors.text },
  panelSub: { fontSize: 13, color: AdminColors.textSecondary, marginBottom: 4 },
  tierList: { gap: 12 },
  tierRow: { gap: 6 },
  tierHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  tierLabel: { fontSize: 14, fontWeight: '600', color: AdminColors.text },
  tierCount: { fontSize: 13, color: AdminColors.textSecondary },
  tierTrack: {
    height: 8,
    backgroundColor: AdminColors.surfaceMuted,
    borderRadius: 999,
    overflow: 'hidden',
  },
  tierFill: { height: '100%', borderRadius: 999 },
  metricList: { gap: 8 },
  metricRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  metricLabel: { fontSize: 14, color: AdminColors.textSecondary },
  metricValue: { fontSize: 14, fontWeight: '700', color: AdminColors.text },
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: AdminColors.border,
    paddingVertical: 8,
  },
  activityType: { flex: 1, fontSize: 13, fontWeight: '600', color: AdminColors.text },
  activityMeta: { fontSize: 12, color: AdminColors.textSecondary },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: AdminColors.border,
    paddingVertical: 10,
    gap: 8,
  },
  cell: { flex: 1, fontSize: 13, color: AdminColors.text },
  cellRank: { flex: 0, width: 28, fontWeight: '700' },
  cellEmail: { flex: 2, fontWeight: '600' },
  cellHideMobile: {},
  empty: { fontSize: 14, color: AdminColors.textMuted, paddingVertical: 12 },
  churnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: AdminColors.border,
    paddingVertical: 12,
  },
  churnRowMobile: { flexDirection: 'column', alignItems: 'stretch' },
  churnInfo: { flex: 1, gap: 4, minWidth: 0 },
  churnEmail: { fontSize: 14, fontWeight: '700', color: AdminColors.text },
  churnMeta: { fontSize: 12, color: AdminColors.textSecondary },
  reengageBtn: {
    backgroundColor: AdminColors.primary,
    borderRadius: AdminRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  reengageBtnDisabled: { opacity: 0.5 },
  reengageBtnText: { color: AdminColors.primaryText, fontWeight: '700', fontSize: 12 },
  footerStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
});
