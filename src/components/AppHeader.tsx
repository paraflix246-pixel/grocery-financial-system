import { Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';

import { Text } from '@/components/Themed';
import { BackButton } from '@/src/components/BackButton';
import { PennyPantryLogo } from '@/src/components/PennyPantryLogo';
import { SmartCartColors } from '@/src/theme/smartCart';

type Props = {
  notificationCount?: number;
  onNotificationPress?: () => void;
  showBack?: boolean;
};

export function AppHeader({ notificationCount = 0, onNotificationPress, showBack = true }: Props) {
  const router = useRouter();

  return (
    <View style={styles.row}>
      <View style={styles.leftSlot}>
        {showBack ? <BackButton /> : null}
      </View>

      <PennyPantryLogo
        variant="inline"
        size={22}
        nameSize={20}
        nameColor={SmartCartColors.primaryDark}
        nameStyle={styles.logoName}
        style={styles.logoRow}
      />

      <View style={styles.rightSlot}>
        <Pressable
          style={styles.iconBtn}
          accessibilityLabel="Notifications"
          onPress={onNotificationPress ?? (() => router.push('/price-tracker?tab=alerts' as never))}>
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
    alignItems: 'center',
  },
  logoName: {
    fontWeight: '800',
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
