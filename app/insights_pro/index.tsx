import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Text } from '@/components/Themed';
import { InsightCard } from '@/src/components/InsightCard';
import { ProUpgradeBanner } from '@/src/components/ProUpgradeBanner';
import { MockupCard, MockupPrimaryButton } from '@/src/components/mockup/MockupUI';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { useFeatureGate } from '@/src/hooks/useFeatureGate';
import { getProInsights, type ProInsights } from '@/src/services/analyticsService';
import { getFeatureLabel } from '@/src/services/featureGateService';
import { resolveStore } from '@/src/services/storeService';
import { useBudgetStore } from '@/src/store/useBudgetStore';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';
import { formatCurrency } from '@/src/utils/priceParser';

const INSIGHT_ICONS = ['🛒', '📊', '💰', '🏪', '📈'];

function VerticalInsightCard({
  icon,
  title,
  body,
  accent,
  onPress,
}: {
  icon: string;
  title: string;
  body: string;
  accent: string;
  onPress?: () => void;
}) {
  const content = (
    <MockupCard style={styles.insightCard}>
      <View style={[styles.insightIconWrap, { backgroundColor: accent }]}>
        <Text style={styles.insightIcon}>{icon}</Text>
      </View>
      <View style={styles.insightBody}>
        <Text style={styles.insightTitle}>{title}</Text>
        <Text style={styles.insightText}>{body}</Text>
      </View>
      {onPress ? (
        <SymbolView
          name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
          tintColor={SmartCartColors.textSecondary}
          size={16}
        />
      ) : null}
    </MockupCard>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [pressed && styles.cardPressed]}
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${body}`}>
        {content}
      </Pressable>
    );
  }

  return content;
}

export default function InsightsProScreen() {
  const router = useRouter();
  const { unlocked, requestAccess } = useFeatureGate('insights_pro');
  const monthlyBudget = useBudgetStore((s) => (s.settings?.weeklyBudget ?? 200) * 4.33);
  const categoryLimits = useBudgetStore((s) => s.settings?.categoryLimits);
  const [insights, setInsights] = useState<ProInsights | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setInsights(await getProInsights(monthlyBudget, categoryLimits));
    } finally {
      setLoading(false);
    }
  }, [monthlyBudget, categoryLimits]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const showGated = !unlocked;

  const navigateOrGate = useCallback(
    (route: Href) => {
      if (showGated) {
        requestAccess();
        return;
      }
      router.push(route as never);
    },
    [showGated, requestAccess, router],
  );

  const navigateToStore = useCallback(
    async (storeName: string) => {
      if (showGated) {
        requestAccess();
        return;
      }
      const storeDef = await resolveStore(storeName);
      router.push(`/stores/${storeDef.id}` as never);
    },
    [showGated, requestAccess, router],
  );

  const verticalInsights = useMemo(
    () => [
      {
        icon: '🛒',
        title: 'Shopping Frequency',
        body: `${insights?.frequency.tripsThisMonth ?? 0} trips this month · avg ${insights?.frequency.avgDaysBetweenTrips ? Math.round(insights.frequency.avgDaysBetweenTrips) : '—'} days between trips`,
        accent: SmartCartColors.badge,
        onPress: () => navigateOrGate('/usage_tracking?section=frequency' as Href),
      },
      {
        icon: '💰',
        title: 'Budget Summary',
        body: insights?.summaryLine ?? 'Scan receipts to unlock personalized spending patterns.',
        accent: '#FFF7ED',
        onPress: () => navigateOrGate('/settings/budget'),
      },
      ...(showGated
        ? [
            {
              icon: '🔒',
              title: 'Overspend Categories',
              body: 'Upgrade to Pro to see which categories exceed your budget.',
              accent: '#F3E8FF',
              onPress: () => requestAccess(),
            },
          ]
        : (insights?.overspendCategories ?? []).slice(0, 2).map((cat) => ({
            icon: '📊',
            title: `${cat.category} over budget`,
            body: `${formatCurrency(cat.spent)} of ${formatCurrency(cat.limit)} (+${formatCurrency(cat.overAmount)})`,
            accent: '#FEE2E2',
            onPress: () => router.push('/settings/budget?edit=1' as never),
          }))),
      ...(showGated
        ? [
            {
              icon: '🔒',
              title: 'Store Trends',
              body: 'Tap to unlock store comparison trends.',
              accent: '#EFF6FF',
              onPress: () => requestAccess(),
            },
          ]
        : (insights?.storeTrends ?? []).slice(0, 2).map((store) => ({
            icon: '🏪',
            title: store.store,
            body: `${formatCurrency(store.thisMonth)} this month · ${store.changePercent > 0 ? '↑' : store.changePercent < 0 ? '↓' : '—'}${Math.abs(Math.round(store.changePercent))}% vs last month`,
            accent: SmartCartColors.badgeGreen,
            onPress: () => void navigateToStore(store.store),
          }))),
    ],
    [insights, navigateOrGate, navigateToStore, requestAccess, router, showGated],
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="Your Spending Patterns" />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={SmartCartColors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {showGated && <ProUpgradeBanner featureName={getFeatureLabel('insights_pro')} />}

          {verticalInsights.map((item, index) => (
            <VerticalInsightCard
              key={`${item.title}-${index}`}
              icon={item.icon ?? INSIGHT_ICONS[index % INSIGHT_ICONS.length]}
              title={item.title}
              body={item.body}
              accent={item.accent}
              onPress={item.onPress}
            />
          ))}

          <View style={styles.grid}>
            <InsightCard
              title="This month"
              value={`${insights?.frequency.tripsThisMonth ?? 0} trips`}
              subtitle={`Last month: ${insights?.frequency.tripsLastMonth ?? 0}`}
              actionHint="Details"
              onPress={() => navigateOrGate('/usage_tracking?section=monthly' as Href)}
              expand
            />
            <InsightCard
              title="Avg gap"
              value={
                insights?.frequency.avgDaysBetweenTrips
                  ? `${Math.round(insights.frequency.avgDaysBetweenTrips)} days`
                  : '—'
              }
              subtitle={insights?.frequency.busiestDay ? `Busiest: ${insights.frequency.busiestDay}` : undefined}
              actionHint="Details"
              onPress={() => navigateOrGate('/usage_tracking?section=gap' as Href)}
              expand
            />
          </View>

          <MockupPrimaryButton
            label="View All Insights"
            icon="chevron"
            onPress={() => navigateOrGate('/spending-analytics')}
          />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SmartCartColors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 40, gap: 0 },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
  },
  cardPressed: { opacity: 0.92 },
  insightIconWrap: {
    width: 48,
    height: 48,
    borderRadius: SmartCartRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightIcon: { fontSize: 24 },
  insightBody: { flex: 1 },
  insightTitle: { fontSize: 15, fontWeight: '700', color: SmartCartColors.text },
  insightText: { fontSize: 13, color: SmartCartColors.textSecondary, marginTop: 4, lineHeight: 18 },
  grid: { flexDirection: 'row', gap: 10, marginVertical: 16 },
});
