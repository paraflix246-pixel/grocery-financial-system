import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useFocusEffect, useRouter } from 'expo-router';

import { Text } from '@/components/Themed';
import { BackButton } from '@/src/components/BackButton';
import { PennyPantryLogo } from '@/src/components/PennyPantryLogo';
import { getStoredUser, isSignedInAccount, signOut } from '@/src/services/authService';
import { supabase } from '@/src/services/supabaseClient';
import { SmartCartColors } from '@/src/theme/smartCart';

type Props = {
  notificationCount?: number;
  onNotificationPress?: () => void;
  showBack?: boolean;
};

export function AppHeader({ notificationCount = 0, onNotificationPress, showBack = true }: Props) {
  const router = useRouter();
  const [showLogout, setShowLogout] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);

  const refreshAuth = useCallback(async () => {
    const signedIn = await isSignedInAccount();
    const stored = await getStoredUser();
    setShowLogout(signedIn);
    setShowSignIn(!signedIn && Boolean(stored?.isGuest));
  }, []);

  useEffect(() => {
    void refreshAuth();
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      void refreshAuth();
    });
    return () => subscription.unsubscribe();
  }, [refreshAuth]);

  useFocusEffect(
    useCallback(() => {
      void refreshAuth();
    }, [refreshAuth]),
  );

  const handleLogoutPress = () => {
    const doLogout = async () => {
      await signOut();
      router.replace('/onboarding/signin');
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm('Log out? You will need to sign in again to access your account.')) {
        void doLogout();
      }
      return;
    }

    Alert.alert('Log out?', 'You will need to sign in again to access your account.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: () => {
          void doLogout();
        },
      },
    ]);
  };

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
        <View style={styles.rightActions}>
          {showLogout ? (
            <Pressable
              style={styles.logoutBtn}
              accessibilityLabel="Log out"
              accessibilityRole="button"
              onPress={handleLogoutPress}>
              <Text style={styles.logoutText}>Log out</Text>
            </Pressable>
          ) : showSignIn ? (
            <Pressable
              style={styles.logoutBtn}
              accessibilityLabel="Sign in"
              accessibilityRole="button"
              onPress={() => router.push('/onboarding/signin?returnTo=%2F(tabs)' as never)}>
              <Text style={styles.signInText}>Sign in</Text>
            </Pressable>
          ) : null}
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
    minWidth: 120,
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 'auto',
    flexShrink: 0,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  logoutBtn: {
    minHeight: 40,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '700',
    color: SmartCartColors.text,
  },
  signInText: {
    fontSize: 14,
    fontWeight: '700',
    color: SmartCartColors.primary,
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
