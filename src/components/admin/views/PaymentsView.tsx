import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';

import { StatCard } from '@/src/components/admin/StatCard';
import { formatCurrency, formatDate, MOBILE_BREAKPOINT } from '@/src/components/admin/utils';
import {
  fetchAdminPayments,
  type AdminPaymentRow,
  type AdminPaymentsSummary,
} from '@/src/services/admin/adminApiService';
import { AdminColors, AdminRadius } from '@/src/theme/adminTheme';

function stripeCustomerUrl(customerId: string | null): string | null {
  if (!customerId) return null;
  return `https://dashboard.stripe.com/customers/${customerId}`;
}

function stripeSubscriptionUrl(subId: string | null): string | null {
  if (!subId) return null;
  return `https://dashboard.stripe.com/subscriptions/${subId}`;
}

export function PaymentsView() {
  const { width } = useWindowDimensions();
  const isMobile = width < MOBILE_BREAKPOINT;

  const [rows, setRows] = useState<AdminPaymentRow[]>([]);
  const [summary, setSummary] = useState<AdminPaymentsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminPayments();
      setRows(data.subscriptions);
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load payments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const statStyle = useMemo<ViewStyle>(
    () => (isMobile ? { flexBasis: '47%', flexGrow: 0, minWidth: 0 } : { flexGrow: 1, minWidth: 120 }),
    [isMobile]
  );

  const pastDueRows = useMemo(() => rows.filter((row) => row.status === 'past_due'), [rows]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Payments & Subscriptions</Text>
      <Text style={styles.subtitle}>Live Stripe Pro and Family subscriptions</Text>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {summary ? (
        <View style={styles.statGrid}>
          <StatCard label="MRR" value={formatCurrency(summary.mrr)} style={statStyle} />
          <StatCard label="Active" value={summary.activeCount} style={statStyle} />
          <StatCard label="Trialing" value={summary.trialingCount} style={statStyle} />
          <StatCard
            label="Past due"
            value={summary.pastDueCount}
            accent={AdminColors.warning}
            style={statStyle}
          />
          <StatCard
            label="Trial → active (30d)"
            value={summary.trialConversions30d}
            style={statStyle}
          />
        </View>
      ) : null}

      {pastDueRows.length > 0 ? (
        <View style={styles.attentionPanel}>
          <Text style={styles.attentionTitle}>Needs attention</Text>
          <Text style={styles.attentionSub}>
            {pastDueRows.length} subscription{pastDueRows.length === 1 ? '' : 's'} past due
          </Text>
          {pastDueRows.map((row) => (
            <View key={`past-due-${row.product}-${row.id}`} style={styles.attentionRow}>
              <Text style={styles.rowTitle}>
                {row.product === 'family' ? 'Family' : 'Pro'} · {row.email ?? row.userId ?? '—'}
              </Text>
              <Text style={styles.rowMeta}>
                {formatCurrency(row.amountMonthly)}/mo est. · Created {formatDate(row.createdAt)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.panel}>
        {loading ? (
          <ActivityIndicator color={AdminColors.primary} />
        ) : rows.length === 0 ? (
          <Text style={styles.empty}>No subscriptions yet.</Text>
        ) : (
          rows.map((row) => (
            <View key={`${row.product}-${row.id}`} style={styles.row}>
              <View style={styles.rowMain}>
                <Text style={styles.rowTitle}>
                  {row.product === 'family' ? 'Family' : 'Pro'} · {row.plan ?? '—'} · {row.status}
                </Text>
                <Text style={styles.rowMeta}>{row.email ?? row.userId ?? '—'}</Text>
                <Text style={styles.rowMeta}>
                  {formatCurrency(row.amountMonthly)}/mo est. · Created {formatDate(row.createdAt)}
                </Text>
                {row.currentPeriodEnd ? (
                  <Text style={styles.rowMeta}>Period end · {formatDate(row.currentPeriodEnd)}</Text>
                ) : null}
              </View>
              <View style={styles.links}>
                {stripeCustomerUrl(row.stripeCustomerId) ? (
                  <Pressable
                    onPress={() => void Linking.openURL(stripeCustomerUrl(row.stripeCustomerId)!)}>
                    <Text style={styles.link}>Stripe customer</Text>
                  </Pressable>
                ) : null}
                {stripeSubscriptionUrl(row.stripeSubscriptionId) ? (
                  <Pressable
                    onPress={() =>
                      void Linking.openURL(stripeSubscriptionUrl(row.stripeSubscriptionId)!)
                    }>
                    <Text style={styles.link}>Subscription</Text>
                  </Pressable>
                ) : null}
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
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  attentionPanel: {
    backgroundColor: AdminColors.warningBg,
    borderRadius: AdminRadius.lg,
    borderWidth: 1,
    borderColor: AdminColors.border,
    padding: 16,
    gap: 8,
  },
  attentionTitle: { fontSize: 16, fontWeight: '800', color: AdminColors.text },
  attentionSub: { fontSize: 13, color: AdminColors.textSecondary, marginBottom: 4 },
  attentionRow: {
    borderTopWidth: 1,
    borderTopColor: AdminColors.border,
    paddingTop: 10,
    gap: 4,
  },
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
  rowTitle: { fontSize: 14, fontWeight: '700', color: AdminColors.text },
  rowMeta: { fontSize: 12, color: AdminColors.textSecondary },
  links: { gap: 6, alignItems: 'flex-end' },
  link: { fontSize: 12, fontWeight: '700', color: AdminColors.primaryDark },
});
