import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Themed';
import { InsightCard } from '@/src/components/InsightCard';
import { ProUpgradeBanner } from '@/src/components/ProUpgradeBanner';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { useFeatureGate } from '@/src/hooks/useFeatureGate';
import {
  getShoppingFrequencyDetails,
  getUsageStats,
  type ShoppingFrequencyDetails,
  type UsageStats,
} from '@/src/services/analyticsService';
import { getCommunityPriceStats } from '@/src/services/crowdsourcedPricingService';
import { getFeatureLabel } from '@/src/services/featureGateService';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';
import { formatDisplayDate } from '@/src/utils/dateParser';
import { formatCurrency } from '@/src/utils/priceParser';

type UsageSection = 'overview' | 'frequency' | 'monthly' | 'gap';

const SECTION_TITLES: Record<UsageSection, string> = {
  overview: 'Usage Stats',
  frequency: 'Shopping Frequency',
  monthly: 'Monthly Trips',
  gap: 'Trip Patterns',
};

function parseSection(raw?: string): UsageSection {
  if (raw === 'frequency' || raw === 'monthly' || raw === 'gap') return raw;
  return 'overview';
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function FrequencySection({ details }: { details: ShoppingFrequencyDetails }) {
  return (
    <>
      <View style={styles.grid}>
        <InsightCard
          title="This month"
          value={`${details.tripsThisMonth} trips`}
          subtitle={`${formatCurrency(details.thisMonthSpend)} spent`}
          expand
        />
        <InsightCard
          title="Avg gap"
          value={details.avgDaysBetweenTrips ? `${Math.round(details.avgDaysBetweenTrips)} days` : '—'}
          subtitle={details.busiestDay ? `Busiest: ${details.busiestDay}` : undefined}
          expand
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Day-of-week pattern</Text>
        {details.dayBreakdown.length === 0 ? (
          <Text style={styles.emptyHint}>Scan receipts this month to see when you shop most.</Text>
        ) : (
          details.dayBreakdown.map((entry) => (
            <StatRow
              key={entry.day}
              label={entry.day}
              value={`${entry.count} trip${entry.count === 1 ? '' : 's'}`}
            />
          ))
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recent trips</Text>
        {details.recentTripDates.length === 0 ? (
          <Text style={styles.emptyHint}>No trips recorded this month yet.</Text>
        ) : (
          details.recentTripDates.slice(0, 8).map((date) => (
            <StatRow
              key={date}
              label={formatDisplayDate(date)}
              value={new Date(date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long' })}
            />
          ))
        )}
      </View>
    </>
  );
}

function MonthlySection({ details }: { details: ShoppingFrequencyDetails }) {
  const tripChange =
    details.tripsLastMonth > 0
      ? Math.round(((details.tripsThisMonth - details.tripsLastMonth) / details.tripsLastMonth) * 100)
      : details.tripsThisMonth > 0
        ? 100
        : 0;
  const spendChange =
    details.lastMonthSpend > 0
      ? Math.round(((details.thisMonthSpend - details.lastMonthSpend) / details.lastMonthSpend) * 100)
      : details.thisMonthSpend > 0
        ? 100
        : 0;

  return (
    <>
      <View style={styles.grid}>
        <InsightCard
          title="This month"
          value={`${details.tripsThisMonth} trips`}
          subtitle={formatCurrency(details.thisMonthSpend)}
          expand
        />
        <InsightCard
          title="Last month"
          value={`${details.tripsLastMonth} trips`}
          subtitle={formatCurrency(details.lastMonthSpend)}
          expand
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Month-over-month</Text>
        <StatRow
          label="Trip count"
          value={`${tripChange >= 0 ? '+' : ''}${tripChange}% vs last month`}
        />
        <StatRow
          label="Total spend"
          value={`${spendChange >= 0 ? '+' : ''}${spendChange}% vs last month`}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Trips this month</Text>
        {details.recentTripDates.length === 0 ? (
          <Text style={styles.emptyHint}>No trips recorded this month yet.</Text>
        ) : (
          details.recentTripDates.map((date) => (
            <StatRow key={date} label={formatDisplayDate(date)} value="Shopping trip" />
          ))
        )}
      </View>
    </>
  );
}

function GapSection({ details }: { details: ShoppingFrequencyDetails }) {
  return (
    <>
      <View style={styles.grid}>
        <InsightCard
          title="Avg gap"
          value={details.avgDaysBetweenTrips ? `${Math.round(details.avgDaysBetweenTrips)} days` : '—'}
          subtitle="Between trips this month"
          expand
        />
        <InsightCard
          title="Busiest day"
          value={details.busiestDay ?? '—'}
          subtitle={`${details.tripsThisMonth} trips this month`}
          expand
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Days between trips</Text>
        {details.gapDays.length === 0 ? (
          <Text style={styles.emptyHint}>
            Need at least two trips this month to calculate gaps between visits.
          </Text>
        ) : (
          details.gapDays.map((gap, index) => (
            <StatRow key={`gap-${index}`} label={`Gap ${index + 1}`} value={`${Math.round(gap)} days`} />
          ))
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Shopping days</Text>
        {details.dayBreakdown.length === 0 ? (
          <Text style={styles.emptyHint}>No day-of-week pattern yet.</Text>
        ) : (
          details.dayBreakdown.map((entry) => (
            <StatRow
              key={entry.day}
              label={entry.day}
              value={`${entry.count} trip${entry.count === 1 ? '' : 's'}`}
            />
          ))
        )}
      </View>
    </>
  );
}

function OverviewSection({
  stats,
  community,
  showCommunity,
}: {
  stats: UsageStats | null;
  community: { totalPoints: number; uniqueItems: number; uniqueStores: number };
  showCommunity: boolean;
}) {
  return (
    <>
      <Text style={styles.lead}>Computed from your local Penny Pantry data — no cloud sync required.</Text>

      <View style={styles.grid}>
        <InsightCard title="Receipts" value={String(stats?.receiptCount ?? 0)} subtitle="Total scanned" expand />
        <InsightCard title="Lists" value={String(stats?.listCount ?? 0)} subtitle="Shopping lists" expand />
      </View>
      <View style={styles.grid}>
        <InsightCard title="Line items" value={String(stats?.itemLineCount ?? 0)} subtitle="Across all receipts" expand />
        <InsightCard title="Comparisons" value={String(stats?.comparisonCount ?? 0)} subtitle="Plan vs actual" expand />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Spending summary</Text>
        <StatRow label="Total spent" value={formatCurrency(stats?.totalSpent ?? 0)} />
        <StatRow label="Avg receipt" value={formatCurrency(stats?.avgReceiptTotal ?? 0)} />
        <StatRow label="Stores visited" value={String(stats?.storesVisited ?? 0)} />
        {stats?.firstReceiptDate ? (
          <StatRow label="Tracking since" value={formatDisplayDate(stats.firstReceiptDate)} />
        ) : null}
      </View>

      {showCommunity ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Community contributions</Text>
          <StatRow label="Price points shared" value={String(community.totalPoints)} />
          <StatRow label="Unique items" value={String(community.uniqueItems)} />
          <StatRow label="Stores in index" value={String(community.uniqueStores)} />
        </View>
      ) : null}
    </>
  );
}

export default function UsageTrackingScreen() {
  const { section: sectionParam } = useLocalSearchParams<{ section?: string }>();
  const section = useMemo(() => parseSection(sectionParam), [sectionParam]);
  const { unlocked } = useFeatureGate('usage_analytics');
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [frequency, setFrequency] = useState<ShoppingFrequencyDetails | null>(null);
  const [community, setCommunity] = useState({ totalPoints: 0, uniqueItems: 0, uniqueStores: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (section === 'overview') {
        const [usage, comm] = await Promise.all([getUsageStats(), getCommunityPriceStats()]);
        setStats(usage);
        setCommunity(comm);
        setFrequency(null);
      } else {
        setFrequency(await getShoppingFrequencyDetails());
        setStats(null);
      }
    } finally {
      setLoading(false);
    }
  }, [section]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={styles.container}>
      <ScreenHeader title={SECTION_TITLES[section]} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={SmartCartColors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {!unlocked && section === 'overview' ? (
            <ProUpgradeBanner featureName={getFeatureLabel('usage_analytics')} />
          ) : null}

          {section === 'frequency' && frequency ? <FrequencySection details={frequency} /> : null}
          {section === 'monthly' && frequency ? <MonthlySection details={frequency} /> : null}
          {section === 'gap' && frequency ? <GapSection details={frequency} /> : null}
          {section === 'overview' ? (
            <OverviewSection stats={stats} community={community} showCommunity={unlocked} />
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SmartCartColors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 40 },
  lead: { fontSize: 14, color: SmartCartColors.textSecondary, marginBottom: 16, lineHeight: 20 },
  grid: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  card: {
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.md,
    padding: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    ...SmartCartShadow.cardSoft,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: SmartCartColors.text, marginBottom: 12 },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: SmartCartColors.border,
  },
  statLabel: { fontSize: 14, color: SmartCartColors.textSecondary },
  statValue: { fontSize: 14, fontWeight: '700', color: SmartCartColors.text },
  emptyHint: { fontSize: 14, color: SmartCartColors.textMuted, lineHeight: 20 },
});
