import { Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';

import { Text } from '@/components/Themed';
import { SmartCartColors } from '@/src/theme/smartCart';

type Props = {
  notificationCount?: number;
  onMenuPress?: () => void;
};

export function AppHeader({ notificationCount = 3, onMenuPress }: Props) {
  const router = useRouter();

  return (
    <View style={styles.row}>
      <Pressable
        style={styles.iconBtn}
        onPress={onMenuPress ?? (() => router.push('/settings/budget'))}
        accessibilityLabel="Menu">
        <SymbolView
          name={{ ios: 'line.3.horizontal', android: 'menu', web: 'menu' }}
          tintColor={SmartCartColors.text}
          size={22}
        />
      </Pressable>

      <View style={styles.logoRow}>
        <SymbolView
          name={{ ios: 'leaf.fill', android: 'eco', web: 'eco' }}
          tintColor={SmartCartColors.primaryMid}
          size={20}
        />
        <Text style={styles.logo}>SmartCart</Text>
      </View>

      <Pressable style={styles.iconBtn} accessibilityLabel="Notifications">
        <SymbolView
          name={{ ios: 'bell', android: 'notifications', web: 'notifications' }}
          tintColor={SmartCartColors.text}
          size={22}
        />
        {notificationCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{notificationCount > 9 ? '9+' : notificationCount}</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 4,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logo: {
    fontSize: 20,
    fontWeight: '800',
    color: SmartCartColors.primaryDark,
    letterSpacing: -0.4,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: SmartCartColors.primaryMid,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: SmartCartColors.background,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
});
