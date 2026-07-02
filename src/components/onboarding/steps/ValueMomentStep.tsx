import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { MoneyLeakWidget } from '@/src/components/MoneyLeakWidget';
import {
  loadOnboardingValueInsights,
  type OnboardingValueInsights,
} from '@/src/services/onboardingValueInsights';
import type { OnboardingGoal } from '@/src/services/onboardingFlowState';
import {
  OnboardingColors,
  OnboardingPrimaryCta,
  OnboardingPrimaryCtaText,
} from '@/src/theme/onboardingTheme';

type Props = {
  goals: OnboardingGoal[];
  skippedTryWithoutData?: boolean;
  onContinue: () => void;
};

export function ValueMomentStep({ goals, skippedTryWithoutData = false, onContinue }: Props) {
  const { t } = useTranslation();
  const [insights, setInsights] = useState<OnboardingValueInsights | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (skippedTryWithoutData) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    void loadOnboardingValueInsights(goals).then((result) => {
      if (!cancelled) {
        setInsights(result);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [goals, skippedTryWithoutData]);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title} accessibilityRole="header">
        {t(
          skippedTryWithoutData
            ? 'onboarding.flow.value.noDataTitle'
            : 'onboarding.flow.value.title'
        )}
      </Text>

      {skippedTryWithoutData ? (
        <>
          <Text style={styles.personalized}>{t('onboarding.flow.value.noDataSubtitle')}</Text>
          <View style={styles.fallbackCard}>
            <Text style={styles.fallbackTitle}>{t('onboarding.flow.value.noDataPreviewTitle')}</Text>
            <Text style={styles.fallbackBody}>{t('onboarding.flow.value.noDataPreviewBody')}</Text>
          </View>
        </>
      ) : (
        <>
          {insights?.personalizedHeadlineKey ? (
            <Text style={styles.personalized}>{t(insights.personalizedHeadlineKey)}</Text>
          ) : null}

          {loading ? (
            <View style={styles.loading}>
              <ActivityIndicator color={OnboardingColors.green} />
            </View>
          ) : insights ? (
            <>
              {insights.isEstimate && insights.estimateLabelKey ? (
                <View style={styles.estimateBadge}>
                  <Text style={styles.estimateText}>{t(insights.estimateLabelKey)}</Text>
                </View>
              ) : null}

              <MoneyLeakWidget report={insights.report} isPro={false} />

              {!insights.report.hasData ? (
                <View style={styles.fallbackCard}>
                  <Text style={styles.fallbackTitle}>{t('onboarding.flow.value.fallbackTitle')}</Text>
                  <Text style={styles.fallbackBody}>{t('onboarding.flow.value.fallbackBody')}</Text>
                </View>
              ) : null}
            </>
          ) : null}
        </>
      )}

      <Pressable
        style={({ pressed }) => [OnboardingPrimaryCta, pressed && styles.pressed]}
        onPress={onContinue}
        accessibilityRole="button"
        accessibilityLabel={t('onboarding.flow.value.continue')}
      >
        <Text style={OnboardingPrimaryCtaText}>{t('onboarding.flow.value.continue')}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingTop: 16, paddingBottom: 24, gap: 14 },
  title: {
    color: OnboardingColors.text,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.4,
    lineHeight: 34,
  },
  personalized: {
    color: OnboardingColors.textMuted,
    fontSize: 16,
    lineHeight: 23,
  },
  loading: { paddingVertical: 32, alignItems: 'center' },
  estimateBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFBEB',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  estimateText: {
    color: '#92400E',
    fontSize: 12,
    fontWeight: '700',
  },
  fallbackCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: OnboardingColors.border,
    gap: 6,
  },
  fallbackTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: OnboardingColors.text,
  },
  fallbackBody: {
    fontSize: 13,
    lineHeight: 19,
    color: OnboardingColors.textMuted,
  },
  pressed: { opacity: 0.9 },
});
