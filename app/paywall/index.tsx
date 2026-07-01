import { useLocalSearchParams, useRouter } from 'expo-router';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { Alert, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import type { ComponentProps } from 'react';

import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';

import { HorizontalScrollRow } from '@/src/components/HorizontalScrollRow';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { PennyPantryLogo } from '@/src/components/PennyPantryLogo';
import { LegalFooter } from '@/src/components/legal/LegalFooter';
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
  FREE_PRICE_HISTORY_DAYS,
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
import {
  buildPaywallHref,
  PAYWALL_PLAN_SCROLL_INDEX,
  parseInitialPaywallPlan,
  type PaywallPlanId,
} from '@/src/utils/paywallRoutes';
import {
  hasActiveCheckoutSession,
  isSubscriptionAuthError,
  promptPaywallSignIn,
  type CheckoutProduct,
} from '@/src/utils/paywallCheckoutAuth';
import { startDevFamilyWorkspacePreview } from '@/src/services/devFamilyWorkspacePreview';
import { promptDevFamilyPreviewSignIn } from '@/src/utils/devFamilyPreviewAuth';
import { useDevFamilyPreview } from '@/src/hooks/useDevFamilyPreview';
import { FamilyWorkspaceTheme } from '@/src/theme/familyWorkspaceTheme';

const BG = '#0F0F0F';

const GREEN = '#22C55E';

const FAMILY = FamilyWorkspaceTheme;

const TEXT_PRIMARY = '#FFFFFF';

const TEXT_MUTED = 'rgba(255,255,255,0.55)';

const CARD_BG = 'rgba(255,255,255,0.05)';

const CARD_BORDER = 'rgba(255,255,255,0.1)';

const PLANS_CONTAINER_MAX_WIDTH = 1140;

const COMPACT_LAYOUT_MAX_WIDTH = 600;

const PLAN_CARD_GAP = 16;

const MOBILE_CARD_WIDTH_RATIO = 0.86;

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

function getProBullets(t: PaywallT): string[] {
  const themeSamples = [APP_THEME_LIST[4], APP_THEME_LIST[5]]
    .map((preset) => t(preset.nameKey))
    .join(', ');
  const proFonts = APP_FONT_LIST.filter((preset) => preset.isPro);
  const fontSamples = proFonts
    .slice(0, 3)
    .map((preset) => t(preset.nameKey))
    .join(', ');

  return [
    t('paywall.features.pro.unlimitedScans'),
    t('paywall.features.pro.fullHistory'),
    t('paywall.features.pro.smartAlerts'),
    t('paywall.features.pro.multiStore'),
    t('paywall.features.pro.spendingOverview'),
    t('paywall.features.pro.cheapestCart'),
    t('paywall.features.pro.export'),
    t('paywall.features.pro.unlimitedPantry'),
    t('paywall.features.pro.adFree'),
    t('paywall.features.pro.customThemesDetail', {
      count: APP_THEME_LIST.length,
      samples: themeSamples,
    }),
    t('paywall.features.pro.customFontsDetail', {
      count: proFonts.length,
      samples: fontSamples,
    }),
    t('paywall.features.pro.customAvatarsDetail', { count: APP_AVATAR_LIST.length }),
  ];
}

function getFamilyBullets(t: PaywallT): string[] {
  return [
    t('paywall.features.family.allProFeatures'),
    t('paywall.features.family.sharedLists'),
    t('paywall.features.family.liveSync'),
    t('paywall.features.family.inviteFree'),
    t('paywall.features.family.householdReceipts'),
    t('paywall.features.family.onePayer'),
  ];
}

function getFreeBullets(t: PaywallT): string[] {
  return [
    t('paywall.features.free.scans', { count: FREE_RECEIPT_SCAN_LIMIT }),
    t('paywall.features.free.list'),
    t('paywall.features.free.history', { days: FREE_PRICE_HISTORY_DAYS }),
    t('paywall.features.free.alerts'),
    t('paywall.features.free.stores', { count: FREE_MAX_STORES }),
    t('paywall.features.free.pantry', { count: FREE_PANTRY_MAX_ITEMS }),
  ];
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
        tintColor={FAMILY.accent}
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
      <SymbolView name={CHECK_ICON} tintColor={accent} size={compact ? 15 : 17} />
      <Text style={[styles.featureText, compact && styles.featureTextCompact]}>{text}</Text>
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
      unstable_pressDelay={compact ? 80 : undefined}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.planCard,
        compact && styles.planCardCompact,
        cardStyle,
        selected && selectedStyle,
        width != null ? { width } : styles.planCardFlex,
        Platform.OS === 'web' && pressed && !selected ? styles.planCardPressed : null,
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
      <Text style={[styles.planTagline, compact && styles.planTaglineCompact]}>
        {t('paywall.freeTagline')}
      </Text>
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
      <View style={styles.proCardGlow} pointerEvents="none">
        <LinearGradient
          colors={['rgba(34,197,94,0.14)', 'rgba(34,197,94,0)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>
      <View style={styles.planBadgeRow}>
        <ProShimmerBadge label={t('paywall.proBadge')} />
      </View>
      <Text style={[styles.planName, compact && styles.planNameCompact]}>{t('paywall.proPlan')}</Text>
      <Text style={[styles.planTagline, styles.proTagline, compact && styles.planTaglineCompact]}>
        {t('paywall.proLead')}
      </Text>
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
      <Text style={[styles.planTagline, styles.familyTagline, compact && styles.planTaglineCompact]}>
        {t('paywall.familyLead')}
      </Text>
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
          <FeatureBullet key={text} text={text} accent={FAMILY.accent} compact={compact} />
        ))}
      </View>
      <View style={styles.cardFooter}>
        <SelectIndicator selected={selected} accent={FAMILY.accent} t={t} />
      </View>
    </PlanCardShell>
  );
}

export default function PaywallScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { family, plan } = useLocalSearchParams<{ family?: string; plan?: string }>();
  useAdminPaywallBypass();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isCompact = width < COMPACT_LAYOUT_MAX_WIDTH;
  const mobileCardWidth = Math.min(width * MOBILE_CARD_WIDTH_RATIO, 320);
  const snapInterval = mobileCardWidth + PLAN_CARD_GAP;
  const plansScrollRef = useRef<ScrollView>(null);
  const didScrollToPlanRef = useRef(false);

  const initialPlan = useMemo(
    () => parseInitialPaywallPlan({ family, plan }),
    [family, plan]
  );

  const upgradeToPro = useSubscriptionStore((s) => s.upgradeToPro);
  const startProTrial = useSubscriptionStore((s) => s.startProTrial);
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<PaywallPlanId>(initialPlan);
  const [upgrading, setUpgrading] = useState(false);
  const [upgradingFamily, setUpgradingFamily] = useState(false);
  const [startingTrial, setStartingTrial] = useState(false);
  const billingMode = getSubscriptionBillingMode();
  const { active: devPreviewActive } = useDevFamilyPreview();
  const [devPreviewBusy, setDevPreviewBusy] = useState(false);

  const freeBullets = getFreeBullets(t);
  const proBullets = getProBullets(t);
  const familyBullets = getFamilyBullets(t);

  useEffect(() => {
    setSelectedPlan(initialPlan);
  }, [initialPlan]);

  useEffect(() => {
    if (!isCompact || didScrollToPlanRef.current) return;
    const scrollIndex = PAYWALL_PLAN_SCROLL_INDEX[initialPlan];
    if (scrollIndex === 0) return;
    didScrollToPlanRef.current = true;
    const timer = setTimeout(() => {
      plansScrollRef.current?.scrollTo({ x: scrollIndex * snapInterval, animated: false });
    }, 50);
    return () => clearTimeout(timer);
  }, [initialPlan, isCompact, snapInterval]);

  const promptSignInForCheckout = useCallback(
    (product: CheckoutProduct) => {
      promptPaywallSignIn(
        product,
        {
          title: t('paywall.signInRequiredTitle'),
          message:
            product === 'family'
              ? t('paywall.signInForFamilySubscribe')
              : t('paywall.signInForProSubscribe'),
          cancel: t('common.cancel'),
          signIn: t('common.signIn'),
        },
        (href) => router.push(href as never)
      );
    },
    [router, t]
  );

  const ensureCheckoutAuth = useCallback(
    async (product: CheckoutProduct): Promise<boolean> => {
      if (await hasActiveCheckoutSession()) return true;
      promptSignInForCheckout(product);
      return false;
    },
    [promptSignInForCheckout]
  );

  const handleCheckoutError = useCallback(
    (error: unknown, product: CheckoutProduct) => {
      if (isSubscriptionAuthError(error)) {
        promptSignInForCheckout(product);
        return;
      }
      const message =
        error instanceof Error ? error.message : t('paywall.checkoutFailedMessage');
      Alert.alert(t('paywall.checkoutFailedTitle'), message);
    },
    [promptSignInForCheckout, t]
  );

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

  const handleDevFamilyPreview = async () => {
    setDevPreviewBusy(true);
    try {
      const ready = await startDevFamilyWorkspacePreview(router, 'home');
      if (!ready) {
        promptDevFamilyPreviewSignIn(
          buildPaywallHref('family'),
          {
            title: t('devFamilyPreview.routeTitle'),
            message: t('devFamilyPreview.signInRequired'),
            cancel: t('common.cancel'),
            signIn: t('common.signIn'),
          },
          (href) => router.push(href as never)
        );
      }
    } catch (error) {
      Alert.alert(
        t('devFamilyPreview.routeTitle'),
        error instanceof Error ? error.message : t('devFamilyPreview.enableFailed')
      );
    } finally {
      setDevPreviewBusy(false);
    }
  };

  const handleFamilyUpgrade = async () => {
    if (__DEV__ && devPreviewActive) {
      router.push('/family_plans' as never);
      return;
    }

    setUpgradingFamily(true);
    try {
      if (Platform.OS === 'web' && billingMode === 'stripe') {
        if (!(await ensureCheckoutAuth('family'))) return;
        await redirectToStripeCheckout(billing, 'family');
        return;
      }
      router.push('/family_plans' as never);
    } catch (error) {
      handleCheckoutError(error, 'family');
    } finally {
      setUpgradingFamily(false);
    }
  };

  const handleProUpgrade = async () => {
    setUpgrading(true);
    try {
      if (Platform.OS === 'web' && billingMode === 'stripe') {
        if (!(await ensureCheckoutAuth('pro'))) return;
        await redirectToStripeCheckout(billing);
        return;
      }
      await upgradeToPro(billing);
      router.replace('/subscriptions' as never);
    } catch (error) {
      handleCheckoutError(error, 'pro');
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

  const isBusy = upgrading || upgradingFamily || startingTrial || devPreviewBusy;

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
          <PennyPantryLogo variant="hero" size={56} style={styles.heroLogo} />
          <Text style={styles.heroTitle}>{t('paywall.headline')}</Text>
          <Text style={styles.heroSub}>{t('paywall.subhead')}</Text>
        </View>

        {__DEV__ ? (
          <View style={styles.devPreviewBanner}>
            <View style={styles.devPreviewBannerText}>
              <Text style={styles.devPreviewBannerTitle}>{t('paywall.devPreviewBannerTitle')}</Text>
              <Text style={styles.devPreviewBannerBody}>{t('paywall.devPreviewBannerBody')}</Text>
            </View>
            <Pressable
              style={[styles.devPreviewBtn, (isBusy || devPreviewActive) && styles.btnDisabled]}
              disabled={isBusy || devPreviewActive}
              onPress={() => void handleDevFamilyPreview()}
              accessibilityRole="button"
              accessibilityLabel={t('paywall.devPreviewButton')}>
              <SymbolView
                name={{ ios: 'person.3.fill', android: 'groups', web: 'groups' }}
                tintColor="#FFF"
                size={16}
              />
              <Text style={styles.devPreviewBtnText}>
                {devPreviewActive
                  ? t('paywall.devPreviewActive')
                  : devPreviewBusy
                    ? t('common.processing')
                    : t('paywall.devPreviewButton')}
              </Text>
            </Pressable>
          </View>
        ) : null}

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
            <HorizontalScrollRow
              ref={plansScrollRef}
              showsHorizontalScrollIndicator={false}
              snapToInterval={snapInterval}
              contentContainerStyle={styles.plansScrollContent}>
              {planCards}
            </HorizontalScrollRow>
          ) : (
            <View style={styles.plansRow}>{planCards}</View>
          )}
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

          <LegalFooter mutedColor="rgba(255,255,255,0.35)" linkColor={FAMILY.accentLight} style={styles.legalFooter} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  content: { padding: 16, paddingTop: 8 },
  hero: { alignItems: 'center', marginBottom: 24 },
  heroLogo: { marginBottom: 14 },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  heroSub: {
    fontSize: 15,
    color: TEXT_MUTED,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 22,
    maxWidth: 400,
  },
  devPreviewBanner: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: FAMILY.devPreviewBannerBorder,
    backgroundColor: FAMILY.devPreviewBannerBg,
    gap: 12,
  },
  devPreviewBannerText: { gap: 4 },
  devPreviewBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: FAMILY.accent,
    textAlign: 'center',
  },
  devPreviewBannerBody: {
    fontSize: 12,
    color: TEXT_MUTED,
    textAlign: 'center',
    lineHeight: 18,
  },
  devPreviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: FAMILY.accent,
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  devPreviewBtnText: { fontSize: 15, fontWeight: '800', color: '#FFF' },
  billingToggle: {
    flexDirection: 'row',
    backgroundColor: CARD_BG,
    borderRadius: 999,
    padding: 4,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  billingBtn: { flex: 1, paddingVertical: 11, borderRadius: 999, alignItems: 'center' },
  billingBtnActive: { backgroundColor: GREEN },
  billingText: { fontSize: 13, fontWeight: '600', color: TEXT_MUTED },
  billingTextActive: { color: '#000' },
  plansContainer: {
    width: '100%',
    maxWidth: PLANS_CONTAINER_MAX_WIDTH,
    alignSelf: 'center',
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
    paddingBottom: 6,
  },
  planCard: {
    alignSelf: 'stretch',
    backgroundColor: CARD_BG,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    minWidth: 0,
    overflow: 'hidden',
  },
  planCardFlex: {
    flex: 1,
    minWidth: 0,
  },
  planCardCompact: {
    padding: 16,
    borderRadius: 18,
  },
  planCardPressed: {
    opacity: 0.92,
  },
  freeCardSelected: {
    borderColor: 'rgba(255,255,255,0.35)',
    borderWidth: 2,
  },
  proCard: {
    borderColor: 'rgba(34,197,94,0.4)',
    backgroundColor: 'rgba(34,197,94,0.06)',
  },
  proCardSelected: {
    borderColor: GREEN,
    borderWidth: 2,
  },
  proCardGlow: {
    ...StyleSheet.absoluteFill,
    borderRadius: 20,
    overflow: 'hidden',
  },
  familyCard: {
    backgroundColor: FAMILY.paywallCardBg,
    borderColor: FAMILY.paywallCardBorder,
  },
  familyCardSelected: {
    borderColor: FAMILY.accent,
    borderWidth: 2,
  },
  planBadgeRow: { marginBottom: 10 },
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
    backgroundColor: FAMILY.paywallBadgeBg,
    borderWidth: 1,
    borderColor: FAMILY.paywallBadgeBorder,
  },
  familyBadgePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: FAMILY.accentLight,
    letterSpacing: 0.2,
  },
  planName: { fontSize: 20, fontWeight: '800', color: TEXT_PRIMARY, letterSpacing: -0.3 },
  planNameCompact: { fontSize: 18 },
  planTagline: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_MUTED,
    marginTop: 4,
    lineHeight: 17,
  },
  planTaglineCompact: {
    fontSize: 11,
    lineHeight: 15,
  },
  proTagline: { color: 'rgba(74,222,128,0.85)' },
  familyTagline: { color: FAMILY.paywallTagline },
  familySubtitle: {
    fontSize: 12,
    color: TEXT_MUTED,
    lineHeight: 17,
    marginTop: 2,
  },
  familySubtitleCompact: {
    fontSize: 11,
    lineHeight: 15,
  },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 10, flexWrap: 'wrap' },
  planPrice: { fontSize: 32, fontWeight: '800', color: TEXT_PRIMARY, letterSpacing: -0.5 },
  planPriceCompact: { fontSize: 26 },
  proPrice: { color: GREEN },
  familyPrice: { color: FAMILY.accentLight },
  planPeriod: { fontSize: 14, color: TEXT_MUTED },
  planPeriodCompact: { fontSize: 12 },
  yearlyNote: { fontSize: 12, color: TEXT_MUTED, marginTop: 3 },
  yearlyNoteCompact: { fontSize: 11, lineHeight: 15 },
  featureList: { marginTop: 14, gap: 10, flex: 1 },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    width: '100%',
  },
  featureText: {
    flex: 1,
    flexShrink: 1,
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 19,
  },
  featureTextCompact: {
    fontSize: 12,
    lineHeight: 17,
  },
  cardFooter: {
    marginTop: 'auto',
    paddingTop: 16,
  },
  selectIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  selectDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: TEXT_MUTED,
  },
  selectText: { fontSize: 13, fontWeight: '600', color: TEXT_MUTED },
  ctaSection: {
    marginTop: 28,
    paddingTop: 22,
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
    backgroundColor: FAMILY.accent,
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
  familyLinkText: { fontSize: 13, fontWeight: '600', color: FAMILY.accentLight },
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
