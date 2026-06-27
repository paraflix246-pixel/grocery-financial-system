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
import { ThemePreviewMini } from '@/src/components/ThemePreviewMini';
import { AvatarBadge } from '@/src/components/avatars/AvatarBadge';
import { APP_AVATAR_LIST } from '@/src/components/avatars/appAvatars';
import { APP_FONT_LIST } from '@/src/theme/appFonts';
import { APP_THEME_LIST } from '@/src/theme/appThemes';

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
import { useAdminPaywallBypass } from '@/src/hooks/useAdminPaywallBypass';

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

const PLANS_CONTAINER_MAX_WIDTH = 1024;

const COMPACT_LAYOUT_MAX_WIDTH = 600;

const PAID_PLANS_STACK_MAX_WIDTH = 400;

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

function FamilyBadge({ label }: { label: string }) {
  return (
    <View style={styles.familyBadgePill}>
      <SymbolView
        name={{ ios: 'person.3.fill', android: 'groups', web: 'groups' }}
        tintColor={PURPLE}
        size={12}
      />
      <Text style={styles.familyBadgePillText}>{label}</Text>
    </View>
  );
}

function PaywallThemePreview({ label }: { label: string }) {
  const proThemes = APP_THEME_LIST.filter((preset) => preset.isPremium);

  return (
    <View style={styles.themePreviewSection}>
      <Text style={styles.themePreviewLabel}>{label}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.previewScrollContent}>
        {proThemes.map((preset) => (
          <ThemePreviewMini key={preset.id} preset={preset} size="sm" />
        ))}
      </ScrollView>
    </View>
  );
}

function PaywallFontPreview({ label }: { label: string }) {
  const proFonts = APP_FONT_LIST.filter((preset) => preset.isPro).slice(0, 4);

  return (
    <View style={styles.themePreviewSection}>
      <Text style={styles.themePreviewLabel}>{label}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.previewScrollContent}>
        {proFonts.map((preset) => (
          <View key={preset.id} style={styles.fontPreviewChip}>
            <Text
              style={[
                styles.fontPreviewText,
                preset.fontFamily ? { fontFamily: preset.fontFamily } : undefined,
              ]}
              numberOfLines={1}>
              Aa
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function PaywallAvatarPreview({ label }: { label: string }) {
  const previewAvatars = APP_AVATAR_LIST.slice(0, 6);

  return (
    <View style={styles.themePreviewSection}>
      <Text style={styles.themePreviewLabel}>{label}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.previewScrollContent}>
        {previewAvatars.map((preset) => (
          <AvatarBadge key={preset.id} preset={preset} size="sm" />
        ))}
      </ScrollView>
    </View>
  );
}

type FamilyComparisonCardProps = {
  compact: boolean;
  billing: 'monthly' | 'yearly';
  selected: boolean;
  upgradingFamily: boolean;
  onSelect: () => void;
  onUpgrade: () => void;
  onJoin: () => void;
  t: (key: string, opts?: Record<string, string>) => string;
};

function FamilyComparisonCard({
  billing,
  compact,
  selected,
  upgradingFamily,
  onSelect,
  onUpgrade,
  onJoin,
  t,
}: FamilyComparisonCardProps) {
  return (
    <Pressable
      onPress={onSelect}
      style={[
        styles.comparisonCard,
        compact && styles.comparisonCardCompact,
        styles.familyComparisonCard,
        selected && styles.familyComparisonCardSelected,
      ]}>
      <View style={styles.comparisonCardBody}>
        <View style={styles.planBadgeRow}>
          <FamilyBadge label={FAMILY_BADGE_LABEL} />
        </View>
        <Text style={[styles.planName, compact && styles.planNameCompact]}>{t('paywall.familyTitle')}</Text>
        <Text style={[styles.familyPlanSubtitle, compact && styles.familyPlanSubtitleCompact]}>
          {FAMILY_CTA_SUBTEXT}
        </Text>
        <View style={styles.priceRow}>
          <Text style={[styles.planPrice, { color: PURPLE }, compact && styles.planPriceCompact]}>
            {getFamilyPrice(billing)}
          </Text>
          <Text style={[styles.planPeriod, compact && styles.planPeriodCompact]}>
            {getFamilyPeriod(billing, t)}
          </Text>
        </View>
        {billing === 'yearly' ? (
          <Text style={[styles.yearlyNote, compact && styles.yearlyNoteCompact]}>
            {t('paywall.billedAnnually', { price: FAMILY_YEARLY_PRICE })}
          </Text>
        ) : null}
        <View style={styles.featureList}>
          <FamilyPlanFeaturesList
            leadLabel={FAMILY_PLAN_LEAD}
            accentColor={PURPLE}
            mutedColor={TEXT_MUTED}
            featureTextStyle={[styles.featureText, compact && styles.featureTextCompact]}
            leadTextStyle={[styles.featureText, compact && styles.featureTextCompact]}
          />
        </View>
      </View>
      <View style={styles.comparisonCardFooter}>
        <Pressable
          style={[styles.familyCardBtn, upgradingFamily && styles.btnDisabled]}
          disabled={upgradingFamily}
          onPress={onUpgrade}
          accessibilityRole="button"
          accessibilityLabel={FAMILY_SUBSCRIBE_LABEL}>
          <Text style={[styles.familyCardBtnText, compact && styles.familyCardBtnTextCompact]}>
            {upgradingFamily
              ? t('common.processing')
              : `${t('paywall.familySubscribe')} — ${getFamilyPrice(billing)}/mo`}
          </Text>
        </Pressable>
        <Pressable
          style={styles.familyCardLink}
          onPress={onJoin}>
          <Text style={[styles.familyCardLinkText, compact && styles.familyCardLinkTextCompact]}>
            {t('paywall.familyJoin')}
          </Text>
        </Pressable>
        <View style={[styles.selectIndicator, selected && styles.familySelectIndicatorSelected]}>
          <View style={[styles.selectDot, selected && { backgroundColor: PURPLE }]} />
          <Text style={[styles.selectText, selected && { color: TEXT_PRIMARY }]}>
            {selected ? t('common.selected') : t('common.selectPlan')}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function PaywallScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  useAdminPaywallBypass();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isCompact = width < COMPACT_LAYOUT_MAX_WIDTH;
  const stackPaidPlans = width < PAID_PLANS_STACK_MAX_WIDTH;
  const upgradeToPro = useSubscriptionStore((s) => s.upgradeToPro);
  const startProTrial = useSubscriptionStore((s) => s.startProTrial);
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<'pro' | 'family'>('pro');
  const [upgrading, setUpgrading] = useState(false);
  const [upgradingFamily, setUpgradingFamily] = useState(false);
  const [startingTrial, setStartingTrial] = useState(false);
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
    if (selectedPlan !== 'pro') return;
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
        contentContainerStyle={[
          styles.content,
          { paddingBottom: getScreenBottomPadding(insets.bottom, 16) },
        ]}>
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

        <View style={styles.plansContainer}>
          <View style={[styles.freePlanRow, isCompact && styles.freePlanRowCompact]}>
            <View style={[styles.freePlanCard, isCompact && styles.freePlanCardCompact]}>
              <View style={styles.freePlanHeader}>
                <Text style={[styles.freePlanName, isCompact && styles.freePlanNameCompact]}>
                  {t('paywall.freePlan')}
                </Text>
                <View style={styles.freePriceRow}>
                  <Text style={[styles.freePlanPrice, isCompact && styles.freePlanPriceCompact]}>$0</Text>
                  <Text style={[styles.freePlanPeriod, isCompact && styles.freePlanPeriodCompact]}>
                    {t('paywall.forever')}
                  </Text>
                </View>
              </View>
              <View style={[styles.freeFeatureList, isCompact && styles.freeFeatureListCompact]}>
                {freeFeatures.map((f) => (
                  <View key={f} style={styles.freeFeatureRow}>
                    <SymbolView
                      name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
                      tintColor={TEXT_MUTED}
                      size={isCompact ? 14 : 16}
                    />
                    <Text style={[styles.freeFeatureText, isCompact && styles.freeFeatureTextCompact]} numberOfLines={2}>
                      {f}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View style={[styles.paidComparisonRow, stackPaidPlans && styles.paidComparisonRowStacked]}>
            <Pressable
              onPress={() => setSelectedPlan('pro')}
              style={[
                styles.comparisonCard,
                isCompact && styles.comparisonCardCompact,
                styles.proComparisonCard,
                selectedPlan === 'pro' && styles.proComparisonCardSelected,
              ]}>
              <View style={styles.comparisonCardBody}>
                <View style={styles.planBadgeRow}>
                  <ProShimmerBadge label={t('paywall.proBadge')} />
                </View>
                <Text style={[styles.planName, isCompact && styles.planNameCompact]}>{t('paywall.proPlan')}</Text>
                <View style={styles.priceRow}>
                  <Text
                    style={[
                      styles.planPrice,
                      { color: GREEN },
                      isCompact && styles.planPriceCompact,
                    ]}>
                    {getProPrice(billing)}
                  </Text>
                  <Text style={[styles.planPeriod, isCompact && styles.planPeriodCompact]}>
                    {getProPeriod(billing, t)}
                  </Text>
                </View>
                {billing === 'yearly' ? (
                  <Text style={[styles.yearlyNote, isCompact && styles.yearlyNoteCompact]}>
                    {t('paywall.billedAnnually', { price: PRO_YEARLY_PRICE })}
                  </Text>
                ) : null}
                <View style={styles.featureList}>
                  <ProPlanFeaturesList
                    variant="grouped"
                    leadLabel={t('paywall.proLead')}
                    accentColor={GREEN}
                    mutedColor={TEXT_MUTED}
                    featureTextStyle={[styles.featureText, isCompact && styles.featureTextCompact]}
                    leadTextStyle={[styles.featureText, isCompact && styles.featureTextCompact]}
                  />
                </View>
              </View>
              <View style={styles.comparisonCardFooter}>
                <View style={[styles.selectIndicator, selectedPlan === 'pro' && styles.proSelectIndicatorSelected]}>
                  <View style={[styles.selectDot, selectedPlan === 'pro' && { backgroundColor: GREEN }]} />
                  <Text style={[styles.selectText, selectedPlan === 'pro' && { color: TEXT_PRIMARY }]}>
                    {selectedPlan === 'pro' ? t('common.selected') : t('common.selectPlan')}
                  </Text>
                </View>
              </View>
            </Pressable>

            <FamilyComparisonCard
              billing={billing}
              compact={isCompact}
              selected={selectedPlan === 'family'}
              upgradingFamily={upgradingFamily}
              onSelect={() => setSelectedPlan('family')}
              onUpgrade={() => void handleFamilyUpgrade()}
              onJoin={() => router.push('/family_plans' as never)}
              t={t}
            />
          </View>

          <View style={styles.proPreviewSection}>
            <PaywallThemePreview label={t('features.labels.custom_themes')} />
            <PaywallFontPreview label={t('features.labels.custom_fonts')} />
            <PaywallAvatarPreview label={t('features.labels.custom_avatars')} />
          </View>
        </View>

        <View style={styles.ctaSection}>
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
            disabled={upgrading || startingTrial || selectedPlan !== 'pro'}
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
      </ScrollView>
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
  plansContainer: {
    width: '100%',
    maxWidth: PLANS_CONTAINER_MAX_WIDTH,
    alignSelf: 'center',
    gap: 14,
  },
  freePlanRow: {
    width: '100%',
  },
  freePlanRowCompact: {
    marginBottom: 2,
  },
  freePlanCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    opacity: 0.92,
  },
  freePlanCardCompact: {
    padding: 12,
    borderRadius: 14,
  },
  freePlanHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  freePlanName: {
    fontSize: 16,
    fontWeight: '800',
    color: TEXT_PRIMARY,
  },
  freePlanNameCompact: {
    fontSize: 14,
  },
  freePriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  freePlanPrice: {
    fontSize: 22,
    fontWeight: '800',
    color: TEXT_PRIMARY,
  },
  freePlanPriceCompact: {
    fontSize: 18,
  },
  freePlanPeriod: {
    fontSize: 12,
    color: TEXT_MUTED,
  },
  freePlanPeriodCompact: {
    fontSize: 10,
  },
  freeFeatureList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  freeFeatureListCompact: {
    gap: 6,
  },
  freeFeatureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    width: '48%',
    minWidth: 120,
  },
  freeFeatureText: {
    flex: 1,
    fontSize: 12,
    color: TEXT_MUTED,
    lineHeight: 17,
  },
  freeFeatureTextCompact: {
    fontSize: 10,
    lineHeight: 14,
  },
  paidComparisonRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
    width: '100%',
  },
  paidComparisonRowStacked: {
    flexDirection: 'column',
  },
  comparisonCard: {
    flex: 1,
    flexBasis: '48%',
    alignSelf: 'stretch',
    minWidth: 0,
    backgroundColor: CARD_BG,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    overflow: 'hidden',
  },
  comparisonCardCompact: {
    padding: 12,
    borderRadius: 16,
  },
  comparisonCardBody: {
    flex: 1,
  },
  comparisonCardFooter: {
    marginTop: 'auto',
    paddingTop: 12,
    gap: 8,
  },
  proComparisonCard: {
    borderColor: 'rgba(34,197,94,0.35)',
  },
  proComparisonCardSelected: {
    borderColor: GREEN,
    borderWidth: 2,
  },
  familyComparisonCard: {
    backgroundColor: 'rgba(124,58,237,0.08)',
    borderColor: 'rgba(124,58,237,0.28)',
  },
  familyComparisonCardSelected: {
    borderColor: PURPLE,
    borderWidth: 2,
  },
  proPreviewSection: {
    marginTop: 4,
    gap: 4,
  },
  planBadgeRow: { marginBottom: 8 },
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
  familyBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(124,58,237,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.35)',
  },
  familyBadgePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: PURPLE,
    letterSpacing: 0.2,
  },
  planName: { fontSize: 20, fontWeight: '800', color: TEXT_PRIMARY },
  planNameCompact: { fontSize: 15 },
  familyPlanSubtitle: {
    fontSize: 12,
    color: TEXT_MUTED,
    lineHeight: 17,
    marginTop: 4,
  },
  familyPlanSubtitleCompact: {
    fontSize: 10,
    lineHeight: 14,
  },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4, flexWrap: 'wrap' },
  planPrice: { fontSize: 32, fontWeight: '800', color: TEXT_PRIMARY },
  planPriceCompact: { fontSize: 22 },
  planPeriod: { fontSize: 14, color: TEXT_MUTED },
  planPeriodCompact: { fontSize: 10 },
  yearlyNote: { fontSize: 12, color: TEXT_MUTED, marginTop: 2 },
  yearlyNoteCompact: { fontSize: 9, lineHeight: 13 },
  featureList: { marginTop: 12, gap: 8 },
  featureText: {
    flex: 1,
    flexShrink: 1,
    fontSize: 13,
    color: 'rgba(255,255,255,0.88)',
    lineHeight: 20,
  },
  featureTextCompact: {
    fontSize: 10,
    lineHeight: 15,
  },
  selectIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  proSelectIndicatorSelected: {
    backgroundColor: `${GREEN}22`,
  },
  familySelectIndicatorSelected: {
    backgroundColor: `${PURPLE}22`,
  },
  selectDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: TEXT_MUTED,
  },
  selectText: { fontSize: 12, fontWeight: '600', color: TEXT_MUTED },
  familyCardBtn: {
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(124,58,237,0.5)',
    backgroundColor: 'rgba(124,58,237,0.12)',
  },
  familyCardBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: PURPLE,
  },
  familyCardBtnTextCompact: {
    fontSize: 11,
  },
  familyCardLink: { alignItems: 'center', paddingVertical: 2 },
  familyCardLinkText: { fontSize: 11, fontWeight: '600', color: TEXT_MUTED },
  familyCardLinkTextCompact: { fontSize: 10 },
  ctaSection: {
    marginTop: 28,
    paddingTop: 20,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: CARD_BORDER,
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
  themePreviewSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: CARD_BORDER,
    gap: 10,
  },
  themePreviewLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_MUTED,
  },
  previewScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 4,
  },
  fontPreviewChip: {
    minWidth: 44,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: CARD_BORDER,
    alignItems: 'center',
    flexShrink: 0,
  },
  fontPreviewText: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
});
