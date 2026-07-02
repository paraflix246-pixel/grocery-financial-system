import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';

import { Text } from '@/components/Themed';
import { formatProMonthlyPrice } from '@/src/constants/proPricing';
import type { MoneyLeakReport } from '@/src/services/moneyLeakService';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';
import { formatCurrency } from '@/src/utils/priceParser';
import { buildPaywallHref } from '@/src/utils/paywallRoutes';

type Props = {
  report: MoneyLeakReport;
  isPro: boolean;
};

export function MoneyLeakWidget({ report, isPro }: Props) {
  const { t } = useTranslation();
  const router = useRouter();

  if (!report.hasData) {
    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <SymbolView
            name={{ ios: 'drop.fill', android: 'water_drop', web: 'water_drop' }}
            tintColor={SmartCartColors.accentOrange}
            size={18}
          />
          <Text style={styles.title}>{t('moneyLeak.title')}</Text>
        </View>
        <Text style={styles.emptyBody}>{t('moneyLeak.empty')}</Text>
      </View>
    );
  }

  const headline =
    report.estimatedAtRisk != null
      ? t('moneyLeak.headlineAtRisk', { amount: formatCurrency(report.estimatedAtRisk) })
      : report.blindSpotCount > 0
        ? t('moneyLeak.headlineBlindSpots', { count: report.blindSpotCount })
        : t('moneyLeak.headlineClear');

  const visibleSpots = isPro ? report.blindSpots : report.blindSpots.slice(0, 1);
  const proMonthlyPrice = formatProMonthlyPrice();
  const upgradeCtaLabel = t('moneyLeak.upgradeCta', { price: proMonthlyPrice });

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <SymbolView
          name={{ ios: 'drop.fill', android: 'water_drop', web: 'water_drop' }}
          tintColor={SmartCartColors.accentOrange}
          size={18}
        />
        <Text style={styles.title}>{t('moneyLeak.title')}</Text>
      </View>

      <Text style={styles.headline}>{headline}</Text>
      <Text style={styles.subtitle} muted>
        {t('moneyLeak.subtitle')}
      </Text>

      {visibleSpots.length > 0 ? (
        <View style={styles.spotList}>
          {visibleSpots.map((spot) => (
            <View key={spot.id} style={styles.spotRow}>
              <SymbolView
                name={{ ios: 'exclamationmark.circle.fill', android: 'error', web: 'error' }}
                tintColor={SmartCartColors.accentOrange}
                size={14}
              />
              <Text style={styles.spotText}>
                {t(spot.labelKey, spot.labelParams ?? {})}
                {isPro && spot.estimatedCost != null
                  ? ` · ${formatCurrency(spot.estimatedCost)}`
                  : ''}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {!isPro && report.blindSpotCount > 0 ? (
        <Pressable
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          onPress={() => router.push(buildPaywallHref('pro') as never)}
          accessibilityRole="button"
          accessibilityLabel={upgradeCtaLabel}>
          <Text style={styles.ctaText}>{upgradeCtaLabel}</Text>
          <SymbolView
            name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
            tintColor={SmartCartColors.primary}
            size={14}
          />
        </Pressable>
      ) : null}

      {isPro && report.blindSpots.length === 0 ? (
        <Text style={styles.clearNote} muted>
          {t('moneyLeak.noLeaks')}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.md,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    ...SmartCartShadow.card,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: SmartCartColors.textSecondary,
  },
  headline: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: SmartCartColors.text,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
  },
  emptyBody: {
    fontSize: 13,
    color: SmartCartColors.textSecondary,
    lineHeight: 19,
  },
  spotList: {
    marginTop: 12,
    gap: 8,
  },
  spotRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  spotText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: SmartCartColors.text,
  },
  cta: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: SmartCartRadius.sm,
    backgroundColor: 'rgba(34,197,94,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.25)',
  },
  ctaPressed: { opacity: 0.9 },
  ctaText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: SmartCartColors.primary,
  },
  clearNote: {
    fontSize: 12,
    marginTop: 10,
    lineHeight: 17,
  },
});
