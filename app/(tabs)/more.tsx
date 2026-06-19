import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import type { ComponentProps } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import { AppHeader } from '@/src/components/AppHeader';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

type MenuItem = {
  label: string;
  subtitle: string;
  icon: SymbolName;
  route: string;
};

const MENU_ITEMS: MenuItem[] = [
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
    route: '/(tabs)/lists',
  },
  {
    label: 'Scan Receipt',
    subtitle: 'Capture or upload a receipt',
    icon: { ios: 'camera', android: 'photo_camera', web: 'photo_camera' },
    route: '/(tabs)/scan',
  },
];

export default function MoreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}>
      <AppHeader />
      <Text style={styles.title}>More</Text>
      <Text style={styles.subtitle}>Settings and quick links</Text>

      <View style={styles.menu}>
        {MENU_ITEMS.map((item) => (
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
              <Text style={styles.menuLabel}>{item.label}</Text>
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
  subtitle: { fontSize: 14, color: SmartCartColors.textSecondary, marginBottom: 24, marginTop: 4 },
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
  menuLabel: { fontSize: 16, fontWeight: '700', color: SmartCartColors.text },
  menuSub: { fontSize: 12, color: SmartCartColors.textSecondary, marginTop: 2 },
  footer: { alignItems: 'center', marginTop: 48 },
  footerLeaf: { fontSize: 28 },
  footerBrand: { fontSize: 18, fontWeight: '800', color: SmartCartColors.primaryDark, marginTop: 4 },
  footerVersion: { fontSize: 12, color: SmartCartColors.textMuted, marginTop: 4 },
});
