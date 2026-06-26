import { useRouter } from 'expo-router';

import { useState } from 'react';

import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { SymbolView } from 'expo-symbols';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';

import { ScreenHeader } from '@/src/components/ScreenHeader';
import { ProPlanFeaturesList } from '@/src/components/ProPlanFeaturesList';

import {
  CONTINUE_FREE_LABEL,
  FREE_PLAN_FEATURES,
  PAYWALL_HEADLINE,
  PAYWALL_SUBHEAD,
  PRO_BADGE_LABEL,
  PRO_CTA_LABEL,
  PRO_CTA_SUBTEXT,
  PRO_MONTHLY_PRICE,
  PRO_PLAN_LEAD,
  PRO_YEARLY_PRICE,
  PRO_YEARLY_PRICE_PER_MONTH,
  YEARLY_SAVINGS_PERCENT,
  proYearlyLabel,
} from '@/src/constants/proPricing';

import { useSubscriptionStore } from '@/src/store/useSubscriptionStore';

import { getSubscriptionBillingMode } from '@/src/services/subscriptionService';

import { getScreenBottomPadding } from '@/src/utils/safeAreaLayout';

const BG = '#0F0F0F';

const GREEN = '#22C55E';

const TEXT_PRIMARY = '#FFFFFF';

const TEXT_MUTED = 'rgba(255,255,255,0.55)';

const CARD_BG = 'rgba(255,255,255,0.05)';

const CARD_BORDER = 'rgba(255,255,255,0.1)';

const WIDE_LAYOUT_MIN_WIDTH = 560;

const PLANS = [
  {
    id: 'free' as const,
    name: 'Free',
    price: '$0',
    period: 'forever',
    features: FREE_PLAN_FEATURES,
    accent: null,
  },
  {
    id: 'pro' as const,
    name: 'Pro',
    price: PRO_MONTHLY_PRICE,
    period: '/month',
    isPro: true,
    accent: GREEN,
    badge: PRO_BADGE_LABEL,
    highlighted: true,
  },
];

function getProPrice(billing: 'monthly' | 'yearly'): string {
  return billing === 'yearly' ? PRO_YEARLY_PRICE_PER_MONTH : PRO_MONTHLY_PRICE;
}

function getProPeriod(billing: 'monthly' | 'yearly'): string {
  return billing === 'yearly' ? '/mo billed yearly' : '/month';
}

function getCtaLabel(billing: 'monthly' | 'yearly', upgrading: boolean): string {
  if (upgrading) return 'Processing...';

  const price = billing === 'yearly' ? proYearlyLabel : `${PRO_MONTHLY_PRICE}/month`;

  return `${PRO_CTA_LABEL} — ${price}`;
}

export default function PaywallScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_LAYOUT_MIN_WIDTH;
  const upgradeToPro = useSubscriptionStore((s) => s.upgradeToPro);
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPro, setSelectedPro] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const billingMode = getSubscriptionBillingMode();

  const handleUpgrade = async () => {
    if (!selectedPro) return;
    setUpgrading(true);
    try {
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
      <ScreenHeader title="Choose your plan" />

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: getScreenBottomPadding(insets.bottom) }]}>
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>💰</Text>
          <Text style={styles.heroTitle}>{PAYWALL_HEADLINE}</Text>
          <Text style={styles.heroSub}>{PAYWALL_SUBHEAD}</Text>
        </View>

        <View style={styles.billingToggle}>
          <Pressable
            style={[styles.billingBtn, billing === 'monthly' && styles.billingBtnActive]}
            onPress={() => setBilling('monthly')}>
            <Text style={[styles.billingText, billing === 'monthly' && styles.billingTextActive]}>Monthly</Text>
          </Pressable>
          <Pressable
            style={[styles.billingBtn, billing === 'yearly' && styles.billingBtnActive]}
            onPress={() => setBilling('yearly')}>
            <Text style={[styles.billingText, billing === 'yearly' && styles.billingTextActive]}>
              Yearly (save {YEARLY_SAVINGS_PERCENT}%)
            </Text>
          </Pressable>
        </View>

        <View style={[styles.plansRow, isWide && styles.plansRowWide]}>
          {PLANS.map((plan) => {
            const isPaid = plan.id !== 'free';
            const isSelected = isPaid && selectedPro;
            const accent = plan.accent ?? CARD_BORDER;

            return (
              <Pressable
                key={plan.id}
                disabled={!isPaid}
                onPress={() => isPaid && setSelectedPro(true)}
                style={[
                  styles.planCard,
                  isWide && styles.planCardWide,
                  plan.highlighted && styles.planCardHighlighted,
                  isSelected && { borderColor: accent, borderWidth: 2 },
                  !isPaid && styles.planCardFree,
                ]}>
                {'badge' in plan && plan.badge ? (
                  <Text style={styles.planBadge}>{plan.badge}</Text>
                ) : null}
                <Text style={styles.planName}>{plan.name}</Text>
                <View style={styles.priceRow}>
                  <Text style={[styles.planPrice, plan.accent && { color: plan.accent }]}>
                    {isPaid ? getProPrice(billing) : plan.price}
                  </Text>
                  <Text style={styles.planPeriod}>{isPaid ? getProPeriod(billing) : plan.period}</Text>
                </View>
                {isPaid && billing === 'yearly' ? (
                  <Text style={styles.yearlyNote}>{PRO_YEARLY_PRICE} billed annually</Text>
                ) : null}
                <View style={styles.featureList}>
                  {'isPro' in plan && plan.isPro ? (
                    <ProPlanFeaturesList
                      variant="full"
                      leadLabel={PRO_PLAN_LEAD}
                      accentColor={plan.accent ?? GREEN}
                      mutedColor={TEXT_MUTED}
                      featureTextStyle={styles.featureText}
                      leadTextStyle={styles.featureText}
                    />
                  ) : (
                    FREE_PLAN_FEATURES.map((f) => (
                      <View key={f} style={styles.featureRow}>
                        <View style={styles.featureIconWrap}>
                          <SymbolView
                            name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
                            tintColor={plan.accent ?? TEXT_MUTED}
                            size={18}
                          />
                        </View>
                        <Text style={styles.featureText}>{f}</Text>
                      </View>
                    ))
                  )}
                </View>
                {isPaid ? (
                  <View style={[styles.selectIndicator, isSelected && { backgroundColor: `${accent}22` }]}>
                    <View style={[styles.selectDot, isSelected && { backgroundColor: accent }]} />
                    <Text style={[styles.selectText, isSelected && { color: TEXT_PRIMARY }]}>
                      {isSelected ? 'Selected' : 'Select plan'}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <Pressable
          style={[styles.upgradeBtn, upgrading && styles.upgradeBtnDisabled]}
          disabled={upgrading || !selectedPro}
          onPress={handleUpgrade}>
          <Text style={styles.upgradeBtnText}>{getCtaLabel(billing, upgrading)}</Text>
        </Pressable>

        <Text style={styles.ctaSubtext}>{PRO_CTA_SUBTEXT}</Text>

        <Pressable style={styles.freeLink} onPress={() => router.back()}>
          <Text style={styles.freeLinkText}>{CONTINUE_FREE_LABEL}</Text>
        </Pressable>

        <Text style={styles.disclaimer}>
          {billingMode === 'revenuecat'
            ? 'Subscriptions are billed through the App Store or Google Play. Manage or cancel in your device subscription settings.'
            : billingMode === 'mock'
              ? 'Dev mock billing — no payment processed. Subscription is stored locally on this device.'
              : 'In-app purchases are not configured yet. Set RevenueCat API keys for native builds.'}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  content: { padding: 16, paddingBottom: 16 },
  hero: { alignItems: 'center', marginBottom: 24 },
  heroEmoji: { fontSize: 44, marginBottom: 12 },
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
  plansRowWide: { flexDirection: 'row', alignItems: 'stretch' },
  planCard: {
    flex: 1,
    backgroundColor: CARD_BG,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  planCardWide: { minWidth: 0 },
  planCardHighlighted: { borderColor: 'rgba(34,197,94,0.35)' },
  planCardFree: { opacity: 0.92 },
  planBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: GREEN,
    marginBottom: 6,
  },
  planName: { fontSize: 20, fontWeight: '800', color: TEXT_PRIMARY },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 },
  planPrice: { fontSize: 32, fontWeight: '800', color: TEXT_PRIMARY },
  planPeriod: { fontSize: 14, color: TEXT_MUTED },
  yearlyNote: { fontSize: 12, color: TEXT_MUTED, marginTop: 2 },
  featureList: { marginTop: 16, paddingRight: 4, gap: 10 },
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
  upgradeBtn: {
    backgroundColor: GREEN,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  upgradeBtnDisabled: { opacity: 0.7 },
  upgradeBtnText: { fontSize: 16, fontWeight: '800', color: '#000' },
  ctaSubtext: {
    fontSize: 13,
    color: TEXT_MUTED,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 18,
  },
  freeLink: { alignItems: 'center', marginTop: 8, paddingVertical: 10 },
  freeLinkText: { fontSize: 14, fontWeight: '600', color: TEXT_MUTED },
  disclaimer: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 16,
  },
});
