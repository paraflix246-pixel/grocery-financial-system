import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import type { ComponentProps } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import { AppHeader } from '@/src/components/AppHeader';
import { useSubscriptionStore } from '@/src/store/useSubscriptionStore';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

type MenuSection = {
  title: string;
  items: MenuItem[];
};

type MenuItem = {
  label: string;
  subtitle: string;
  icon: SymbolName;
  route: string;
  pro?: boolean;
};

const SECTIONS: MenuSection[] = [
  {
    title: 'Essentials',
    items: [
      {
        label: 'Settings',
        subtitle: 'Profile, notifications & preferences',
        icon: { ios: 'gearshape.fill', android: 'settings', web: 'settings' },
        route: '/settings',
      },
      {
        label: 'Budget',
        subtitle: 'Monthly limits & category budgets',
        icon: { ios: 'dollarsign.circle', android: 'payments', web: 'payments' },
        route: '/settings/budget',
      },
      {
        label: 'Spending Analytics',
        subtitle: 'Trends and category breakdown',
        icon: { ios: 'chart.line.uptrend.xyaxis', android: 'trending_up', web: 'trending_up' },
        route: '/(tabs)/receipts',
      },
      {
        label: 'Shopping Lists',
        subtitle: 'Manage your grocery lists',
        icon: { ios: 'list.bullet', android: 'checklist', web: 'checklist' },
        route: '/(tabs)/shopping-lists',
      },
      {
        label: 'Scan Receipt',
        subtitle: 'Capture or upload a receipt',
        icon: { ios: 'camera', android: 'photo_camera', web: 'photo_camera' },
        route: '/(tabs)/scan',
      },
    ],
  },
  {
    title: 'Pro & Insights',
    items: [
      {
        label: 'SmartCart Pro',
        subtitle: 'Subscription & plan management',
        icon: { ios: 'star.fill', android: 'star', web: 'star' },
        route: '/subscriptions',
      },
      {
        label: 'AI Insights Pro',
        subtitle: 'Overspend, store trends & frequency',
        icon: { ios: 'brain.head.profile', android: 'psychology', web: 'psychology' },
        route: '/insights_pro',
        pro: true,
      },
      {
        label: 'Inflation Tracker',
        subtitle: 'Personal price index from receipts',
        icon: { ios: 'chart.xyaxis.line', android: 'show_chart', web: 'show_chart' },
        route: '/inflation_tracker',
        pro: true,
      },
      {
        label: 'Usage Stats',
        subtitle: 'Local usage & contribution metrics',
        icon: { ios: 'gauge.with.dots.needle.67percent', android: 'speed', web: 'speed' },
        route: '/usage_tracking',
        pro: true,
      },
    ],
  },
  {
    title: 'Deals & Partners',
    items: [
      {
        label: 'Marketplace',
        subtitle: 'Curated grocery deals',
        icon: { ios: 'bag.fill', android: 'shopping_bag', web: 'shopping_bag' },
        route: '/marketplace',
      },
      {
        label: 'Delivery Partners',
        subtitle: 'Affiliate grocery delivery links',
        icon: { ios: 'shippingbox.fill', android: 'local_shipping', web: 'local_shipping' },
        route: '/affiliate_links',
      },
      {
        label: 'Cashback',
        subtitle: 'Earn back on qualifying purchases',
        icon: { ios: 'dollarsign.arrow.circlepath', android: 'savings', web: 'savings' },
        route: '/cashback',
      },
      {
        label: 'Sponsored Offers',
        subtitle: 'Featured brand promotions',
        icon: { ios: 'megaphone.fill', android: 'campaign', web: 'campaign' },
        route: '/sponsored_offers',
      },
    ],
  },
  {
    title: 'Collaboration & Business',
    items: [
      {
        label: 'Family Plans',
        subtitle: 'Share lists with household members',
        icon: { ios: 'person.3.fill', android: 'groups', web: 'groups' },
        route: '/family_plans',
        pro: true,
      },
      {
        label: 'Enterprise',
        subtitle: 'Teams & corporate grocery spend',
        icon: { ios: 'building.2.fill', android: 'business', web: 'business' },
        route: '/enterprise',
      },
      {
        label: 'API Access',
        subtitle: 'Developer integrations',
        icon: { ios: 'curlybraces', android: 'code', web: 'code' },
        route: '/api_access',
        pro: true,
      },
    ],
  },
];

export default function MoreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tier = useSubscriptionStore((s) => s.tier);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}>
      <AppHeader />
      <Text style={styles.title}>More</Text>
      <Text style={styles.subtitle}>Settings, Pro features & partners</Text>

      {tier === 'free' && (
        <Pressable
          style={({ pressed }) => [styles.proBanner, pressed && styles.proBannerPressed]}
          onPress={() => router.push('/paywall' as never)}>
          <SymbolView name={{ ios: 'star.fill', android: 'star', web: 'star' }} tintColor="#fff" size={22} />
          <View style={styles.proBannerText}>
            <Text style={styles.proBannerTitle}>Upgrade to SmartCart Pro</Text>
            <Text style={styles.proBannerSub}>AI insights, inflation tracker & more</Text>
          </View>
          <SymbolView
            name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
            tintColor="#fff"
            size={16}
          />
        </Pressable>
      )}

      {SECTIONS.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.menu}>
            {section.items.map((item) => (
              <Pressable
                key={item.label}
                style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                onPress={() => router.push(item.route as never)}>
                <View style={styles.menuIcon}>
                  <SymbolView name={item.icon} tintColor={SmartCartColors.primary} size={22} />
                </View>
                <View style={styles.menuText}>
                  <View style={styles.labelRow}>
                    <Text style={styles.menuLabel}>{item.label}</Text>
                    {item.pro && tier === 'free' && (
                      <View style={styles.proPill}>
                        <Text style={styles.proPillText}>PRO</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.menuSub}>{item.subtitle}</Text>
                </View>
                <SymbolView
                  name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                  tintColor={SmartCartColors.textMuted}
                  size={16}
                />
              </Pressable>
            ))}
          </View>
        </View>
      ))}

      <View style={styles.footer}>
        <Text style={styles.footerLeaf}>🌿</Text>
        <Text style={styles.footerBrand}>SmartCart</Text>
        <Text style={styles.footerVersion}>Grocery Financial System</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SmartCartColors.background },
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
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.md,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    ...SmartCartShadow.card,
  },
  menuItemPressed: {
    borderColor: SmartCartColors.primary,
    backgroundColor: SmartCartColors.badge,
    opacity: 0.92,
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
  footerLeaf: { fontSize: 28 },
  footerBrand: { fontSize: 18, fontWeight: '800', color: SmartCartColors.primaryDark, marginTop: 4 },
  footerVersion: { fontSize: 12, color: SmartCartColors.textMuted, marginTop: 4 },
});
