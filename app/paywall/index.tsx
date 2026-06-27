import { useRouter } from 'expo-router';

import { useState, type ReactNode } from 'react';

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
import { ThemePreviewMini } from '@/src/components/ThemePreviewMini';
import { AvatarBadge } from '@/src/components/avatars/AvatarBadge';
import { APP_AVATAR_LIST } from '@/src/components/avatars/appAvatars';
import { APP_FONT_LIST } from '@/src/theme/appFonts';
import { APP_THEME_LIST } from '@/src/theme/appThemes';

import {
  COMMIT_NOTE,
  CONTINUE_FREE_LABEL,
  FAMILY_BADGE_LABEL,
  FAMILY_MONTHLY_PRICE,
  FAMILY_YEARLY_PRICE,
  FAMILY_YEARLY_PRICE_PER_MONTH,
  FREE_MAX_STORES,
  FREE_PANTRY_MAX_ITEMS,
  FREE_RECEIPT_SCAN_LIMIT,
  PRO_MONTHLY_PRICE,
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

const PLAN_CARD_GAP = 12;

const MOBILE_CARD_WIDTH_RATIO = 0.78;

type PlanId = 'free' | 'pro' | 'family';

type PaywallT = (key: string, opts?: Record<string, string | number>) => string;

type SymbolName = ComponentProps<typeof SymbolView>['name'];

const CHECK_ICON: SymbolName = {
  ios: 'checkmark.circle.fill',
  android: 'check_circle',
  web: 'check_circle',
};

function getProPrice(billing: 'monthly' | 'yearly'): string {
  return billing === 'yearly' ? PRO_YEARLY_PRICE_PER_MONTH : PRO_MONTHLY_PRICE;
}

function getProPeriod(billing: 'monthly' | 'yearly', t: PaywallT): string {
  return billing === 'yearly' ? t('paywall.perMonthBilledYearly') : t('paywall.perMonth');
}

function getFamilyPrice(billing: 'monthly' | 'yearly'): string {
  return billing === 'yearly' ? FAMILY_YEARLY_PRICE_PER_MONTH : FAMILY_MONTHLY_PRICE;
}

function getFamilyPeriod(billing: 'monthly' | 'yearly', t: PaywallT): string {
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

function getFamilySubscribeLabel(
  billing: 'monthly' | 'yearly',
  upgrading: boolean,
  t: (key: string, opts?: Record<string, string>) => string
): string {
  if (upgrading) return t('common.processing');
  const price =
    billing === 'yearly'
      ? `${FAMILY_YEARLY_PRICE}/yr`
      : `${FAMILY_MONTHLY_PRICE}${t('paywall.perMonth')}`;
  return t('paywall.subscribeFamilyPrice', { price });
}

function getBillingDisclaimer(
  billingMode: ReturnType<typeof getSubscriptionBillingMode>,
  t: PaywallT
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

function FeatureBullet({
  text,
  accent,
  compact,
}: {
  text: string;
  accent: string;
  compact?: boolean;
}) {
  return (
    <View style={styles.featureRow}>
      <SymbolView name={CHECK_ICON} tintColor={accent} size={compact ? 14 : 16} />
      <Text style={[styles.featureText, compact && styles.featureTextCompact]} numberOfLines={3}>
        {text}
      </Text>
    </View>
  );
}

function CardThemeSwatches({ label, themeCount }: { label: string; themeCount?: number }) {
  const themes = APP_THEME_LIST.slice(0, themeCount ?? APP_THEME_LIST.length);

  return (
    <View style={styles.cardThemeBlock}>
      <Text style={styles.cardThemeLabel}>{label}</Text>
      <View style={styles.cardThemeRow}>
        {themes.map((preset) => (
          <ThemePreviewMini key={preset.id} preset={preset} size="sm" />
        ))}
      </View>
    </View>
  );
}

function SelectIndicator({
  selected,
  accent,
  t,
}: {
  selected: boolean;
  accent: string;
  t: PaywallT;
}) {
  return (
    <View style={[styles.selectIndicator, selected && { backgroundColor: `${accent}22` }]}>
      <View style={[styles.selectDot, selected && { backgroundColor: accent }]} />
      <Text style={[styles.selectText, selected && { color: TEXT_PRIMARY }]}>
        {selected ? t('common.selected') : t('common.selectPlan')}
      </Text>
    </View>
  );
}

type PlanCardShellProps = {
  compact: boolean;
  selected: boolean;
  onSelect: () => void;
  cardStyle?: object;
  selectedStyle?: object;
  children: ReactNode;
  width?: number;
};

function PlanCardShell({
  compact,
  selected,
  onSelect,
  cardStyle,
  selectedStyle,
  children,
  width,
}: PlanCardShellProps) {
  return (
    <Pressable
      onPress={onSelect}
      style={[
        styles.planCard,
        compact && styles.planCardCompact,
        cardStyle,
        selected && selectedStyle,
        width != null ? { width } : styles.planCardFlex,
      ]}>
      {children}
    </Pressable>
  );
}

type FreePlanCardProps = {
  compact: boolean;
  selected: boolean;
  onSelect: () => void;
  bullets: string[];
  t: PaywallT;
  width?: number;
};

function FreePlanCard({ compact, selected, onSelect, bullets, t, width }: FreePlanCardProps) {
  return (
    <PlanCardShell
      compact={compact}
      selected={selected}
      onSelect={onSelect}
      selectedStyle={styles.freeCardSelected}
      width={width}>
      <Text style={[styles.planName, compact && styles.planNameCompact]}>{t('paywall.freePlan')}</Text>
      <View style={styles.priceRow}>
        <Text style={[styles.planPrice, compact && styles.planPriceCompact]}>$0</Text>
        <Text style={[styles.planPeriod, compact && styles.planPeriodCompact]}>{t('paywall.forever')}</Text>
      </View>
      <View style={styles.featureList}>
        {bullets.map((text) => (
          <FeatureBullet key={text} text={text} accent={TEXT_MUTED} compact={compact} />
        ))}
      </View>
      <View style={styles.cardFooter}>
        <SelectIndicator selected={selected} accent={TEXT_MUTED} t={t} />
      </View>
    </PlanCardShell>
  );
}

type ProPlanCardProps = {
  compact: boolean;
  selected: boolean;
  billing: 'monthly' | 'yearly';
  onSelect: () => void;
  bullets: string[];
  t: PaywallT;
  width?: number;
};

function ProPlanCard({ compact, selected, billing, onSelect, bullets, t, width }: ProPlanCardProps) {
  return (
    <PlanCardShell
      compact={compact}
      selected={selected}
      onSelect={onSelect}
      cardStyle={styles.proCard}
      selectedStyle={styles.proCardSelected}
      width={width}>
      <View style={styles.planBadgeRow}>
        <ProShimmerBadge label={t('paywall.proBadge')} />
      </View>
      <Text style={[styles.planName, compact && styles.planNameCompact]}>{t('paywall.proPlan')}</Text>
      <View style={styles.priceRow}>
        <Text style={[styles.planPrice, styles.proPrice, compact && styles.planPriceCompact]}>
          {getProPrice(billing)}
        </Text>
        <Text style={[styles.planPeriod, compact && styles.planPeriodCompact]}>
          {getProPeriod(billing, t)}
        </Text>
      </View>
      {billing === 'yearly' ? (
        <Text style={[styles.yearlyNote, compact && styles.yearlyNoteCompact]}>
          {t('paywall.billedAnnually', { price: PRO_YEARLY_PRICE })}
        </Text>
      ) : null}
      <View style={styles.featureList}>
        {bullets.map((text) => (
          <FeatureBullet key={text} text={text} accent={GREEN} compact={compact} />
        ))}
      </View>
      <CardThemeSwatches label={t('paywall.customThemesLine')} />
      <View style={styles.cardFooter}>
        <SelectIndicator selected={selected} accent={GREEN} t={t} />
      </View>
    </PlanCardShell>
  );
}

type FamilyPlanCardProps = {
  compact: boolean;
  selected: boolean;
  billing: 'monthly' | 'yearly';
  onSelect: () => void;
  bullets: string[];
  t: PaywallT;
  width?: number;
};

function FamilyPlanCard({
  compact,
  selected,
  billing,
  onSelect,
  bullets,
  t,
  width,
}: FamilyPlanCardProps) {
  return (
    <PlanCardShell
      compact={compact}
      selected={selected}
      onSelect={onSelect}
      cardStyle={styles.familyCard}
      selectedStyle={styles.familyCardSelected}
      width={width}>
      <View style={styles.planBadgeRow}>
        <FamilyBadge label={FAMILY_BADGE_LABEL} />
      </View>
      <Text style={[styles.planName, compact && styles.planNameCompact]}>{t('paywall.familyTitle')}</Text>
      <Text style={[styles.familySubtitle, compact && styles.familySubtitleCompact]}>
        {t('paywall.familySubtitle')}
      </Text>
      <View style={styles.priceRow}>
        <Text style={[styles.planPrice, styles.familyPrice, compact && styles.planPriceCompact]}>
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
        {bullets.map((text) => (
          <FeatureBullet key={text} text={text} accent={PURPLE} compact={compact} />
        ))}
      </View>
      <CardThemeSwatches label={t('paywall.householdThemesLine')} themeCount={2} />
      <View style={styles.cardFooter}>
        <SelectIndicator selected={selected} accent={PURPLE} t={t} />
      </View>
    </PlanCardShell>
  );
}

function ProPersonalizationStrip({ t }: { t: PaywallT }) {
  const proFonts = APP_FONT_LIST.filter((preset) => preset.isPro).slice(0, 4);
  const previewAvatars = APP_AVATAR_LIST.slice(0, 5);

  return (
    <View style={styles.personalizationStrip}>
      <View style={styles.personalizationGroup}>
        <Text style={styles.personalizationLabel}>{t('features.labels.custom_fonts')}</Text>
        <View style={styles.personalizationRow}>
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
        </View>
      </View>
      <View style={styles.personalizationGroup}>
        <Text style={styles.personalizationLabel}>{t('features.labels.custom_avatars')}</Text>
        <View style={styles.personalizationRow}>
          {previewAvatars.map((preset) => (
            <AvatarBadge key={preset.id} preset={preset} size="sm" />
          ))}
        </View>
      </View>
    </View>
  );
}

export default function PaywallScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  useAdminPaywallBypass();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isCompact = width < COMPACT_LAYOUT_MAX_WIDTH;
  const mobileCardWidth = Math.min(width * MOBILE_CARD_WIDTH_RATIO, 280);
  const snapInterval = mobileCardWidth + PLAN_CARD_GAP;

  const upgradeToPro = useSubscriptionStore((s) => s.upgradeToPro);
  const startProTrial = useSubscriptionStore((s) => s.startProTrial);
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('pro');
  const [upgrading, setUpgrading] = useState(false);
  const [upgradingFamily, setUpgradingFamily] = useState(false);
  const [startingTrial, setStartingTrial] = useState(false);
  const billingMode = getSubscriptionBillingMode();

  const freeBullets = [
    t('paywall.features.free.scans', { count: FREE_RECEIPT_SCAN_LIMIT }),
    t('paywall.features.free.stores', { count: FREE_MAX_STORES }),
    t('paywall.features.free.pantry', { count: FREE_PANTRY_MAX_ITEMS }),
  ];

  const proBullets = [
    t('paywall.features.proCompact.unlimitedScans'),
    t('paywall.features.proCompact.historyAlerts'),
    t('paywall.features.proCompact.multiStore'),
    t('paywall.features.proCompact.pantryExport'),
  ];

  const familyBullets = [
    t('paywall.features.familyCompact.sharedLists'),
    t('paywall.features.familyCompact.liveSync'),
    t('paywall.features.familyCompact.inviteFree'),
    t('paywall.features.familyCompact.onePayer'),
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

  const handleProUpgrade = async () => {
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

  const handlePrimaryAction = () => {
    if (selectedPlan === 'free') {
      router.back();
      return;
    }
    if (selectedPlan === 'family') {
      void handleFamilyUpgrade();
      return;
    }
    void handleProUpgrade();
  };

  const isBusy = upgrading || upgradingFamily || startingTrial;

  const planCards = (
    <>
      <FreePlanCard
        compact={isCompact}
        selected={selectedPlan === 'free'}
        onSelect={() => setSelectedPlan('free')}
        bullets={freeBullets}
        t={t}
        width={isCompact ? mobileCardWidth : undefined}
      />
      <ProPlanCard
        compact={isCompact}
        selected={selectedPlan === 'pro'}
        billing={billing}
        onSelect={() => setSelectedPlan('pro')}
        bullets={proBullets}
        t={t}
        width={isCompact ? mobileCardWidth : undefined}
      />
      <FamilyPlanCard
        compact={isCompact}
        selected={selectedPlan === 'family'}
        billing={billing}
        onSelect={() => setSelectedPlan('family')}
        bullets={familyBullets}
        t={t}
        width={isCompact ? mobileCardWidth : undefined}
      />
    </>
  );

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
          {isCompact ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToInterval={snapInterval}
              snapToAlignment="start"
              contentContainerStyle={styles.plansScrollContent}>
              {planCards}
            </ScrollView>
          ) : (
            <View style={styles.plansRow}>{planCards}</View>
          )}

          {!isCompact ? <ProPersonalizationStrip t={t} /> : null}
        </View>

        <View style={styles.ctaSection}>
          {selectedPlan === 'pro' ? (
            <>
              <Pressable
                style={[styles.upgradeBtn, isBusy && styles.btnDisabled]}
                disabled={isBusy}
                onPress={handleStartTrial}
                accessibilityRole="button"
                accessibilityLabel={t('paywall.startTrial')}>
                <Text style={styles.upgradeBtnText}>
                  {startingTrial ? t('paywall.startingTrial') : t('paywall.startTrial')}
                </Text>
              </Pressable>
              <Text style={styles.ctaSubtext}>{t('paywall.trialSubtext')}</Text>
            </>
          ) : null}

          <Pressable
            style={[
              selectedPlan === 'pro' ? styles.subscribeBtn : styles.upgradeBtn,
              selectedPlan === 'family' && styles.familyPrimaryBtn,
              selectedPlan === 'free' && styles.freePrimaryBtn,
              isBusy && styles.btnDisabled,
            ]}
            disabled={isBusy}
            onPress={handlePrimaryAction}
            accessibilityRole="button"
            accessibilityLabel={
              selectedPlan === 'free'
                ? CONTINUE_FREE_LABEL || t('paywall.continueFree')
                : selectedPlan === 'family'
                  ? t('paywall.familySubscribe')
                  : getSubscribeLabel(billing, upgrading, t)
            }>
            <Text
              style={[
                selectedPlan === 'pro' ? styles.subscribeBtnText : styles.upgradeBtnText,
                selectedPlan === 'family' && styles.familyPrimaryBtnText,
                selectedPlan === 'free' && styles.freePrimaryBtnText,
              ]}>
              {selectedPlan === 'free'
                ? CONTINUE_FREE_LABEL || t('paywall.continueFree')
                : selectedPlan === 'family'
                  ? getFamilySubscribeLabel(billing, upgradingFamily, t)
                  : getSubscribeLabel(billing, upgrading, t)}
            </Text>
          </Pressable>

          {selectedPlan === 'family' ? (
            <Pressable style={styles.familyLink} onPress={() => router.push('/family_plans' as never)}>
              <Text style={styles.familyLinkText}>{t('paywall.familyJoin')}</Text>
            </Pressable>
          ) : null}

          {selectedPlan !== 'free' ? (
            <Pressable style={styles.freeLink} onPress={() => router.back()}>
              <Text style={styles.freeLinkText}>{CONTINUE_FREE_LABEL || t('paywall.continueFree')}</Text>
            </Pressable>
          ) : null}

          <Text style={styles.commitNote}>{COMMIT_NOTE || t('paywall.commitNote')}</Text>

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
    maxWidth: 360,
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
  plansRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: PLAN_CARD_GAP,
    width: '100%',
  },
  plansScrollContent: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: PLAN_CARD_GAP,
    paddingHorizontal: 2,
    paddingBottom: 4,
  },
  planCard: {
    alignSelf: 'stretch',
    backgroundColor: CARD_BG,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    minWidth: 0,
  },
  planCardFlex: {
    flex: 1,
    minWidth: 0,
  },
  planCardCompact: {
    padding: 12,
    borderRadius: 16,
  },
  freeCardSelected: {
    borderColor: 'rgba(255,255,255,0.35)',
    borderWidth: 2,
  },
  proCard: {
    borderColor: 'rgba(34,197,94,0.35)',
  },
  proCardSelected: {
    borderColor: GREEN,
    borderWidth: 2,
  },
  familyCard: {
    backgroundColor: 'rgba(124,58,237,0.08)',
    borderColor: 'rgba(124,58,237,0.28)',
  },
  familyCardSelected: {
    borderColor: PURPLE,
    borderWidth: 2,
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
  planName: { fontSize: 18, fontWeight: '800', color: TEXT_PRIMARY },
  planNameCompact: { fontSize: 16 },
  familySubtitle: {
    fontSize: 11,
    color: TEXT_MUTED,
    lineHeight: 16,
    marginTop: 2,
  },
  familySubtitleCompact: {
    fontSize: 10,
    lineHeight: 14,
  },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 6, flexWrap: 'wrap' },
  planPrice: { fontSize: 28, fontWeight: '800', color: TEXT_PRIMARY },
  planPriceCompact: { fontSize: 22 },
  proPrice: { color: GREEN },
  familyPrice: { color: PURPLE },
  planPeriod: { fontSize: 13, color: TEXT_MUTED },
  planPeriodCompact: { fontSize: 11 },
  yearlyNote: { fontSize: 11, color: TEXT_MUTED, marginTop: 2 },
  yearlyNoteCompact: { fontSize: 10, lineHeight: 14 },
  featureList: { marginTop: 12, gap: 8 },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    width: '100%',
  },
  featureText: {
    flex: 1,
    flexShrink: 1,
    fontSize: 12,
    color: 'rgba(255,255,255,0.88)',
    lineHeight: 17,
  },
  featureTextCompact: {
    fontSize: 11,
    lineHeight: 15,
  },
  cardThemeBlock: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: CARD_BORDER,
    gap: 8,
  },
  cardThemeLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: TEXT_MUTED,
    letterSpacing: 0.2,
  },
  cardThemeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  cardFooter: {
    marginTop: 'auto',
    paddingTop: 12,
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
  selectDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: TEXT_MUTED,
  },
  selectText: { fontSize: 12, fontWeight: '600', color: TEXT_MUTED },
  personalizationStrip: {
    marginTop: 4,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: CARD_BORDER,
    gap: 14,
  },
  personalizationGroup: { gap: 8 },
  personalizationLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_MUTED,
  },
  personalizationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  fontPreviewChip: {
    minWidth: 40,
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
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
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
  familyPrimaryBtn: {
    backgroundColor: PURPLE,
  },
  freePrimaryBtn: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  btnDisabled: { opacity: 0.7 },
  upgradeBtnText: { fontSize: 16, fontWeight: '800', color: '#000' },
  familyPrimaryBtnText: { color: '#FFF' },
  freePrimaryBtnText: { color: TEXT_PRIMARY },
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
  familyLink: { alignItems: 'center', paddingVertical: 2 },
  familyLinkText: { fontSize: 13, fontWeight: '600', color: PURPLE },
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
