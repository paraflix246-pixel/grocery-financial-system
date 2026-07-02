import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { InsightCard } from '@/src/components/InsightCard';
import type { PantryInsightCard } from '@/src/services/pantryInsightService';
import { buildPaywallHref } from '@/src/utils/paywallRoutes';

type Props = {
  insights: PantryInsightCard[];
  hasFullAccess?: boolean;
  onPressPantry?: () => void;
};

export function PantryInsightCards({ insights, hasFullAccess = true, onPressPantry }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  if (insights.length === 0) return null;

  const translateValue = (insight: PantryInsightCard) => {
    const count = Number(insight.valueParams?.count ?? 0);
    if (insight.id === 'expiry-risk' || insight.id === 'low-stock') {
      return t(insight.valueKey, { count, ...insight.valueParams });
    }
    return t(insight.valueKey, insight.valueParams ?? {});
  };

  const handlePress = (insight: PantryInsightCard) => {
    if (!hasFullAccess) {
      router.push(buildPaywallHref('pro') as never);
      return;
    }
    onPressPantry?.();
  };

  const actionHintFor = (insight: PantryInsightCard) => {
    if (!hasFullAccess) {
      return t('pantryInsights.unlockWithPro');
    }
    return onPressPantry ? t('home.pantry') : undefined;
  };

  return (
    <View style={styles.wrap}>
      {insights.map((insight) => (
        <InsightCard
          key={insight.id}
          title={t(insight.titleKey)}
          value={translateValue(insight)}
          subtitle={t(insight.subtitleKey, insight.subtitleParams ?? {})}
          variant={insight.variant}
          onPress={() => handlePress(insight)}
          actionHint={actionHintFor(insight)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10, marginBottom: 16 },
});
