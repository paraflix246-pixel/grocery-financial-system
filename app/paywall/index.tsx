import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { useSubscriptionStore } from '@/src/store/useSubscriptionStore';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';

const PLANS = [
  {
    id: 'free' as const,
    name: 'Free',
    price: '$0',
    period: 'forever',
    features: [
      'Receipt scanning & lists',
      'Basic spending analytics',
      'Price alerts from your history',
      'Store comparison (estimates)',
    ],
  },
  {
    id: 'pro' as const,
    name: 'Pro',
    price: '$4.99',
    period: '/month',
    yearlyPrice: '$39.99/yr',
    features: [
      'AI Insights Pro',
      'Personal inflation tracker',
      'Community price data',
      'Family list sharing',
      'Advanced usage analytics',
      'Developer API access',
    ],
    highlighted: true,
  },
];

export default function PaywallScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const upgradeToPro = useSubscriptionStore((s) => s.upgradeToPro);
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [upgrading, setUpgrading] = useState(false);

  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      await upgradeToPro(billing);
      router.replace('/subscriptions' as never);
    } finally {
      setUpgrading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader title="SmartCart Pro" />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>⭐</Text>
          <Text style={styles.heroTitle}>Unlock your full grocery intelligence</Text>
          <Text style={styles.heroSub}>
            Pro features use your real receipt data for deeper insights — no cloud account required.
          </Text>
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
            <Text style={[styles.billingText, billing === 'yearly' && styles.billingTextActive]}>Yearly (save 33%)</Text>
          </Pressable>
        </View>

        {PLANS.map((plan) => (
          <View
            key={plan.id}
            style={[styles.planCard, plan.highlighted && styles.planCardPro]}>
            {plan.highlighted && (
              <View style={styles.popularBadge}>
                <Text style={styles.popularText}>Most popular</Text>
              </View>
            )}
            <Text style={styles.planName}>{plan.name}</Text>
            <View style={styles.priceRow}>
              <Text style={styles.planPrice}>
                {plan.id === 'pro' && billing === 'yearly' ? '$3.33' : plan.price}
              </Text>
              <Text style={styles.planPeriod}>
                {plan.id === 'pro' ? (billing === 'yearly' ? '/mo billed yearly' : plan.period) : plan.period}
              </Text>
            </View>
            {plan.id === 'pro' && billing === 'yearly' && (
              <Text style={styles.yearlyNote}>$39.99 billed annually</Text>
            )}
            <View style={styles.featureList}>
              {plan.features.map((f) => (
                <View key={f} style={styles.featureRow}>
                  <SymbolView
                    name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
                    tintColor={plan.highlighted ? SmartCartColors.primary : SmartCartColors.textMuted}
                    size={18}
                  />
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}

        <Pressable
          style={[styles.upgradeBtn, upgrading && styles.upgradeBtnDisabled]}
          disabled={upgrading}
          onPress={handleUpgrade}>
          <Text style={styles.upgradeBtnText}>
            {upgrading ? 'Processing...' : `Start Pro — ${billing === 'yearly' ? '$39.99/yr' : '$4.99/mo'}`}
          </Text>
        </Pressable>

        <Text style={styles.disclaimer}>
          Mock purchase for MVP. No payment processed. Subscription stored locally on this device.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SmartCartColors.background },
  content: { padding: 16, paddingBottom: 40 },
  hero: { alignItems: 'center', marginBottom: 24 },
  heroEmoji: { fontSize: 48, marginBottom: 8 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: SmartCartColors.text, textAlign: 'center' },
  heroSub: { fontSize: 14, color: SmartCartColors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  billingToggle: {
    flexDirection: 'row',
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.pill,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
  },
  billingBtn: { flex: 1, paddingVertical: 10, borderRadius: SmartCartRadius.pill, alignItems: 'center' },
  billingBtnActive: { backgroundColor: SmartCartColors.primary },
  billingText: { fontSize: 13, fontWeight: '600', color: SmartCartColors.textSecondary },
  billingTextActive: { color: '#fff' },
  planCard: {
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.lg,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    ...SmartCartShadow.card,
  },
  planCardPro: { borderColor: SmartCartColors.primary, borderWidth: 2 },
  popularBadge: {
    alignSelf: 'flex-start',
    backgroundColor: SmartCartColors.badge,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: SmartCartRadius.pill,
    marginBottom: 10,
  },
  popularText: { fontSize: 11, fontWeight: '700', color: SmartCartColors.primaryDark },
  planName: { fontSize: 20, fontWeight: '800', color: SmartCartColors.text },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 },
  planPrice: { fontSize: 32, fontWeight: '800', color: SmartCartColors.primaryDark },
  planPeriod: { fontSize: 14, color: SmartCartColors.textSecondary },
  yearlyNote: { fontSize: 12, color: SmartCartColors.textMuted, marginTop: 2 },
  featureList: { marginTop: 16, gap: 10 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { flex: 1, fontSize: 14, color: SmartCartColors.text, lineHeight: 20 },
  upgradeBtn: {
    backgroundColor: SmartCartColors.primary,
    borderRadius: SmartCartRadius.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    ...SmartCartShadow.card,
  },
  upgradeBtnDisabled: { opacity: 0.7 },
  upgradeBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  disclaimer: { fontSize: 11, color: SmartCartColors.textMuted, textAlign: 'center', marginTop: 16, lineHeight: 16 },
});
