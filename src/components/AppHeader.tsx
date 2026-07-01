import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Text } from '@/components/Themed';
import { BackButton } from '@/src/components/BackButton';
import { HeaderDropdownMenu } from '@/src/components/HeaderDropdownMenu';
import { PennyPantryLogo } from '@/src/components/PennyPantryLogo';
import { useAdminStatus } from '@/src/hooks/useAdminStatus';
import { useFamilyWorkspaceScreenTheme } from '@/src/hooks/useFamilyWorkspaceScreenTheme';
import { getStoredUser, isSignedInAccount } from '@/src/services/authService';
import { supabase } from '@/src/services/supabaseClient';
import { SmartCartColors } from '@/src/theme/smartCart';
import { confirmSignOut, shareApp } from '@/src/utils/accountMenuActions';
import { signOutAndNavigate } from '@/src/utils/logoutRouting';

type Props = {
  notificationCount?: number;
  onNotificationPress?: () => void;
  showBack?: boolean;
};

type AnchorRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function AppHeader({ notificationCount = 0, onNotificationPress, showBack = true }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const { isAdmin } = useAdminStatus();
  const fw = useFamilyWorkspaceScreenTheme();
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<AnchorRect | null>(null);
  const menuTriggerRef = useRef<View>(null);
  const iconTint = fw.isFamilyScope ? fw.primaryDark : SmartCartColors.text;

  const refreshAuth = useCallback(async () => {
    const signedIn = await isSignedInAccount();
    const stored = await getStoredUser();
    setIsSignedIn(signedIn);
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

  const openMenu = useCallback(() => {
    menuTriggerRef.current?.measureInWindow((x, y, width, height) => {
      setMenuAnchor({ x, y, width, height });
      setMenuOpen(true);
    });
  }, []);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
  }, []);

  const menuItems = useMemo(
    () => [
      {
        id: 'settings',
        label: t('more.items.settings.label'),
        icon: { ios: 'gearshape.fill', android: 'settings', web: 'settings' } as const,
        onPress: () => router.push('/settings' as never),
        accessibilityLabel: t('more.items.settings.label'),
      },
      {
        id: 'notifications',
        label: t('headerMenu.pushNotifications'),
        icon: { ios: 'bell.badge.fill', android: 'notifications_active', web: 'notifications_active' } as const,
        onPress: () => router.push('/settings/notifications' as never),
        accessibilityLabel: t('headerMenu.pushNotifications'),
      },
      {
        id: 'share',
        label: t('settings.shareApp'),
        icon: { ios: 'square.and.arrow.up', android: 'share', web: 'share' } as const,
        onPress: () => {
          void shareApp(t);
        },
        accessibilityLabel: t('settings.shareApp'),
      },
    ],
    [router, t],
  );

  const footerItem = useMemo(() => {
    if (isSignedIn) {
      return {
        label: t('settings.logout'),
        icon: {
          ios: 'rectangle.portrait.and.arrow.right',
          android: 'logout',
          web: 'logout',
        } as const,
        onPress: () =>
          confirmSignOut(async () => {
            await signOutAndNavigate(router);
          }, t),
        destructive: true,
        accessibilityLabel: t('settings.logout'),
      };
    }

    if (showSignIn || !isSignedIn) {
      return {
        label: t('common.signIn'),
        icon: { ios: 'person.crop.circle.badge.plus', android: 'login', web: 'login' } as const,
        onPress: () => router.push('/onboarding/signin?returnTo=%2F(tabs)' as never),
        primary: true,
        accessibilityLabel: t('common.signIn'),
      };
    }

    return null;
  }, [isSignedIn, router, showSignIn, t]);

  return (
    <>
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
            {isSignedIn && isAdmin ? (
              <Pressable
                style={styles.headerActionBtn}
                accessibilityLabel={t('admin.nav.dashboard')}
                accessibilityRole="button"
                onPress={() => router.push('/admin' as never)}>
                <Text style={styles.adminText}>{t('admin.nav.short')}</Text>
              </Pressable>
            ) : null}
            {showSignIn ? (
              <Pressable
                style={styles.headerActionBtn}
                accessibilityLabel={t('common.signIn')}
                accessibilityRole="button"
                onPress={() => router.push('/onboarding/signin?returnTo=%2F(tabs)' as never)}>
                <Text style={styles.signInText}>{t('common.signIn')}</Text>
              </Pressable>
            ) : null}
            <View ref={menuTriggerRef} collapsable={false}>
              <Pressable
                style={styles.iconBtn}
                accessibilityLabel={t('headerMenu.openMenu')}
                accessibilityRole="button"
                accessibilityState={{ expanded: menuOpen }}
                onPress={openMenu}>
                <SymbolView
                  name={{ ios: 'gearshape.fill', android: 'settings', web: 'settings' }}
                  tintColor={iconTint}
                  size={22}
                />
              </Pressable>
            </View>
            <Pressable
              style={styles.iconBtn}
              accessibilityLabel={t('headerMenu.priceAlertsInbox')}
              accessibilityRole="button"
              onPress={onNotificationPress ?? (() => router.push('/price-tracker?tab=alerts' as never))}>
              <SymbolView
                name={{ ios: 'bell', android: 'notifications', web: 'notifications' }}
                tintColor={iconTint}
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

      <HeaderDropdownMenu
        visible={menuOpen}
        onClose={closeMenu}
        closeMenuLabel={t('headerMenu.closeMenu')}
        anchor={menuAnchor}
        items={menuItems}
        footerItem={footerItem}
        theme={{
          card: fw.card,
          border: fw.border,
          primary: fw.primary,
        }}
      />
    </>
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
  headerActionBtn: {
    minHeight: 40,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminText: {
    fontSize: 14,
    fontWeight: '700',
    color: SmartCartColors.primary,
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
