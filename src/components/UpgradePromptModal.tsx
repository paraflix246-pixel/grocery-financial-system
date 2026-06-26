import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppBottomSheetModal } from '@/src/components/AppBottomSheetModal';
import {
  COMMIT_NOTE,
  PRO_CTA_LABEL,
  PRO_FEATURE_LABELS,
  PRO_PLAN_FEATURES,
  PRO_UPGRADE_HOOK,
  proMonthlyLabel,
} from '@/src/constants/proPricing';
import { SmartCartRadius } from '@/src/theme/smartCart';

const BG = '#0F0F0F';
const GREEN = '#22C55E';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_MUTED = 'rgba(255,255,255,0.55)';
const TEXT_DIM = 'rgba(255,255,255,0.38)';
const CARD_BG = 'rgba(255,255,255,0.05)';
const CARD_BORDER = 'rgba(255,255,255,0.1)';

type Props = {
  visible: boolean;
  featureName: string;
  onUpgrade: () => void;
  onDismiss: () => void;
};

const FEATURE_BENEFITS: Record<string, readonly string[]> = {
  [PRO_FEATURE_LABELS.family_plans]: [
    'Everyone shops from the same live list',
    'No more duplicate buys or missed items',
    'Catch price changes before anyone heads to the store',
  ],
  [PRO_FEATURE_LABELS.price_drop_alerts]: [
    'Get pinged when staples you buy go on sale',
    'Stop paying full price for items you buy every week',
    PRO_FEATURE_LABELS.inflation_tracker,
  ],
  [PRO_FEATURE_LABELS.inflation_tracker]: [
    'See exactly how rising prices hit your basket',
    'Spot which categories are eating your budget',
    PRO_FEATURE_LABELS.price_drop_alerts,
  ],
  [PRO_FEATURE_LABELS.insights_pro]: [
    'Know where every grocery dollar actually goes',
    'Find the categories quietly blowing your budget',
    PRO_FEATURE_LABELS.usage_analytics,
  ],
  [PRO_FEATURE_LABELS.usage_analytics]: [
    'Look up any price you have ever paid',
    'Spot trends before your next shop',
    PRO_FEATURE_LABELS.insights_pro,
  ],
  [PRO_FEATURE_LABELS.community_pricing]: [
    'Find the cheapest store for your whole basket',
    'Stop overpaying at the wrong store',
    PRO_FEATURE_LABELS.price_drop_alerts,
  ],
  [PRO_FEATURE_LABELS.export_advanced]: [
    'Download spending logs as CSV in one tap',
    'Keep a clean record of every grocery purchase',
    PRO_PLAN_FEATURES[4],
  ],
  [PRO_FEATURE_LABELS.multi_user_sync]: [
    'Lists update on every family phone automatically',
    'Everyone sees the same prices and pantry',
    PRO_FEATURE_LABELS.family_plans,
  ],
  [PRO_FEATURE_LABELS.budget_forecasting]: [
    'See your grocery spend before month-end surprises',
    'Plan ahead instead of guessing at the register',
    PRO_PLAN_FEATURES[5],
  ],
  [PRO_FEATURE_LABELS.cheapest_basket]: [
    'Get the lowest total across your usual stores',
    'Let the app do the math — you just save',
    PRO_FEATURE_LABELS.community_pricing,
  ],
  [PRO_FEATURE_LABELS.pantry_unlimited]: [
    'Track everything in your kitchen — no caps',
    PRO_PLAN_FEATURES[0],
    PRO_PLAN_FEATURES[2],
  ],
};

function getBenefits(featureName: string): string[] {
  const mapped = FEATURE_BENEFITS[featureName];
  if (mapped) return [...mapped].slice(0, 3);
  return [featureName, PRO_PLAN_FEATURES[2], PRO_PLAN_FEATURES[6]].slice(0, 3);
}

type BenefitRowProps = {
  text: string;
  accent: string;
};

function BenefitRow({ text, accent }: BenefitRowProps) {
  return (
    <View style={styles.benefitRow}>
      <View style={[styles.checkCircle, { backgroundColor: `${accent}22`, borderColor: `${accent}55` }]}>
        <SymbolView
          name={{ ios: 'checkmark', android: 'check', web: 'check' }}
          tintColor={accent}
          size={12}
        />
      </View>
      <Text style={styles.benefitText}>{text}</Text>
    </View>
  );
}

export function UpgradePromptModal({
  visible,
  featureName,
  onUpgrade,
  onDismiss,
}: Props) {
  const accent = GREEN;
  const benefits = useMemo(() => getBenefits(featureName), [featureName]);

  return (
    <AppBottomSheetModal
      visible={visible}
      onClose={onDismiss}
      cardStyle={styles.sheetCard}
      contentContainerStyle={styles.sheetContent}
      footerStyle={styles.sheetFooter}
      footer={
        <View style={styles.footerCol}>
          <Pressable
            style={({ pressed }) => [styles.upgradeBtn, pressed && styles.btnPressed]}
            accessibilityRole="button"
            accessibilityLabel={PRO_CTA_LABEL}
            onPress={onUpgrade}>
            <Text style={styles.upgradeText}>
              {PRO_CTA_LABEL} — {proMonthlyLabel}
            </Text>
          </Pressable>
          <Text style={styles.commitNote}>{COMMIT_NOTE}</Text>
          <Pressable
            style={({ pressed }) => [styles.dismissBtn, pressed && styles.btnPressed]}
            accessibilityRole="button"
            accessibilityLabel="Not now"
            onPress={onDismiss}>
            <Text style={styles.dismissText}>Not now</Text>
          </Pressable>
        </View>
      }>
      <View style={styles.handle} />

      <View style={styles.brandRow}>
        <Text style={styles.brandEmoji}>🛒</Text>
        <Text style={styles.brandName}>Penny Pantry</Text>
      </View>

      <LinearGradient
        colors={['rgba(34,197,94,0.2)', 'rgba(15,15,15,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}>
        <View style={[styles.iconWrap, { backgroundColor: `${accent}18`, borderColor: `${accent}44` }]}>
          <Text style={styles.heroEmoji}>👨‍👩‍👧‍👦</Text>
        </View>

        <View style={[styles.tierBadge, { backgroundColor: `${accent}1A`, borderColor: `${accent}55` }]}>
          <SymbolView
            name={{ ios: 'star.fill', android: 'star', web: 'star' }}
            tintColor={accent}
            size={11}
          />
          <Text style={[styles.tierBadgeText, { color: accent }]}>
            Pro — {proMonthlyLabel}
          </Text>
        </View>

        <Text style={styles.title}>{featureName}</Text>
        <Text style={[styles.hook, { color: accent }]}>{PRO_UPGRADE_HOOK}</Text>
      </LinearGradient>

      <View style={[styles.benefitsCard, { borderColor: `${accent}40` }]}>
        <Text style={styles.benefitsLabel}>Why this pays off</Text>
        {benefits.map((benefit) => (
          <BenefitRow key={benefit} text={benefit} accent={accent} />
        ))}
      </View>
    </AppBottomSheetModal>
  );
}

const styles = StyleSheet.create({
  sheetCard: {
    backgroundColor: BG,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(34,197,94,0.22)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 16,
  },
  sheetContent: {
    paddingTop: 8,
    paddingHorizontal: 20,
    paddingBottom: 8,
    backgroundColor: BG,
    gap: 16,
  },
  sheetFooter: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 0,
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: CARD_BORDER,
    backgroundColor: BG,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginBottom: 4,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  brandEmoji: {
    fontSize: 18,
  },
  brandName: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_MUTED,
    letterSpacing: 0.2,
  },
  heroCard: {
    borderRadius: SmartCartRadius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 2,
  },
  heroEmoji: {
    fontSize: 30,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  tierBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    letterSpacing: -0.4,
    lineHeight: 28,
    textAlign: 'center',
  },
  hook: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 300,
  },
  benefitsCard: {
    backgroundColor: CARD_BG,
    borderRadius: SmartCartRadius.lg,
    padding: 18,
    borderWidth: 1,
    gap: 14,
  },
  benefitsLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: TEXT_DIM,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  benefitText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: TEXT_PRIMARY,
    lineHeight: 21,
  },
  footerCol: {
    width: '100%',
    alignItems: 'center',
    gap: 4,
  },
  upgradeBtn: {
    width: '100%',
    backgroundColor: GREEN,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  upgradeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    letterSpacing: 0.1,
  },
  commitNote: {
    fontSize: 12,
    color: TEXT_DIM,
    textAlign: 'center',
    marginBottom: 2,
  },
  dismissBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  dismissText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_MUTED,
  },
  btnPressed: { opacity: 0.82 },
});
