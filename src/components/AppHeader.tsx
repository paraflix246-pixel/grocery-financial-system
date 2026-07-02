import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Text } from '@/components/Themed';
import { BackButton } from '@/src/components/BackButton';
import { HeaderDropdownMenu } from '@/src/components/HeaderDropdownMenu';
import { NotificationCenterSheet } from '@/src/components/NotificationCenterSheet';
import { NotificationCountBadge } from '@/src/components/NotificationCountBadge';
import { PennyPantryLogo } from '@/src/components/PennyPantryLogo';
import { useAdminStatus } from '@/src/hooks/useAdminStatus';
import { useFamilyWorkspaceScreenTheme } from '@/src/hooks/useFamilyWorkspaceScreenTheme';
import { isSignedInAccount } from '@/src/services/authService';
import { supabase } from '@/src/services/supabaseClient';
import { useNotificationCenterStore } from '@/src/store/useNotificationCenterStore';
import { SmartCartColors } from '@/src/theme/smartCart';
import { confirmSignOut, shareApp } from '@/src/utils/accountMenuActions';
import { signOutAndNavigate } from '@/src/utils/logoutRouting';

type Props = {
  showBack?: boolean;
};

type AnchorRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function AppHeader({ showBack = true }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const { isAdmin } = useAdminStatus();
  const fw = useFamilyWorkspaceScreenTheme();
  const unreadCount = useNotificationCenterStore((s) => s.unreadCount);
  const refreshNotifications = useNotificationCenterStore((s) => s.refresh);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationCenterOpen, setNotificationCenterOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<AnchorRect | null>(null);
  const [notificationAnchor, setNotificationAnchor] = useState<AnchorRect | null>(null);
  const menuTriggerRef = useRef<View>(null);
  const notificationBellRef = useRef<View>(null);
  const iconTint = fw.isFamilyScope ? fw.primaryDark : SmartCartColors.text;

  const refreshAuth = useCallback(async () => {
    const signedIn = await isSignedInAccount();
    setIsSignedIn(signedIn);
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
      void refreshNotifications();
    }, [refreshAuth, refreshNotifications]),
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

  const openNotificationCenter = useCallback(() => {
    notificationBellRef.current?.measureInWindow((x, y, width, height) => {
      setNotificationAnchor({ x, y, width, height });
      setNotificationCenterOpen(true);
    });
  }, []);

  const closeNotificationCenter = useCallback(() => {
    setNotificationCenterOpen(false);
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

    return {
      label: t('common.signIn'),
      icon: { ios: 'person.crop.circle.badge.plus', android: 'login', web: 'login' } as const,
      onPress: () => router.push('/onboarding/signin?returnTo=%2F(tabs)' as never),
      primary: true,
      accessibilityLabel: t('common.signIn'),
    };
  }, [isSignedIn, router, t]);

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
            <View ref={notificationBellRef} collapsable={false}>
              <Pressable
                style={styles.iconBtn}
                accessibilityLabel={t('headerMenu.notificationCenter')}
                accessibilityRole="button"
                accessibilityState={{ expanded: notificationCenterOpen }}
                onPress={openNotificationCenter}>
                <SymbolView
                  name={{ ios: 'bell', android: 'notifications', web: 'notifications' }}
                  tintColor={iconTint}
                  size={22}
                />
                <NotificationCountBadge count={unreadCount} />
              </Pressable>
            </View>
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

      <NotificationCenterSheet
        visible={notificationCenterOpen}
        onClose={closeNotificationCenter}
        anchor={notificationAnchor}
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
    minWidth: 88,
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
});
