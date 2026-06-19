import { Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useNavigation, useRouter } from 'expo-router';

import { Text } from '@/components/Themed';
import { BackButton, canNavigateBack } from '@/src/components/BackButton';
import { SmartCartColors } from '@/src/theme/smartCart';

type Props = {
  notificationCount?: number;
  onMenuPress?: () => void;
  onNotificationPress?: () => void;
};

export function AppHeader({ notificationCount = 0, onMenuPress, onNotificationPress }: Props) {
  const router = useRouter();
  const navigation = useNavigation();
  const showBack = canNavigateBack(navigation as { canGoBack: () => boolean });

  return (
    <View style={styles.row}>
      <View style={styles.leftSlot}>
        {showBack ? (
          <BackButton />
        ) : (
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
        )}
      </View>

      <View style={styles.logoRow}>
        <SymbolView
          name={{ ios: 'leaf.fill', android: 'eco', web: 'eco' }}
          tintColor={SmartCartColors.primaryMid}
          size={20}
        />
        <Text style={styles.logo}>SmartCart</Text>
      </View>

      <View style={styles.rightSlot}>
        <Pressable
          style={styles.iconBtn}
          accessibilityLabel="Notifications"
          onPress={onNotificationPress ?? (() => router.push('/price-alerts'))}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 4,
  },
  leftSlot: {
    minWidth: 72,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  rightSlot: {
    minWidth: 72,
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 'auto',
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
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
