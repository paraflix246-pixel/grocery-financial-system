import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { InsightCard } from '@/src/components/InsightCard';
import type { PantryInsightCard } from '@/src/services/pantryInsightService';
import { SmartCartColors } from '@/src/theme/smartCart';

type Props = {
  insights: PantryInsightCard[];
  onPressPantry?: () => void;
};

export function PantryInsightCards({ insights, onPressPantry }: Props) {
  const { t } = useTranslation();
  if (insights.length === 0) return null;

  const translateValue = (insight: PantryInsightCard) => {
    const count = Number(insight.valueParams?.count ?? 0);
    if (insight.id === 'expiry-risk' || insight.id === 'low-stock') {
      return t(insight.valueKey, { count, ...insight.valueParams });
    }
    return t(insight.valueKey, insight.valueParams ?? {});
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
          onPress={onPressPantry}
          actionHint={onPressPantry ? t('home.pantry') : undefined}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10, marginBottom: 16 },
});
