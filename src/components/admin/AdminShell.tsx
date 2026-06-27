import { useRouter } from 'expo-router';
import { ReactNode, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  ADMIN_NAV,
  type AdminNavBadges,
  type AdminSection,
  type LocaleFilter,
  MOBILE_BREAKPOINT,
  SIDEBAR_WIDTH,
  TOUCH_TARGET,
} from '@/src/components/admin/utils';
import { signOut } from '@/src/services/authService';
import { AdminColors, AdminRadius, AdminShadow } from '@/src/theme/adminTheme';

type AdminShellProps = {
  activeSection: AdminSection;
  onSectionChange: (section: AdminSection) => void;
  localeFilter: LocaleFilter;
  onLocaleFilterChange: (filter: LocaleFilter) => void;
  badges?: AdminNavBadges;
  children: ReactNode;
};

const LOCALE_TABS: Array<{ key: LocaleFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'en', label: 'EN' },
  { key: 'es', label: 'ES' },
];

export function AdminShell({
  activeSection,
  onSectionChange,
  localeFilter,
  onLocaleFilterChange,
  badges = { messages: 0, support: 0 },
  children,
}: AdminShellProps) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < MOBILE_BREAKPOINT;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    router.replace('/');
  };

  const navContent = (
    <View style={styles.sidebarInner}>
      <View style={styles.sidebarBrand}>
        <Text style={styles.sidebarBrandTitle}>Penny Pantry</Text>
        <Text style={styles.sidebarBrandSub}>Admin</Text>
      </View>
      <ScrollView style={styles.navScroll} contentContainerStyle={styles.navList}>
        {ADMIN_NAV.map((item) => {
          const active = item.key === activeSection;
          const badgeCount = item.badgeKey ? badges[item.badgeKey] : 0;
          return (
            <Pressable
              key={item.key}
              style={[styles.navItem, active && styles.navItemActive]}
              onPress={() => {
                onSectionChange(item.key);
                setSidebarOpen(false);
              }}>
              <Text style={[styles.navItemText, active && styles.navItemTextActive]}>{item.label}</Text>
              {badgeCount > 0 ? (
                <View style={styles.navBadge}>
                  <Text style={styles.navBadgeText}>{badgeCount}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.root}>
      {!isMobile ? <View style={styles.sidebarDesktop}>{navContent}</View> : null}

      <Modal visible={isMobile && sidebarOpen} transparent animationType="fade" onRequestClose={() => setSidebarOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setSidebarOpen(false)}>
          <Pressable style={styles.sidebarMobile} onPress={(e) => e.stopPropagation()}>
            {navContent}
          </Pressable>
        </Pressable>
      </Modal>

      <View style={styles.main}>
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            {isMobile ? (
              <Pressable style={styles.menuBtn} onPress={() => setSidebarOpen(true)} accessibilityLabel="Open menu">
                <Text style={styles.menuBtnText}>☰</Text>
              </Pressable>
            ) : null}
            <View style={styles.topBarTitles}>
              <Text style={styles.topBarTitle}>Admin Dashboard</Text>
              <Text style={styles.topBarSubtitle}>Manage subscriptions, users, and platform health</Text>
            </View>
          </View>
          <Pressable style={styles.logoutBtn} onPress={() => void handleLogout()}>
            <Text style={styles.logoutBtnText}>Log Out</Text>
          </Pressable>
        </View>

        <View style={styles.localeRow}>
          {LOCALE_TABS.map((tab) => {
            const active = localeFilter === tab.key;
            return (
              <Pressable
                key={tab.key}
                style={[styles.localeTab, active && styles.localeTabActive]}
                onPress={() => onLocaleFilterChange(tab.key)}>
                <Text style={[styles.localeTabText, active && styles.localeTabTextActive]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <ScrollView
          style={styles.contentScroll}
          contentContainerStyle={styles.contentInner}
          keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: AdminColors.background,
    minHeight: Platform.OS === 'web' ? ('100vh' as unknown as number) : undefined,
  },
  sidebarDesktop: {
    width: SIDEBAR_WIDTH,
    backgroundColor: AdminColors.sidebarBg,
    borderRightWidth: 1,
    borderRightColor: AdminColors.sidebarBorder,
  },
  sidebarMobile: {
    width: Math.min(SIDEBAR_WIDTH + 40, 280),
    backgroundColor: AdminColors.sidebarBg,
    height: '100%',
    ...AdminShadow.card,
  },
  sidebarInner: {
    flex: 1,
    paddingVertical: 20,
  },
  sidebarBrand: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: AdminColors.sidebarBorder,
    gap: 2,
  },
  sidebarBrandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: AdminColors.sidebarText,
  },
  sidebarBrandSub: {
    fontSize: 12,
    fontWeight: '600',
    color: AdminColors.sidebarTextMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  navScroll: {
    flex: 1,
  },
  navList: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: AdminRadius.md,
    minHeight: TOUCH_TARGET,
  },
  navItemActive: {
    backgroundColor: AdminColors.sidebarActive,
  },
  navItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: AdminColors.sidebarTextMuted,
  },
  navItemTextActive: {
    color: AdminColors.sidebarText,
    fontWeight: '700',
  },
  navBadge: {
    backgroundColor: AdminColors.sidebarBadge,
    borderRadius: 999,
    minWidth: 22,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignItems: 'center',
  },
  navBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: AdminColors.sidebarText,
  },
  overlay: {
    flex: 1,
    backgroundColor: AdminColors.modalBackdrop,
    flexDirection: 'row',
  },
  main: {
    flex: 1,
    minWidth: 0,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: AdminColors.topBarBg,
    borderBottomWidth: 1,
    borderBottomColor: AdminColors.border,
    gap: 12,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  topBarTitles: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  topBarTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: AdminColors.text,
    letterSpacing: -0.3,
  },
  topBarSubtitle: {
    fontSize: 13,
    color: AdminColors.textSecondary,
  },
  menuBtn: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: AdminRadius.md,
    backgroundColor: AdminColors.surfaceMuted,
  },
  menuBtnText: {
    fontSize: 20,
    color: AdminColors.text,
  },
  logoutBtn: {
    backgroundColor: AdminColors.surfaceMuted,
    borderWidth: 1,
    borderColor: AdminColors.border,
    borderRadius: AdminRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: AdminColors.text,
  },
  localeRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: AdminColors.topBarBg,
    borderBottomWidth: 1,
    borderBottomColor: AdminColors.border,
  },
  localeTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: AdminColors.surfaceMuted,
    minHeight: 36,
    justifyContent: 'center',
  },
  localeTabActive: {
    backgroundColor: AdminColors.primary,
  },
  localeTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: AdminColors.textSecondary,
  },
  localeTabTextActive: {
    color: AdminColors.primaryText,
  },
  contentScroll: {
    flex: 1,
  },
  contentInner: {
    padding: 20,
    gap: 20,
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
});
