import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
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
  PRO_MONTHLY_PRICE,
  PRO_YEARLY_PRICE,
  PRO_YEARLY_PRICE_PER_MONTH,
  YEARLY_SAVINGS_PERCENT,
  proMonthlyLabel,
  proYearlyLabel,
} from '@/src/constants/proPricing';
import { useSubscriptionStore } from '@/src/store/useSubscriptionStore';
import { getSubscriptionBillingMode } from '@/src/services/subscriptionService';
import { SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';
import { getScreenBottomPadding } from '@/src/utils/safeAreaLayout';

const BG = '#0F0F0F';
const GREEN = '#22C55E';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_MUTED = 'rgba(255,255,255,0.55)';
const CARD_BG = 'rgba(255,255,255,0.05)';
const CARD_BORDER = 'rgba(255,255,255,0.1)';
const PRO_GRADIENT = ['#0F1F14', '#122618', '#14532D'] as const;

const PLANS = [
  {
    id: 'pro' as const,
    name: 'Pro',
    price: PRO_MONTHLY_PRICE,
    period: '/month',
    isPro: true,
    accent: GREEN,
    badge: PRO_BADGE_LABEL,
    urgency: 'Pays for itself the first time you catch a price drop.',
    highlighted: true,
  },
  {
    id: 'free' as const,
    name: 'Free',
    price: '$0',
    period: 'forever',
    features: FREE_PLAN_FEATURES,
    accent: null,
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
  const price = billing === 'yearly' ? proYearlyLabel : proMonthlyLabel;
  return `${PRO_CTA_LABEL} — ${price}`;
}

export default function PaywallScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
            onPress={() => setBilling('monthly')}
          >
            <Text style={[styles.billingText, billing === 'monthly' && styles.billingTextActive]}>Monthly</Text>
          </Pressable>
          <Pressable
            style={[styles.billingBtn, billing === 'yearly' && styles.billingBtnActive]}
            onPress={() => setBilling('yearly')}
          >
            <Text style={[styles.billingText, billing === 'yearly' && styles.billingTextActive]}>
              Yearly (save {YEARLY_SAVINGS_PERCENT}%)
            </Text>
          </Pressable>
        </View>

        {PLANS.map((plan) => {
          const isPaid = plan.id !== 'free';
          const isSelected = isPaid && selectedPro;
          const accent = plan.accent ?? CARD_BORDER;

          const cardContent = (
            <>
              {'badge' in plan && plan.badge ? (
                <View style={styles.popularBadge}>
                  <SymbolView
                    name={{ ios: 'star.fill', android: 'star', web: 'star' }}
                    tintColor={GREEN}
                    size={11}
                  />
                  <Text style={styles.popularText}>{plan.badge}</Text>
                </View>
              ) : null}

              <Text style={[styles.planName, isPaid && styles.planNamePro]}>{plan.name}</Text>

              <View style={styles.priceRow}>
                <Text style={[styles.planPrice, isPaid && styles.planPricePro, plan.accent && { color: plan.accent }]}>
                  {isPaid ? getProPrice(billing) : plan.price}
                </Text>
                <Text style={[styles.planPeriod, isPaid && styles.planPeriodPro]}>
                  {isPaid ? getProPeriod(billing) : plan.period}
                </Text>
              </View>

              {isPaid && billing === 'yearly' ? (
                <Text style={styles.yearlyNote}>{PRO_YEARLY_PRICE} billed annually</Text>
              ) : null}

              {'urgency' in plan && plan.urgency && isSelected ? (
                <Text style={styles.urgencyText}>{plan.urgency}</Text>
              ) : null}

              <View style={styles.featureList}>
                {'isPro' in plan && plan.isPro ? (
                  <ProPlanFeaturesList
                    variant="premium"
                    accentColor={plan.accent ?? GREEN}
                    mutedColor={TEXT_MUTED}
                    featureTextStyle={styles.proFeatureText}
                  />
                ) : (
                  FREE_PLAN_FEATURES.map((f) => (
                    <View key={f} style={styles.featureRow}>
                      <View style={styles.featureIconWrap}>
                        <SymbolView
                          name={{ ios: 'checkmark.circle', android: 'check', web: 'check' }}
                          tintColor={TEXT_MUTED}
                          size={16}
                        />
                      </View>
                      <Text style={styles.freeFeatureText}>{f}</Text>
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
            </>
          );

          if (isPaid) {
            return (
              <Pressable
                key={plan.id}
                onPress={() => setSelectedPro(true)}
                style={({ pressed }) => [
                  styles.proCardOuter,
                  isSelected && styles.proCardOuterSelected,
                  pressed && styles.proCardPressed,
                ]}
              >
                <LinearGradient
                  colors={[...PRO_GRADIENT]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.proCardGradient}
                >
                  {cardContent}
                </LinearGradient>
              </Pressable>
            );
          }

          return (
            <View key={plan.id} style={styles.planCardFree}>
              {cardContent}
            </View>
          );
        })}

        <Pressable
          style={[styles.upgradeBtn, upgrading && styles.upgradeBtnDisabled]}
          disabled={upgrading || !selectedPro}
          onPress={handleUpgrade}
        >
          <Text style={styles.upgradeBtnText}>{getCtaLabel(billing, upgrading)}</Text>
        </Pressable>

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
  proCardOuter: {
    borderRadius: SmartCartRadius.lg,
    marginBottom: 14,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(34,197,94,0.35)',
    ...SmartCartShadow.glow,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : null),
  },
  proCardOuterSelected: {
    borderColor: GREEN,
    borderWidth: 2,
  },
  proCardPressed: { opacity: 0.96 },
  proCardGradient: {
    padding: 20,
    borderRadius: SmartCartRadius.lg,
  },
  planCardFree: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: SmartCartRadius.lg,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    opacity: 0.82,
  },
  popularBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(34,197,94,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.4)',
  },
  popularText: { fontSize: 11, fontWeight: '800', color: GREEN, letterSpacing: 0.2 },
  planName: { fontSize: 18, fontWeight: '700', color: TEXT_MUTED },
  planNamePro: { fontSize: 22, fontWeight: '800', color: TEXT_PRIMARY },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 },
  planPrice: { fontSize: 28, fontWeight: '800', color: TEXT_PRIMARY },
  planPricePro: { fontSize: 38, letterSpacing: -0.8 },
  planPeriod: { fontSize: 13, color: TEXT_MUTED },
  planPeriodPro: { fontSize: 14, color: 'rgba(255,255,255,0.65)' },
  yearlyNote: { fontSize: 12, color: TEXT_MUTED, marginTop: 2 },
  urgencyText: {
    fontSize: 13,
    fontWeight: '600',
    color: GREEN,
    marginTop: 10,
    lineHeight: 18,
    maxWidth: '100%',
  },
  featureList: { marginTop: 16, paddingRight: 4 },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    width: '100%',
  },
  featureIconWrap: {
    width: 16,
    height: 16,
    flexShrink: 0,
    marginTop: 2,
  },
  freeFeatureText: {
    flex: 1,
    flexShrink: 1,
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    lineHeight: 18,
  },
  proFeatureText: {
    fontSize: 13,
    lineHeight: 19,
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
    ...SmartCartShadow.pill,
  },
  upgradeBtnDisabled: { opacity: 0.7 },
  upgradeBtnText: { fontSize: 16, fontWeight: '800', color: '#000' },
  freeLink: { alignItems: 'center', marginTop: 14, paddingVertical: 10 },
  freeLinkText: { fontSize: 14, fontWeight: '600', color: TEXT_MUTED },
  disclaimer: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 16,
    maxWidth: 340,
    alignSelf: 'center',
  },
});
