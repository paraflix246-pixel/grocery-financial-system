import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import {
  FREE_PLAN_FEATURES,
  HOUSEHOLD_CTA_LABEL,
  HOUSEHOLD_PLAN_FEATURES,
  HOUSEHOLD_MONTHLY_PRICE,
  HOUSEHOLD_YEARLY_PRICE,
  HOUSEHOLD_YEARLY_PRICE_PER_MONTH,
  PAYWALL_HEADLINE,
  PAYWALL_SUBHEAD,
  PRO_CTA_LABEL,
  PRO_MONTHLY_PRICE,
  PRO_PLAN_FEATURES,
  PRO_YEARLY_PRICE,
  PRO_YEARLY_PRICE_PER_MONTH,
  CONTINUE_FREE_LABEL,
  YEARLY_SAVINGS_PERCENT,
  householdMonthlyLabel,
  householdYearlyLabel,
  proMonthlyLabel,
  proYearlyLabel,
} from '@/src/constants/proPricing';
import { useSubscriptionStore } from '@/src/store/useSubscriptionStore';
import { getScreenBottomPadding } from '@/src/utils/safeAreaLayout';

const BG = '#0F0F0F';
const GREEN = '#22C55E';
const PURPLE = '#7C3AED';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_MUTED = 'rgba(255,255,255,0.55)';
const CARD_BG = 'rgba(255,255,255,0.05)';
const CARD_BORDER = 'rgba(255,255,255,0.1)';

type PaidTier = 'pro' | 'household';

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
    features: PRO_PLAN_FEATURES,
    accent: GREEN,
    badge: 'Most popular',
    urgency: 'Pays for itself the first time you catch a price drop.',
    highlighted: true,
  },
  {
    id: 'household' as const,
    name: 'Household',
    price: HOUSEHOLD_MONTHLY_PRICE,
    period: '/month',
    features: HOUSEHOLD_PLAN_FEATURES,
    accent: PURPLE,
    badge: 'Best for families',
  },
];

function getPaidPrice(tier: PaidTier, billing: 'monthly' | 'yearly'): string {
  if (tier === 'pro') {
    return billing === 'yearly' ? PRO_YEARLY_PRICE_PER_MONTH : PRO_MONTHLY_PRICE;
  }
  return billing === 'yearly' ? HOUSEHOLD_YEARLY_PRICE_PER_MONTH : HOUSEHOLD_MONTHLY_PRICE;
}

function getPaidPeriod(tier: PaidTier, billing: 'monthly' | 'yearly'): string {
  if (billing === 'yearly') return '/mo billed yearly';
  return '/month';
}

function getYearlyNote(tier: PaidTier): string {
  return tier === 'pro' ? `${PRO_YEARLY_PRICE} billed annually` : `${HOUSEHOLD_YEARLY_PRICE} billed annually`;
}

function getCtaLabel(tier: PaidTier, billing: 'monthly' | 'yearly', upgrading: boolean): string {
  if (upgrading) return 'Processing...';
  const price = billing === 'yearly'
    ? (tier === 'pro' ? proYearlyLabel : householdYearlyLabel)
    : (tier === 'pro' ? proMonthlyLabel : householdMonthlyLabel);
  if (tier === 'pro') return `${PRO_CTA_LABEL} — ${price}`;
  return `${HOUSEHOLD_CTA_LABEL} — ${price}`;
}

export default function PaywallScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const upgradeToPro = useSubscriptionStore((s) => s.upgradeToPro);
  const upgradeToHousehold = useSubscriptionStore((s) => s.upgradeToHousehold);
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedTier, setSelectedTier] = useState<PaidTier>('pro');
  const [upgrading, setUpgrading] = useState(false);

  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      if (selectedTier === 'household') {
        await upgradeToHousehold(billing);
      } else {
        await upgradeToPro(billing);
      }
      router.replace('/subscriptions' as never);
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

        {PLANS.map((plan) => {
          const isPaid = plan.id !== 'free';
          const isSelected = isPaid && selectedTier === plan.id;
          const accent = plan.accent ?? CARD_BORDER;

          return (
            <Pressable
              key={plan.id}
              disabled={!isPaid}
              onPress={() => isPaid && setSelectedTier(plan.id)}
              style={[
                styles.planCard,
                plan.highlighted && styles.planCardHighlighted,
                isSelected && { borderColor: accent, borderWidth: 2 },
                !isPaid && styles.planCardFree,
              ]}>
              {'badge' in plan && plan.badge && (
                <View style={[styles.popularBadge, plan.id === 'household' && styles.householdBadge]}>
                  <Text style={[styles.popularText, plan.id === 'household' && styles.householdBadgeText]}>
                    {plan.badge}
                  </Text>
                </View>
              )}
              <Text style={styles.planName}>{plan.name}</Text>
              <View style={styles.priceRow}>
                <Text style={[styles.planPrice, plan.accent && { color: plan.accent }]}>
                  {isPaid ? getPaidPrice(plan.id, billing) : plan.price}
                </Text>
                <Text style={styles.planPeriod}>
                  {isPaid ? getPaidPeriod(plan.id, billing) : plan.period}
                </Text>
              </View>
              {isPaid && billing === 'yearly' && (
                <Text style={styles.yearlyNote}>{getYearlyNote(plan.id)}</Text>
              )}
              {'urgency' in plan && plan.urgency && isSelected && (
                <Text style={styles.urgencyText}>{plan.urgency}</Text>
              )}
              <View style={styles.featureList}>
                {plan.features.map((f) => (
                  <View key={f} style={styles.featureRow}>
                    <SymbolView
                      name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
                      tintColor={plan.accent ?? TEXT_MUTED}
                      size={18}
                    />
                    <Text style={styles.featureText}>{f}</Text>
                  </View>
                ))}
              </View>
              {isPaid && (
                <View style={[styles.selectIndicator, isSelected && { backgroundColor: `${accent}22` }]}>
                  <View style={[styles.selectDot, isSelected && { backgroundColor: accent }]} />
                  <Text style={[styles.selectText, isSelected && { color: TEXT_PRIMARY }]}>
                    {isSelected ? 'Selected' : 'Select plan'}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}

        <Pressable
          style={[styles.upgradeBtn, selectedTier === 'household' && styles.householdBtn, upgrading && styles.upgradeBtnDisabled]}
          disabled={upgrading}
          onPress={handleUpgrade}>
          <Text style={styles.upgradeBtnText}>{getCtaLabel(selectedTier, billing, upgrading)}</Text>
        </Pressable>

        <Pressable style={styles.freeLink} onPress={() => router.back()}>
          <Text style={styles.freeLinkText}>{CONTINUE_FREE_LABEL}</Text>
        </Pressable>

        <Text style={styles.disclaimer}>
          Mock purchase for MVP. No payment processed. Subscription stored locally on this device.
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
  heroTitle: { fontSize: 24, fontWeight: '800', color: TEXT_PRIMARY, textAlign: 'center', letterSpacing: -0.4, lineHeight: 30 },
  heroSub: { fontSize: 14, color: TEXT_MUTED, textAlign: 'center', marginTop: 10, lineHeight: 21, maxWidth: 320 },
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
  planCard: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  planCardHighlighted: { borderColor: 'rgba(34,197,94,0.35)' },
  planCardFree: { opacity: 0.92 },
  popularBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(34,197,94,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)',
  },
  householdBadge: {
    backgroundColor: 'rgba(124,58,237,0.15)',
    borderColor: 'rgba(124,58,237,0.35)',
  },
  popularText: { fontSize: 11, fontWeight: '700', color: GREEN },
  householdBadgeText: { color: PURPLE },
  planName: { fontSize: 20, fontWeight: '800', color: TEXT_PRIMARY },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 },
  planPrice: { fontSize: 32, fontWeight: '800', color: TEXT_PRIMARY },
  planPeriod: { fontSize: 14, color: TEXT_MUTED },
  yearlyNote: { fontSize: 12, color: TEXT_MUTED, marginTop: 2 },
  urgencyText: {
    fontSize: 13,
    fontWeight: '600',
    color: GREEN,
    marginTop: 10,
    lineHeight: 18,
  },
  featureList: { marginTop: 16, gap: 10 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { flex: 1, fontSize: 14, color: 'rgba(255,255,255,0.88)', lineHeight: 20 },
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
  householdBtn: { backgroundColor: PURPLE },
  upgradeBtnDisabled: { opacity: 0.7 },
  upgradeBtnText: { fontSize: 16, fontWeight: '800', color: '#000' },
  freeLink: { alignItems: 'center', marginTop: 14, paddingVertical: 10 },
  freeLinkText: { fontSize: 14, fontWeight: '600', color: TEXT_MUTED },
  disclaimer: { fontSize: 11, color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginTop: 16, lineHeight: 16 },
});
