import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import type { ComponentProps } from 'react';

import { Text } from '@/components/Themed';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

type Action = {
  id: string;
  label: string;
  icon: SymbolName;
  color: string;
  bgLight: string;
  bgDark: string;
  route: string;
};

const ACTIONS: Action[] = [
  {
    id: 'tracker',
    label: 'Price Tracker',
    icon: { ios: 'tag.fill', android: 'sell', web: 'sell' },
    color: SmartCartColors.primaryMid,
    bgLight: '#E8F5EE',
    bgDark: '#C8E6D4',
    route: '/(tabs)/receipts',
  },
  {
    id: 'lists',
    label: 'Shopping Lists',
    icon: { ios: 'list.bullet.clipboard', android: 'checklist', web: 'checklist' },
    color: SmartCartColors.accentPurple,
    bgLight: '#F3E8FF',
    bgDark: '#DDD6FE',
    route: '/(tabs)/shopping-lists',
  },
  {
    id: 'stores',
    label: 'Stores',
    icon: { ios: 'storefront.fill', android: 'store', web: 'store' },
    color: SmartCartColors.accentBlue,
    bgLight: '#EFF6FF',
    bgDark: '#BFDBFE',
    route: '/(tabs)/receipts',
  },
  {
    id: 'alerts',
    label: 'Price Alerts',
    icon: { ios: 'bell.badge.fill', android: 'notifications_active', web: 'notifications_active' },
    color: SmartCartColors.accentOrange,
    bgLight: '#FFF7ED',
    bgDark: '#FED7AA',
    route: '/(tabs)/receipts',
  },
];

export function QuickActionGrid() {
  const router = useRouter();

  return (
    <View style={styles.grid}>
      {ACTIONS.map((action) => (
        <Pressable
          key={action.id}
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          onPress={() => router.push(action.route as never)}>
          <LinearGradient
            colors={[action.bgLight, action.bgDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconCircle}
            pointerEvents="none">
            <SymbolView name={action.icon} tintColor={action.color} size={22} />
          </LinearGradient>
          <Text style={styles.label}>{action.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  card: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.md,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: SmartCartColors.border,
    ...SmartCartShadow.card,
  },
  cardPressed: {
    borderColor: SmartCartColors.primary,
    backgroundColor: SmartCartColors.badge,
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: SmartCartColors.text,
    textAlign: 'center',
    letterSpacing: -0.1,
  },
});
