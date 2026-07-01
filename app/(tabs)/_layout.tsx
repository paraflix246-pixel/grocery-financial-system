import { SymbolView } from 'expo-symbols';
import { Tabs, useIsFocused } from 'expo-router';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { useAppTheme } from '@/src/theme/AppThemeProvider';
import { useFamilyWorkspaceScreenTheme } from '@/src/hooks/useFamilyWorkspaceScreenTheme';
import { SmartCartColors, SmartCartShadow } from '@/src/theme/smartCart';
import {
  getTabBarBottomPadding,
  getTabBarHeight,
  TAB_BAR_TOP_PADDING,
} from '@/src/utils/safeAreaLayout';

const WEB_TAB_BAR_HEIGHT = 72;
const WEB_TAB_CONTENT_INSET = WEB_TAB_BAR_HEIGHT + 16;

function ScanTabIcon({ focused }: { focused: boolean }) {
  return (
    <View pointerEvents="box-none" style={styles.scanFabSlot}>
      <View style={[styles.scanFab, focused && styles.scanFabFocused]} pointerEvents="none">
        <SymbolView
          name={{ ios: 'viewfinder', android: 'document_scanner', web: 'document_scanner' }}
          tintColor="#fff"
          size={28}
        />
      </View>
    </View>
  );
}

type WebTabScreenLayoutProps = {
  children: ReactNode;
};

function WebTabScreenLayout({ children }: WebTabScreenLayoutProps) {
  const focused = useIsFocused();
  const fw = useFamilyWorkspaceScreenTheme();
  return (
    <View
      style={[
        styles.webScene,
        fw.screen,
        !focused && styles.webSceneHidden,
      ]}
      pointerEvents={focused ? 'auto' : 'none'}>
      {children}
    </View>
  );
}

export default function TabLayout() {
  const { t } = useTranslation();
  const { theme } = useAppTheme();
  const fw = useFamilyWorkspaceScreenTheme();
  const headerShown = useClientOnlyValue(false, true);
  const insets = useSafeAreaInsets();
  const tabBarBottomPadding = getTabBarBottomPadding(insets.bottom);
  const tabBarHeight = getTabBarHeight(insets.bottom);
  const defaultTabBorder = `${theme.primary}40`;

  const tabBarStyle =
    Platform.OS === 'web'
      ? [
          styles.tabBar,
          {
            backgroundColor: fw.tabBarBackground,
            borderTopColor: fw.isFamilyScope ? fw.border : defaultTabBorder,
            borderTopWidth: fw.isFamilyScope ? 2 : 1.5,
          },
        ]
      : [
          styles.tabBar,
          {
            height: tabBarHeight,
            paddingBottom: tabBarBottomPadding,
            backgroundColor: fw.tabBarBackground,
            borderTopColor: fw.isFamilyScope ? fw.border : defaultTabBorder,
            borderTopWidth: fw.isFamilyScope ? 2 : 1.5,
          },
        ];

  return (
    <Tabs
      screenLayout={Platform.OS === 'web' ? WebTabScreenLayout : undefined}
      screenOptions={{
        headerShown,
        tabBarActiveTintColor: fw.tabActiveTint,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle,
        tabBarLabelStyle: styles.tabLabel,
        ...(Platform.OS === 'web' ? { animation: 'fade' as const, lazy: false } : null),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <SymbolView
              name={{ ios: focused ? 'house.fill' : 'house', android: 'home', web: 'home' }}
              tintColor={color}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="receipts"
        options={{
          title: t('tabs.receipts'),
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <SymbolView
              name={{
                ios: focused ? 'doc.text.fill' : 'doc.text',
                android: 'receipt_long',
                web: 'receipt_long',
              }}
              tintColor={color}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: t('tabs.scan'),
          headerShown: false,
          tabBarIcon: ({ focused }) => <ScanTabIcon focused={focused} />,
          tabBarLabel: ({ focused, color }) => (
            <Text style={[styles.scanLabel, { color: focused ? SmartCartColors.primary : color }]}>
              {t('tabs.scan')}
            </Text>
          ),
        }}
      />
      <Tabs.Screen
        name="shopping-lists"
        initialParams={{ browse: '1' }}
        options={{
          title: t('tabs.lists'),
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <SymbolView
              name={{
                ios: focused ? 'list.bullet' : 'list.dash',
                android: 'checklist',
                web: 'checklist',
              }}
              tintColor={color}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: t('tabs.more'),
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <SymbolView
              name={{
                ios: focused ? 'ellipsis.circle.fill' : 'ellipsis.circle',
                android: 'more_horiz',
                web: 'more_horiz',
              }}
              tintColor={color}
              size={24}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  webScene: {
    flex: 1,
    paddingBottom: WEB_TAB_CONTENT_INSET,
    ...(Platform.OS === 'web' ? { overflow: 'hidden' as const } : null),
  },
  webSceneHidden: {
    opacity: 0,
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: WEB_TAB_CONTENT_INSET,
    zIndex: -1,
  },
  tabBar: {
    borderTopWidth: 1.5,
    height: WEB_TAB_BAR_HEIGHT,
    paddingTop: TAB_BAR_TOP_PADDING,
    paddingBottom: 12,
    ...(Platform.OS === 'web'
      ? {
          position: 'fixed' as const,
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1100,
          elevation: 1100,
        }
      : null),
  },
  tabLabel: { fontSize: 11, fontWeight: '600' },
  scanFabSlot: {
    width: 56,
    height: 40,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'visible',
  },
  scanFab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: SmartCartColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Platform.OS === 'web' ? -20 : -28,
    ...SmartCartShadow.fab,
  },
  scanFabFocused: {
    backgroundColor: SmartCartColors.primaryDark,
  },
  scanLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },
});
