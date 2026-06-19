import { SymbolView } from 'expo-symbols';
import { Tabs } from 'expo-router';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Themed';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { SmartCartColors, SmartCartShadow } from '@/src/theme/smartCart';

const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 72;

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
  navigation: { isFocused: () => boolean };
};

function WebTabScreenLayout({ children, navigation }: WebTabScreenLayoutProps) {
  const focused = navigation.isFocused();
  return (
    <View style={[styles.webScene, !focused && styles.webSceneHidden]} pointerEvents={focused ? 'auto' : 'none'}>
      {children}
    </View>
  );
}

export default function TabLayout() {
  const headerShown = useClientOnlyValue(false, true);

  return (
    <Tabs
      screenOptions={{
        headerShown,
        tabBarActiveTintColor: SmartCartColors.primary,
        tabBarInactiveTintColor: SmartCartColors.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        ...(Platform.OS === 'web' ? { animation: 'fade' as const } : null),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
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
          title: 'Receipts',
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
          title: 'Scan',
          headerShown: false,
          tabBarIcon: ({ focused }) => <ScanTabIcon focused={focused} />,
          tabBarLabel: ({ focused, color }) => (
            <Text style={[styles.scanLabel, { color: focused ? SmartCartColors.primary : color }]}>
              Scan
            </Text>
          ),
        }}
      />
      <Tabs.Screen
        name="lists"
        options={{
          title: 'Lists',
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
          title: 'More',
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
      <Tabs.Screen name="scan.web" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  webScene: {
    flex: 1,
    paddingBottom: TAB_BAR_HEIGHT,
  },
  webSceneHidden: {
    display: 'none',
  },
  tabBar: {
    backgroundColor: '#fff',
    borderTopColor: SmartCartColors.border,
    borderTopWidth: 1,
    height: TAB_BAR_HEIGHT,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
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
    height: 32,
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
    marginTop: -28,
    ...SmartCartShadow.fab,
  },
  scanFabFocused: {
    backgroundColor: SmartCartColors.primaryDark,
  },
  scanLabel: { fontSize: 11, fontWeight: '600', marginTop: -4 },
});
