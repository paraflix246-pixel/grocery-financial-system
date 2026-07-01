import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import type { ComponentProps } from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import { AppHeader } from '@/src/components/AppHeader';
import { PremiumScreenBackground } from '@/src/components/PremiumScreenBackground';
import { PennyPantryLogo } from '@/src/components/PennyPantryLogo';
import { useAdminStatus } from '@/src/hooks/useAdminStatus';
import { useSubscriptionStore } from '@/src/store/useSubscriptionStore';
import { useFamilyWorkspaceScreenTheme } from '@/src/hooks/useFamilyWorkspaceScreenTheme';
import { FamilyWorkspaceTheme } from '@/src/theme/familyWorkspaceTheme';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';
import { getTabScreenScrollBottomPadding } from '@/src/utils/safeAreaLayout';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

type MenuSection = {
  id: string;
  title: string;
  items: MenuItem[];
};

type MenuItem = {
  labelKey: string;
  subtitleKey: string;
  icon: SymbolName;
  route: string;
  pro?: boolean;
};

function useMenuSections(): MenuSection[] {
  const { t } = useTranslation();
  return useMemo(
    () => [
      {
        id: 'essentials',
        title: t('more.sections.essentials'),
        items: [
          { labelKey: 'more.items.settings.label', subtitleKey: 'more.items.settings.subtitle', icon: { ios: 'gearshape.fill', android: 'settings', web: 'settings' }, route: '/settings' },
          { labelKey: 'more.items.budget.label', subtitleKey: 'more.items.budget.subtitle', icon: { ios: 'dollarsign.circle', android: 'payments', web: 'payments' }, route: '/settings/budget' },
          { labelKey: 'more.items.spendingAnalytics.label', subtitleKey: 'more.items.spendingAnalytics.subtitle', icon: { ios: 'chart.line.uptrend.xyaxis', android: 'trending_up', web: 'trending_up' }, route: '/spending-analytics' },
          { labelKey: 'more.items.cartComparison.label', subtitleKey: 'more.items.cartComparison.subtitle', icon: { ios: 'cart.fill', android: 'shopping_cart', web: 'shopping_cart' }, route: '/cart-comparison' },
          { labelKey: 'more.items.pantry.label', subtitleKey: 'more.items.pantry.subtitle', icon: { ios: 'cabinet.fill', android: 'kitchen', web: 'kitchen' }, route: '/pantry' },
          { labelKey: 'more.items.shoppingLists.label', subtitleKey: 'more.items.shoppingLists.subtitle', icon: { ios: 'list.bullet', android: 'checklist', web: 'checklist' }, route: '/(tabs)/shopping-lists?browse=1' },
          { labelKey: 'more.items.scanReceipt.label', subtitleKey: 'more.items.scanReceipt.subtitle', icon: { ios: 'camera', android: 'photo_camera', web: 'photo_camera' }, route: '/(tabs)/scan' },
        ],
      },
      {
        id: 'proInsights',
        title: t('more.sections.proInsights'),
        items: [
          { labelKey: 'more.items.pro.label', subtitleKey: 'more.items.pro.subtitle', icon: { ios: 'star.fill', android: 'star', web: 'star' }, route: '/subscriptions' },
          { labelKey: 'more.items.spendingInsights.label', subtitleKey: 'more.items.spendingInsights.subtitle', icon: { ios: 'brain.head.profile', android: 'psychology', web: 'psychology' }, route: '/insights_pro', pro: true },
          { labelKey: 'more.items.brandIntelligence.label', subtitleKey: 'more.items.brandIntelligence.subtitle', icon: { ios: 'building.columns.fill', android: 'corporate_fare', web: 'corporate_fare' }, route: '/brand-intelligence', pro: true },
          { labelKey: 'more.items.inflationTracker.label', subtitleKey: 'more.items.inflationTracker.subtitle', icon: { ios: 'chart.xyaxis.line', android: 'show_chart', web: 'show_chart' }, route: '/inflation_tracker', pro: true },
          { labelKey: 'more.items.regionalInsights.label', subtitleKey: 'more.items.regionalInsights.subtitle', icon: { ios: 'map.fill', android: 'map', web: 'map' }, route: '/regional_insights', pro: true },
          { labelKey: 'more.items.usageStats.label', subtitleKey: 'more.items.usageStats.subtitle', icon: { ios: 'gauge.with.dots.needle.67percent', android: 'speed', web: 'speed' }, route: '/usage_tracking', pro: true },
        ],
      },
      {
        id: 'collaboration',
        title: t('more.sections.collaboration'),
        items: [
          { labelKey: 'more.items.familyPlans.label', subtitleKey: 'more.items.familyPlans.subtitle', icon: { ios: 'person.3.fill', android: 'groups', web: 'groups' }, route: '/family_plans', pro: true },
        ],
      },
    ],
    [t]
  );
}

export default function MoreScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tier = useSubscriptionStore((s) => s.tier);
  const { isAdmin } = useAdminStatus();
  const sections = useMenuSections();
  const fw = useFamilyWorkspaceScreenTheme();

  return (
    <PremiumScreenBackground>
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + 12,
          paddingBottom: getTabScreenScrollBottomPadding(insets.bottom),
        },
      ]}>
      <AppHeader />
      <Text style={styles.title}>{t('more.title')}</Text>
      <Text style={styles.subtitle}>{t('more.subtitle')}</Text>

      {isAdmin ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admin.nav.controlPanel')}</Text>
          <View style={styles.menu}>
            <Pressable
              style={({ pressed }) => [styles.menuItem, styles.adminMenuItem, pressed && styles.menuItemPressed]}
              accessibilityRole="button"
              accessibilityLabel={t('admin.nav.dashboard')}
              onPress={() => router.push('/admin' as never)}>
              <View style={[styles.menuIcon, styles.adminMenuIcon]}>
                <SymbolView
                  name={{ ios: 'shield.lefthalf.filled', android: 'admin_panel_settings', web: 'admin_panel_settings' }}
                  tintColor={SmartCartColors.primaryDark}
                  size={22}
                />
              </View>
              <View style={styles.menuText}>
                <Text style={styles.menuLabel}>{t('admin.nav.dashboard')}</Text>
                <Text style={styles.menuSub}>{t('admin.nav.dashboardSub')}</Text>
              </View>
              <SymbolView
                name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                tintColor={SmartCartColors.textMuted}
                size={16}
              />
            </Pressable>
          </View>
        </View>
      ) : null}

      {tier === 'free' && !isAdmin && (
        <Pressable
          style={({ pressed }) => [styles.proBanner, pressed && styles.proBannerPressed]}
          onPress={() => router.push('/paywall' as never)}>
          <SymbolView name={{ ios: 'star.fill', android: 'star', web: 'star' }} tintColor="#fff" size={22} />
          <View style={styles.proBannerText}>
            <Text style={styles.proBannerTitle}>{t('upgrade.stopMissingDrops')}</Text>
            <Text style={styles.proBannerSub}>{t('upgrade.proBannerSub')}</Text>
          </View>
          <SymbolView
            name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
            tintColor="#fff"
            size={16}
          />
        </Pressable>
      )}

      {sections.map((section) => (
        <View key={section.id} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.menu}>
            {section.items.map((item) => {
              const label = t(item.labelKey);
              const subtitle = t(item.subtitleKey);
              return (
              <Pressable
                key={item.labelKey}
                style={({ pressed }) => [
                  styles.menuItem,
                  fw.cardSurface,
                  fw.menuCard,
                  pressed && [
                    styles.menuItemPressed,
                    fw.isFamilyScope && { borderColor: FamilyWorkspaceTheme.chipSelectedBorder, backgroundColor: FamilyWorkspaceTheme.badgeBg },
                  ],
                ]}
                accessibilityRole="button"
                accessibilityLabel={label}
                onPress={() => router.push(item.route as never)}>
                <View style={styles.menuIcon}>
                  <SymbolView name={item.icon} tintColor={fw.primary} size={22} />
                </View>
                <View style={styles.menuText}>
                  <View style={styles.labelRow}>
                    <Text style={styles.menuLabel}>{label}</Text>
                    {item.pro && tier === 'free' && (
                      <View style={styles.proPill}>
                        <Text style={styles.proPillText}>PRO</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.menuSub}>{subtitle}</Text>
                </View>
                <SymbolView
                  name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                  tintColor={SmartCartColors.textMuted}
                  size={16}
                />
              </Pressable>
            );
            })}
          </View>
        </View>
      ))}

      <View style={styles.footer}>
        <PennyPantryLogo variant="inline" size={28} nameSize={18} style={styles.footerLogo} />
        <Text style={styles.footerVersion}>{t('more.footerVersion')}</Text>
      </View>
    </ScrollView>
    </PremiumScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { paddingHorizontal: 16, paddingBottom: 32 },
  title: { fontSize: 28, fontWeight: '800', color: SmartCartColors.text },
  subtitle: { fontSize: 14, color: SmartCartColors.textSecondary, marginBottom: 16, marginTop: 4 },
  proBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: SmartCartColors.primaryDark,
    borderRadius: SmartCartRadius.md,
    padding: 16,
    marginBottom: 20,
    ...SmartCartShadow.card,
  },
  proBannerPressed: { opacity: 0.92 },
  proBannerText: { flex: 1 },
  proBannerTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  proBannerSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: SmartCartColors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  menu: { gap: 10 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: SmartCartRadius.md,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    ...SmartCartShadow.card,
  },
  menuItemPressed: {
    borderColor: SmartCartColors.primary,
    backgroundColor: SmartCartColors.badge,
    opacity: 0.92,
  },
  adminMenuItem: {
    borderColor: SmartCartColors.primaryDark,
    backgroundColor: `${SmartCartColors.primaryDark}08`,
  },
  adminMenuIcon: {
    backgroundColor: `${SmartCartColors.primaryDark}18`,
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${SmartCartColors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: { flex: 1 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  menuLabel: { fontSize: 16, fontWeight: '700', color: SmartCartColors.text },
  proPill: {
    backgroundColor: SmartCartColors.accentPurple,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  proPillText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  menuSub: { fontSize: 12, color: SmartCartColors.textSecondary, marginTop: 2 },
  footer: { alignItems: 'center', marginTop: 24 },
  footerLogo: { marginBottom: 4 },
  footerVersion: { fontSize: 12, color: SmartCartColors.textMuted, marginTop: 4 },
});
