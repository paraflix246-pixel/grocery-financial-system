import { useCallback, useEffect, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PennyPantryLogo } from '@/src/components/PennyPantryLogo';
import { ProPlanFeaturesList } from '@/src/components/ProPlanFeaturesList';
import {
  COMMIT_NOTE,
  CONTINUE_FREE_LABEL,
  FAMILY_MONTHLY_PRICE,
  FAMILY_PLAN_LEAD,
  formatProMonthlyPrice,
  PRO_MONTHLY_PRICE,
  PRO_PLAN_LEAD,
  SUBSCRIPTION_HEADLINE,
  SUBSCRIPTION_SUBHEAD,
} from '@/src/constants/proPricing';
import { useAdminPaywallBypass } from '@/src/hooks/useAdminPaywallBypass';
import { resolveAppUserId } from '@/src/services/authService';
import { loadOnboardingValueInsights } from '@/src/services/onboardingValueInsights';
import {
  loadOnboardingProgress,
  shouldShowPaywallFreeJoinFallback,
} from '@/src/services/onboardingFlowState';
import { useBudgetStore } from '@/src/store/useBudgetStore';
import { useSubscriptionStore } from '@/src/store/useSubscriptionStore';
import { FamilyWorkspaceTheme } from '@/src/theme/familyWorkspaceTheme';
import { formatCurrency } from '@/src/utils/priceParser';
import { buildPaywallHref } from '@/src/utils/paywallRoutes';
import { navigateToOnboardingWelcome } from '@/src/utils/onboardingWelcomeNavigation';
import { getScreenBottomPadding } from '@/src/utils/safeAreaLayout';

const BG = '#0F0F0F';
const GREEN = '#22C55E';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_MUTED = 'rgba(255,255,255,0.52)';
const CARD_BG = 'rgba(255,255,255,0.05)';
const FAMILY = FamilyWorkspaceTheme;

type PlanChoice = 'household' | 'pro';

type Props = {
  embedded?: boolean;
  onFinished?: () => void;
  onLogoPress?: () => void;
};

export function OnboardingSubscriptionScreen({
  embedded = false,
  onFinished,
  onLogoPress,
}: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  useAdminPaywallBypass();
  const completeOnboarding = useBudgetStore((s) => s.completeOnboarding);
  const startProTrial = useSubscriptionStore((s) => s.startProTrial);
  const [selectedPlan, setSelectedPlan] = useState<PlanChoice>('household');
  const [upgrading, setUpgrading] = useState(false);
  const [roiAmount, setRoiAmount] = useState<number | null>(null);

  useEffect(() => {
    void loadOnboardingProgress().then((progress) =>
      loadOnboardingValueInsights(progress.goals).then((insights) => {
        if (insights.report.estimatedAtRisk != null && insights.report.estimatedAtRisk > 0) {
          setRoiAmount(insights.report.estimatedAtRisk);
        }
      })
    );
  }, []);

  const finishToHome = useCallback(async () => {
    await completeOnboarding();
    onFinished?.();
    router.replace('/(tabs)' as Href);
  }, [completeOnboarding, onFinished, router]);

  const handleLogoHome = useCallback(async () => {
    if (onLogoPress) {
      onLogoPress();
      return;
    }
    await navigateToOnboardingWelcome(router);
  }, [onLogoPress, router]);

  async function handleContinueFree() {
    const userId = await resolveAppUserId();
    if (await shouldShowPaywallFreeJoinFallback(userId)) {
      router.push('/onboarding/join-household?from=paywall-free' as Href);
      return;
    }
    await finishToHome();
  }

  async function handleStartTrial() {
    setUpgrading(true);
    try {
      await startProTrial();
      await finishToHome();
    } finally {
      setUpgrading(false);
    }
  }

  function handlePrimarySubscribe() {
    if (selectedPlan === 'pro') {
      void handleStartTrial();
      return;
    }
    router.push(buildPaywallHref('family') as Href);
  }

  return (
    <View style={[styles.root, !embedded && { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: embedded ? 0 : 16, paddingBottom: getScreenBottomPadding(insets.bottom) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <PennyPantryLogo
            variant="hero"
            size={52}
            style={styles.heroLogo}
            onPress={() => void handleLogoHome()}
            accessibilityLabel={t('onboarding.flow.logoHomeA11y')}
          />
          <Text style={styles.heroTitle}>{SUBSCRIPTION_HEADLINE}</Text>
          <Text style={styles.heroSubtitle}>{SUBSCRIPTION_SUBHEAD}</Text>
        </View>

        {roiAmount != null ? (
          <View style={styles.roiBlock}>
            <Text style={styles.roiTitle}>{t('onboarding.flow.subscription.roiTitle')}</Text>
            <Text style={styles.roiBody}>
              {t('onboarding.flow.subscription.roiBody', {
                amount: formatCurrency(roiAmount),
                proPrice: formatProMonthlyPrice(),
              })}
            </Text>
          </View>
        ) : null}

        <Pressable
          style={({ pressed }) => [
            styles.planCard,
            styles.householdCard,
            selectedPlan === 'household' && styles.householdCardSelected,
            pressed && styles.cardPressed,
          ]}
          onPress={() => setSelectedPlan('household')}
          accessibilityRole="radio"
          accessibilityState={{ selected: selectedPlan === 'household' }}
        >
          <View style={styles.badgeRow}>
            <View style={styles.recommendedBadge}>
              <SymbolView
                name={{ ios: 'star.fill', android: 'star', web: 'star' }}
                tintColor={FAMILY.accent}
                size={12}
              />
              <Text style={styles.recommendedText}>{t('paywall.recommendedBadge')}</Text>
            </View>
          </View>
          <Text style={styles.planName}>{t('paywall.familyTitle')}</Text>
          <Text style={styles.planPrice}>
            {FAMILY_MONTHLY_PRICE}
            <Text style={styles.planPeriod}>{t('paywall.perMonth')}</Text>
          </Text>
          <Text style={styles.planLead}>{FAMILY_PLAN_LEAD}</Text>
          <Text style={styles.planFeature}>{t('paywall.features.family.sharedEconomy')}</Text>
          <Text style={styles.planFeature}>{t('paywall.features.family.liveSync')}</Text>
          <Text style={styles.planFeature}>{t('paywall.features.family.inviteFree')}</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.planCard,
            selectedPlan === 'pro' && styles.proCardSelected,
            pressed && styles.cardPressed,
          ]}
          onPress={() => setSelectedPlan('pro')}
          accessibilityRole="radio"
          accessibilityState={{ selected: selectedPlan === 'pro' }}
        >
          <Text style={styles.proBadge}>{t('paywall.proPlan')} · {t('paywall.proBadge')}</Text>
          <Text style={styles.planName}>{t('paywall.proPlan')}</Text>
          <Text style={[styles.planPrice, styles.proPrice]}>
            {PRO_MONTHLY_PRICE}
            <Text style={styles.planPeriod}>{t('paywall.perMonth')}</Text>
          </Text>
          <ProPlanFeaturesList
            variant="full"
            leadLabel={PRO_PLAN_LEAD}
            accentColor={GREEN}
            mutedColor={TEXT_MUTED}
            featureTextStyle={styles.benefitText}
            leadTextStyle={styles.benefitText}
          />
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.btnPressed]}
          onPress={handlePrimarySubscribe}
          disabled={upgrading}
          accessibilityRole="button"
          accessibilityLabel={t('onboarding.flow.subscription.continueSaving')}
        >
          <Text style={styles.primaryBtnText}>
            {upgrading
              ? t('common.processing')
              : selectedPlan === 'pro'
                ? t('paywall.startTrial')
                : t('onboarding.flow.subscription.continueSaving')}
          </Text>
        </Pressable>

        {selectedPlan === 'pro' ? (
          <Text style={styles.ctaSubtext}>{t('paywall.trialSubtext')}</Text>
        ) : (
          <Text style={styles.ctaSubtext}>{t('paywall.familyCtaSubtext')}</Text>
        )}

        <Text style={styles.commitNote}>{COMMIT_NOTE}</Text>

        <Pressable
          style={({ pressed }) => [styles.freeBtn, pressed && styles.btnPressed]}
          onPress={() => void handleContinueFree()}
          accessibilityRole="button"
          accessibilityLabel={CONTINUE_FREE_LABEL}
        >
          <Text style={styles.freeBtnText}>{CONTINUE_FREE_LABEL}</Text>
        </Pressable>

        {Platform.OS === 'web' ? null : (
          <Pressable
            style={styles.paywallLink}
            onPress={() => router.push(buildPaywallHref(selectedPlan === 'pro' ? 'pro' : 'family') as Href)}
          >
            <Text style={styles.paywallLinkText}>{t('onboarding.flow.subscription.comparePlans')}</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  scrollContent: { paddingHorizontal: 24, flexGrow: 1 },
  hero: { alignItems: 'center', marginBottom: 20 },
  heroLogo: { marginBottom: 14 },
  heroTitle: {
    color: TEXT_PRIMARY,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 34,
    marginBottom: 10,
  },
  heroSubtitle: {
    color: TEXT_MUTED,
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
  roiBlock: {
    marginBottom: 18,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.25)',
    backgroundColor: 'rgba(34,197,94,0.06)',
    gap: 4,
  },
  roiTitle: { color: GREEN, fontSize: 14, fontWeight: '800', textAlign: 'center' },
  roiBody: { color: TEXT_PRIMARY, fontSize: 13, textAlign: 'center', lineHeight: 19 },
  planCard: {
    backgroundColor: CARD_BG,
    borderRadius: 18,
    padding: 18,
    gap: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    marginBottom: 12,
  },
  householdCard: {
    borderColor: FAMILY.paywallCardBorder,
    backgroundColor: FAMILY.paywallCardBg,
  },
  householdCardSelected: { borderColor: FAMILY.accent, borderWidth: 2 },
  proCardSelected: { borderColor: GREEN, borderWidth: 2 },
  cardPressed: { opacity: 0.92 },
  badgeRow: { marginBottom: 4 },
  recommendedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: FAMILY.paywallBadgeBg,
    borderWidth: 1,
    borderColor: FAMILY.paywallBadgeBorder,
  },
  recommendedText: {
    color: FAMILY.accentLight,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  proBadge: { color: GREEN, fontSize: 12, fontWeight: '700' },
  planName: { color: TEXT_PRIMARY, fontSize: 20, fontWeight: '800' },
  planPrice: { color: TEXT_PRIMARY, fontSize: 28, fontWeight: '800' },
  proPrice: { color: GREEN },
  planPeriod: { fontSize: 14, color: TEXT_MUTED, fontWeight: '600' },
  planLead: { color: TEXT_MUTED, fontSize: 13, marginTop: 4 },
  planFeature: { color: TEXT_PRIMARY, fontSize: 13, lineHeight: 19 },
  benefitText: {
    color: TEXT_PRIMARY,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
    lineHeight: 20,
  },
  primaryBtn: {
    backgroundColor: GREEN,
    borderRadius: 999,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 8,
  },
  btnPressed: { opacity: 0.85 },
  primaryBtnText: { color: '#000', fontSize: 17, fontWeight: '800' },
  ctaSubtext: {
    color: TEXT_MUTED,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 17,
  },
  commitNote: {
    color: TEXT_MUTED,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  freeBtn: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: 999,
    paddingVertical: 15,
    alignItems: 'center',
  },
  freeBtnText: { color: TEXT_PRIMARY, fontSize: 16, fontWeight: '600' },
  paywallLink: { alignItems: 'center', paddingVertical: 12 },
  paywallLinkText: { color: FAMILY.accentLight, fontSize: 13, fontWeight: '600' },
});
