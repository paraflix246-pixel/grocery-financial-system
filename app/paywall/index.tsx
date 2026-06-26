import { useRouter } from 'expo-router';

import { useState } from 'react';

import { Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import type { ComponentProps } from 'react';

import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';

import { ScreenHeader } from '@/src/components/ScreenHeader';
import { PennyPantryLogo } from '@/src/components/PennyPantryLogo';
import { LegalFooter } from '@/src/components/legal/LegalFooter';
import { FamilyPlanFeaturesList } from '@/src/components/FamilyPlanFeaturesList';
import { ProPlanFeaturesList } from '@/src/components/ProPlanFeaturesList';

import {
  COMMIT_NOTE,
  CONTINUE_FREE_LABEL,
  FAMILY_BADGE_LABEL,
  FAMILY_CTA_SUBTEXT,
  FAMILY_MONTHLY_PRICE,
  FAMILY_PLAN_LEAD,
  FAMILY_SUBSCRIBE_LABEL,
  FAMILY_YEARLY_PRICE,
  FAMILY_YEARLY_PRICE_PER_MONTH,
  FREE_MAX_STORES,
  FREE_PANTRY_MAX_ITEMS,
  FREE_PRICE_HISTORY_DAYS,
  FREE_RECEIPT_SCAN_LIMIT,
  PRO_MONTHLY_PRICE,
  PRO_PLAN_LEAD,
  PRO_SUBSCRIBE_LABEL,
  PRO_YEARLY_PRICE,
  PRO_YEARLY_PRICE_PER_MONTH,
  YEARLY_SAVINGS_PERCENT,
  proYearlyLabel,
} from '@/src/constants/proPricing';

import { useSubscriptionStore } from '@/src/store/useSubscriptionStore';

import { getSubscriptionBillingMode } from '@/src/services/subscriptionService';
import { redirectToStripeCheckout } from '@/src/services/stripeSubscriptionService';

import { getScreenBottomPadding } from '@/src/utils/safeAreaLayout';

const BG = '#0F0F0F';

const GREEN = '#22C55E';

const PURPLE = '#7C3AED';

const TEXT_PRIMARY = '#FFFFFF';

const TEXT_MUTED = 'rgba(255,255,255,0.55)';

const CARD_BG = 'rgba(255,255,255,0.05)';

const CARD_BORDER = 'rgba(255,255,255,0.1)';

const WIDE_LAYOUT_MIN_WIDTH = 560;

const FOOTER_ESTIMATE = 320;

const OUTCOME_KEYS = ['save', 'track', 'alerts'] as const;

type SymbolName = ComponentProps<typeof SymbolView>['name'];

const OUTCOME_ICONS: Record<(typeof OUTCOME_KEYS)[number], SymbolName> = {
  save: { ios: 'cart.fill', android: 'shopping_cart', web: 'shopping_cart' },
  track: { ios: 'chart.line.uptrend.xyaxis', android: 'trending_up', web: 'trending_up' },
  alerts: { ios: 'bell.badge.fill', android: 'notifications_active', web: 'notifications_active' },
};

function getProPrice(billing: 'monthly' | 'yearly'): string {
  return billing === 'yearly' ? PRO_YEARLY_PRICE_PER_MONTH : PRO_MONTHLY_PRICE;
}

function getProPeriod(billing: 'monthly' | 'yearly', t: (key: string) => string): string {
  return billing === 'yearly' ? t('paywall.perMonthBilledYearly') : t('paywall.perMonth');
}

function getFamilyPrice(billing: 'monthly' | 'yearly'): string {
  return billing === 'yearly' ? FAMILY_YEARLY_PRICE_PER_MONTH : FAMILY_MONTHLY_PRICE;
}

function getFamilyPeriod(billing: 'monthly' | 'yearly', t: (key: string) => string): string {
  return billing === 'yearly' ? t('paywall.perMonthBilledYearly') : t('paywall.perMonth');
}

function getSubscribeLabel(
  billing: 'monthly' | 'yearly',
  upgrading: boolean,
  t: (key: string, opts?: Record<string, string>) => string
): string {
  if (upgrading) return t('common.processing');
  const price = billing === 'yearly' ? proYearlyLabel : `${PRO_MONTHLY_PRICE}${t('paywall.perMonth')}`;
  return t('paywall.subscribeProPrice', { price });
}

function getBillingDisclaimer(
  billingMode: ReturnType<typeof getSubscriptionBillingMode>,
  t: (key: string) => string
): string {
  if (billingMode === 'stripe') return t('paywall.billingDisclaimer.stripe');
  if (billingMode === 'revenuecat') return t('paywall.billingDisclaimer.revenuecat');
  if (billingMode === 'mock') return t('paywall.billingDisclaimer.mock');
  if (Platform.OS === 'web') return t('paywall.billingDisclaimer.webUnconfigured');
  return t('paywall.billingDisclaimer.nativeUnconfigured');
}

function ProShimmerBadge({ label }: { label: string }) {
  return (
    <LinearGradient
      colors={['#22C55E', '#4ADE80', '#16A34A']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.shimmerBadge}>
      <SymbolView
        name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }}
        tintColor="#000"
        size={12}
      />
      <Text style={styles.shimmerText}>{label}</Text>
    </LinearGradient>
  );
}

export default function PaywallScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_LAYOUT_MIN_WIDTH;
  const upgradeToPro = useSubscriptionStore((s) => s.upgradeToPro);
  const startProTrial = useSubscriptionStore((s) => s.startProTrial);
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPro, setSelectedPro] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [upgradingFamily, setUpgradingFamily] = useState(false);
  const [startingTrial, setStartingTrial] = useState(false);
  const [footerHeight, setFooterHeight] = useState(FOOTER_ESTIMATE);
  const billingMode = getSubscriptionBillingMode();

  const freeFeatures = [
    t('paywall.features.free.scans', { count: FREE_RECEIPT_SCAN_LIMIT }),
    t('paywall.features.free.list'),
    t('paywall.features.free.history', { days: FREE_PRICE_HISTORY_DAYS }),
    t('paywall.features.free.alerts'),
    t('paywall.features.free.stores', { count: FREE_MAX_STORES }),
    t('paywall.features.free.pantry', { count: FREE_PANTRY_MAX_ITEMS }),
  ];

  const handleStartTrial = async () => {
    setStartingTrial(true);
    try {
      await startProTrial();
      router.replace('/(tabs)' as never);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not start trial.';
      console.warn('[paywall] trial start failed:', message);
    } finally {
      setStartingTrial(false);
    }
  };

  const handleFamilyUpgrade = async () => {
    setUpgradingFamily(true);
    try {
      if (Platform.OS === 'web' && billingMode === 'stripe') {
        await redirectToStripeCheckout(billing, 'family');
        return;
      }
      router.push('/family_plans' as never);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Purchase failed. Please try again.';
      console.warn('[paywall] family upgrade failed:', message);
    } finally {
      setUpgradingFamily(false);
    }
  };

  const handleUpgrade = async () => {
    if (!selectedPro) return;
    setUpgrading(true);
    try {
      if (Platform.OS === 'web' && billingMode === 'stripe') {
        await redirectToStripeCheckout(billing);
        return;
      }
      await upgradeToPro(billing);
      router.replace('/subscriptions' as never);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Purchase failed. Please try again.';
      console.warn('[paywall] upgrade failed:', message);
    } finally {
      setUpgrading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('paywall.title')} />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: footerHeight + 16 }]}>
        <View style={styles.hero}>
          <PennyPantryLogo variant="hero" size={52} style={styles.heroLogo} />
          <Text style={styles.heroTitle}>{t('paywall.headline')}</Text>
          <Text style={styles.heroSub}>{t('paywall.subhead')}</Text>
        </View>

        <View style={styles.outcomesSection}>
          <Text style={styles.outcomesTitle}>{t('paywall.outcomeTitle')}</Text>
          <Text style={styles.outcomesSub}>{t('paywall.outcomeSubtitle')}</Text>
          <View style={styles.outcomesGrid}>
            {OUTCOME_KEYS.map((key) => (
              <View key={key} style={styles.outcomeCard}>
                <View style={styles.outcomeIconWrap}>
                  <SymbolView name={OUTCOME_ICONS[key]} tintColor={GREEN} size={20} />
                </View>
                <Text style={styles.outcomeCardTitle}>{t(`paywall.outcomes.${key}.title`)}</Text>
                <Text style={styles.outcomeCardBody}>{t(`paywall.outcomes.${key}.body`)}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.billingToggle}>
          <Pressable
            style={[styles.billingBtn, billing === 'monthly' && styles.billingBtnActive]}
            onPress={() => setBilling('monthly')}>
            <Text style={[styles.billingText, billing === 'monthly' && styles.billingTextActive]}>
              {t('common.monthly')}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.billingBtn, billing === 'yearly' && styles.billingBtnActive]}
            onPress={() => setBilling('yearly')}>
            <Text style={[styles.billingText, billing === 'yearly' && styles.billingTextActive]}>
              {t('common.yearlySave', { percent: YEARLY_SAVINGS_PERCENT })}
            </Text>
          </Pressable>
        </View>

        <View style={[styles.plansRow, isWide && styles.plansRowWide]}>
          <View style={[styles.planCard, styles.planCardFree, isWide && styles.planCardWide]}>
            <Text style={styles.planName}>{t('paywall.freePlan')}</Text>
            <View style={styles.priceRow}>
              <Text style={styles.planPrice}>$0</Text>
              <Text style={styles.planPeriod}>{t('paywall.forever')}</Text>
            </View>
            <View style={styles.featureList}>
              {freeFeatures.map((f) => (
                <View key={f} style={styles.featureRow}>
                  <View style={styles.featureIconWrap}>
                    <SymbolView
                      name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
                      tintColor={TEXT_MUTED}
                      size={18}
                    />
                  </View>
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}
            </View>
          </View>

          <Pressable
            onPress={() => setSelectedPro(true)}
            style={[
              styles.planCard,
              isWide && styles.planCardWide,
              styles.planCardHighlighted,
              selectedPro && { borderColor: GREEN, borderWidth: 2 },
            ]}>
            <View style={styles.proBadgeRow}>
              <ProShimmerBadge label={t('paywall.proBadge')} />
            </View>
            <Text style={styles.planName}>{t('paywall.proPlan')}</Text>
            <View style={styles.priceRow}>
              <Text style={[styles.planPrice, { color: GREEN }]}>{getProPrice(billing)}</Text>
              <Text style={styles.planPeriod}>{getProPeriod(billing, t)}</Text>
            </View>
            {billing === 'yearly' ? (
              <Text style={styles.yearlyNote}>{t('paywall.billedAnnually', { price: PRO_YEARLY_PRICE })}</Text>
            ) : null}
            <View style={styles.featureList}>
              <ProPlanFeaturesList
                variant="grouped"
                leadLabel={t('paywall.proLead')}
                accentColor={GREEN}
                mutedColor={TEXT_MUTED}
                featureTextStyle={styles.featureText}
                leadTextStyle={styles.featureText}
              />
            </View>
            <View style={[styles.selectIndicator, selectedPro && { backgroundColor: `${GREEN}22` }]}>
              <View style={[styles.selectDot, selectedPro && { backgroundColor: GREEN }]} />
              <Text style={[styles.selectText, selectedPro && { color: TEXT_PRIMARY }]}>
                {selectedPro ? t('common.selected') : t('common.selectPlan')}
              </Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.familySection}>
          <Text style={styles.sectionLabel}>{t('paywall.familySection')}</Text>
          <View style={styles.familyCard}>
            <Text style={styles.familyBadge}>{FAMILY_BADGE_LABEL}</Text>
            <Text style={styles.familyTitle}>{t('paywall.familyTitle')}</Text>
            <Text style={styles.familySubtitle}>{t('paywall.familySubtitle')}</Text>
            <View style={styles.priceRow}>
              <Text style={[styles.planPrice, { color: PURPLE }]}>{getFamilyPrice(billing)}</Text>
              <Text style={styles.planPeriod}>{getFamilyPeriod(billing, t)}</Text>
            </View>
            {billing === 'yearly' ? (
              <Text style={styles.yearlyNote}>{t('paywall.billedAnnually', { price: FAMILY_YEARLY_PRICE })}</Text>
            ) : null}
            <FamilyPlanFeaturesList
              leadLabel={FAMILY_PLAN_LEAD}
              accentColor={PURPLE}
              mutedColor={TEXT_MUTED}
              featureTextStyle={styles.featureText}
              leadTextStyle={styles.featureText}
            />
            <Pressable
              style={[styles.familyBtn, upgradingFamily && styles.btnDisabled]}
              disabled={upgradingFamily}
              onPress={() => void handleFamilyUpgrade()}
              accessibilityRole="button"
              accessibilityLabel={FAMILY_SUBSCRIBE_LABEL}>
              <Text style={styles.familyBtnText}>
                {upgradingFamily
                  ? t('common.processing')
                  : `${t('paywall.familySubscribe')} — ${getFamilyPrice(billing)}/mo`}
              </Text>
            </Pressable>
            <Pressable style={styles.familyLink} onPress={() => router.push('/family_plans' as never)}>
              <Text style={styles.familyLinkText}>{t('paywall.familyJoin')}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <View
        style={[styles.footer, { paddingBottom: getScreenBottomPadding(insets.bottom) }]}
        onLayout={(e) => setFooterHeight(e.nativeEvent.layout.height)}>
        <Pressable
          style={[styles.upgradeBtn, startingTrial && styles.btnDisabled]}
          disabled={startingTrial || upgrading}
          onPress={handleStartTrial}
          accessibilityRole="button"
          accessibilityLabel={t('paywall.startTrial')}>
          <Text style={styles.upgradeBtnText}>
            {startingTrial ? t('paywall.startingTrial') : t('paywall.startTrial')}
          </Text>
        </Pressable>

        <Text style={styles.ctaSubtext}>{t('paywall.trialSubtext')}</Text>

        <Pressable
          style={[styles.subscribeBtn, (upgrading || startingTrial) && styles.btnDisabled]}
          disabled={upgrading || startingTrial || !selectedPro}
          onPress={handleUpgrade}
          accessibilityRole="button"
          accessibilityLabel={PRO_SUBSCRIBE_LABEL}>
          <Text style={styles.subscribeBtnText}>{getSubscribeLabel(billing, upgrading, t)}</Text>
        </Pressable>

        <Text style={styles.commitNote}>{COMMIT_NOTE || t('paywall.commitNote')}</Text>

        <Pressable style={styles.freeLink} onPress={() => router.back()}>
          <Text style={styles.freeLinkText}>{CONTINUE_FREE_LABEL || t('paywall.continueFree')}</Text>
        </Pressable>

        <Text style={styles.disclaimer}>{getBillingDisclaimer(billingMode, t)}</Text>

        <LegalFooter mutedColor="rgba(255,255,255,0.35)" linkColor={PURPLE} style={styles.legalFooter} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  content: { padding: 16, paddingTop: 8 },
  hero: { alignItems: 'center', marginBottom: 20 },
  heroLogo: { marginBottom: 12 },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    textAlign: 'center',
    letterSpacing: -0.4,
    lineHeight: 30,
  },
  heroSub: {
    fontSize: 14,
    color: TEXT_MUTED,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 21,
    maxWidth: 320,
  },
  outcomesSection: { marginBottom: 22 },
  outcomesTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  outcomesSub: {
    fontSize: 13,
    color: TEXT_MUTED,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 14,
    lineHeight: 19,
  },
  outcomesGrid: { gap: 10 },
  outcomeCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)',
  },
  outcomeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(34,197,94,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  outcomeCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 4,
  },
  outcomeCardBody: {
    fontSize: 12,
    color: TEXT_MUTED,
    lineHeight: 18,
  },
  billingToggle: {
    flexDirection: 'row',
    backgroundColor: CARD_BG,
    borderRadius: 999,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  billingBtn: { flex: 1, paddingVertical: 10, borderRadius: 999, alignItems: 'center' },
  billingBtnActive: { backgroundColor: GREEN },
  billingText: { fontSize: 13, fontWeight: '600', color: TEXT_MUTED },
  billingTextActive: { color: '#000' },
  plansRow: { gap: 14 },
  plansRowWide: { flexDirection: 'row', alignItems: 'flex-start' },
  planCard: {
    flex: 1,
    backgroundColor: CARD_BG,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    minHeight: 0,
  },
  planCardWide: { flexBasis: 0, minWidth: 0 },
  planCardHighlighted: { borderColor: 'rgba(34,197,94,0.35)' },
  planCardFree: { opacity: 0.92 },
  proBadgeRow: { marginBottom: 8 },
  shimmerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  shimmerText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#000',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  planName: { fontSize: 20, fontWeight: '800', color: TEXT_PRIMARY },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4, flexWrap: 'wrap' },
  planPrice: { fontSize: 32, fontWeight: '800', color: TEXT_PRIMARY },
  planPeriod: { fontSize: 14, color: TEXT_MUTED },
  yearlyNote: { fontSize: 12, color: TEXT_MUTED, marginTop: 2 },
  featureList: { marginTop: 16, gap: 10 },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    width: '100%',
  },
  featureIconWrap: {
    width: 18,
    height: 18,
    flexShrink: 0,
    marginTop: 1,
  },
  featureText: {
    flex: 1,
    flexShrink: 1,
    fontSize: 13,
    color: 'rgba(255,255,255,0.88)',
    lineHeight: 20,
  },
  selectIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  selectDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: TEXT_MUTED,
  },
  selectText: { fontSize: 12, fontWeight: '600', color: TEXT_MUTED },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  familySection: { marginTop: 28 },
  familyCard: {
    backgroundColor: 'rgba(124,58,237,0.08)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.28)',
    gap: 10,
  },
  familyBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: PURPLE,
  },
  familyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: TEXT_PRIMARY,
  },
  familySubtitle: {
    fontSize: 13,
    color: TEXT_MUTED,
    lineHeight: 19,
  },
  familyBtn: {
    marginTop: 6,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(124,58,237,0.5)',
    backgroundColor: 'rgba(124,58,237,0.12)',
  },
  familyBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: PURPLE,
  },
  familyLink: { alignItems: 'center', paddingVertical: 4 },
  familyLinkText: { fontSize: 12, fontWeight: '600', color: TEXT_MUTED },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: CARD_BORDER,
    backgroundColor: BG,
  },
  upgradeBtn: {
    backgroundColor: GREEN,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.7 },
  upgradeBtnText: { fontSize: 16, fontWeight: '800', color: '#000' },
  subscribeBtn: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  subscribeBtnText: { fontSize: 15, fontWeight: '700', color: TEXT_PRIMARY },
  ctaSubtext: {
    fontSize: 12,
    color: TEXT_MUTED,
    textAlign: 'center',
    lineHeight: 17,
    marginTop: -2,
  },
  commitNote: {
    fontSize: 12,
    color: TEXT_MUTED,
    textAlign: 'center',
    lineHeight: 17,
  },
  freeLink: { alignItems: 'center', paddingVertical: 4 },
  freeLinkText: { fontSize: 14, fontWeight: '600', color: TEXT_MUTED },
  disclaimer: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 2,
  },
  legalFooter: {
    marginTop: 0,
    paddingBottom: 2,
  },
});
