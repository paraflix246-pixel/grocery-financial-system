import type { ComponentProps } from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Text } from '@/components/Themed';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

export type HeaderMenuItem = {
  id: string;
  label: string;
  icon: SymbolName;
  onPress: () => void;
  accessibilityLabel?: string;
};

export type HeaderMenuFooterItem = {
  label: string;
  icon: SymbolName;
  onPress: () => void;
  destructive?: boolean;
  primary?: boolean;
  accessibilityLabel?: string;
};

type AnchorRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type MenuTheme = {
  card: string;
  border: string;
  primary: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  closeMenuLabel: string;
  anchor: AnchorRect | null;
  items: HeaderMenuItem[];
  footerItem?: HeaderMenuFooterItem | null;
  theme: MenuTheme;
};

const MENU_MIN_WIDTH = 220;
const MENU_OFFSET = 6;

export function HeaderDropdownMenu({
  visible,
  onClose,
  closeMenuLabel,
  anchor,
  items,
  footerItem,
  theme,
}: Props) {
  const { width: screenWidth } = useWindowDimensions();

  if (!visible || !anchor) return null;

  const menuTop = anchor.y + anchor.height + MENU_OFFSET;
  const menuRight = Math.max(12, screenWidth - (anchor.x + anchor.width));

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={closeMenuLabel}
        />
        <View
          style={[
            styles.menu,
            {
              top: menuTop,
              right: menuRight,
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
          accessibilityViewIsModal>
          {items.map((item) => (
            <Pressable
              key={item.id}
              style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
              onPress={() => {
                onClose();
                item.onPress();
              }}
              accessibilityRole="menuitem"
              accessibilityLabel={item.accessibilityLabel ?? item.label}>
              <SymbolView name={item.icon} tintColor={theme.primary} size={18} />
              <Text style={styles.menuItemText}>{item.label}</Text>
            </Pressable>
          ))}
          {footerItem ? (
            <>
              <View style={[styles.separator, { backgroundColor: theme.border }]} />
              <Pressable
                style={({ pressed }) => [
                  styles.menuItem,
                  styles.footerItem,
                  footerItem.primary && { backgroundColor: theme.primary },
                  footerItem.destructive && styles.footerItemDestructive,
                  pressed && !footerItem.primary && styles.menuItemPressed,
                  pressed && footerItem.primary && styles.footerItemPrimaryPressed,
                ]}
                onPress={() => {
                  onClose();
                  footerItem.onPress();
                }}
                accessibilityRole="menuitem"
                accessibilityLabel={footerItem.accessibilityLabel ?? footerItem.label}>
                <SymbolView
                  name={footerItem.icon}
                  tintColor={
                    footerItem.primary
                      ? '#fff'
                      : footerItem.destructive
                        ? SmartCartColors.danger
                        : theme.primary
                  }
                  size={18}
                />
                <Text
                  style={[
                    styles.menuItemText,
                    footerItem.primary && styles.footerItemTextPrimary,
                    footerItem.destructive && styles.footerItemTextDestructive,
                  ]}>
                  {footerItem.label}
                </Text>
              </Pressable>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  menu: {
    position: 'absolute',
    minWidth: MENU_MIN_WIDTH,
    borderRadius: SmartCartRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    ...SmartCartShadow.card,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  menuItemPressed: {
    backgroundColor: SmartCartColors.badge,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: SmartCartColors.text,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  footerItem: {
    marginTop: 0,
  },
  footerItemDestructive: {},
  footerItemPrimaryPressed: {
    opacity: 0.92,
  },
  footerItemTextPrimary: {
    color: '#fff',
    fontWeight: '700',
  },
  footerItemTextDestructive: {
    color: SmartCartColors.danger,
    fontWeight: '700',
  },
});
