import { useMemo } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import {
  getNotificationKindIcon,
  isNotificationRead,
  type AppNotification,
} from '@/src/services/notificationCenterLogic';
import { useNotificationCenterStore } from '@/src/store/useNotificationCenterStore';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';

type AnchorRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  anchor: AnchorRect | null;
};

const PANEL_OFFSET = 6;
const HORIZONTAL_INSET = 12;

function formatNotification(t: ReturnType<typeof useTranslation>['t'], item: AppNotification) {
  return {
    title: t(item.titleKey, item.titleParams ?? {}),
    body: t(item.bodyKey, item.bodyParams ?? {}),
  };
}

export function NotificationCenterSheet({ visible, onClose, anchor }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const notifications = useNotificationCenterStore((s) => s.notifications);
  const readState = useNotificationCenterStore((s) => s.readState);
  const markAllRead = useNotificationCenterStore((s) => s.markAllRead);
  const markRead = useNotificationCenterStore((s) => s.markRead);
  const dismiss = useNotificationCenterStore((s) => s.dismiss);
  const dismissAll = useNotificationCenterStore((s) => s.dismissAll);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !isNotificationRead(item, readState)).length,
    [notifications, readState]
  );

  const handleOpen = async (item: AppNotification) => {
    await markRead(item);
    onClose();
    if (item.route) {
      router.push(item.route as never);
    }
  };

  const handleMarkAllRead = async () => {
    await markAllRead();
  };

  const handleDismiss = async (item: AppNotification) => {
    await dismiss(item);
  };

  const handleDismissAll = async () => {
    await dismissAll();
  };

  if (!visible || !anchor) return null;

  const panelTop = anchor.y + anchor.height + PANEL_OFFSET;
  const maxPanelHeight = screenHeight - panelTop - insets.bottom - 16;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('headerMenu.closeMenu')}
        />
        <View
          style={[
            styles.panel,
            {
              top: panelTop,
              left: HORIZONTAL_INSET,
              right: HORIZONTAL_INSET,
              maxHeight: maxPanelHeight,
            },
          ]}
          accessibilityViewIsModal>
          <View style={styles.header}>
            <Text style={styles.title}>{t('notificationCenter.title')}</Text>
            {notifications.length > 0 ? (
              <View style={styles.headerActions}>
                {unreadCount > 0 ? (
                  <Pressable
                    onPress={() => void handleMarkAllRead()}
                    accessibilityRole="button"
                    accessibilityLabel={t('notificationCenter.markAllRead')}>
                    <Text style={styles.markAll}>{t('notificationCenter.markAllRead')}</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={() => void handleDismissAll()}
                  accessibilityRole="button"
                  accessibilityLabel={t('notificationCenter.clearAll')}>
                  <Text style={styles.clearAll}>{t('notificationCenter.clearAll')}</Text>
                </Pressable>
              </View>
            ) : null}
          </View>

          {notifications.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🔔</Text>
              <Text style={styles.emptyTitle}>{t('notificationCenter.emptyTitle')}</Text>
              <Text style={styles.emptyBody} muted>
                {t('notificationCenter.emptyBody')}
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              showsVerticalScrollIndicator
              bounces={false}>
              <View style={styles.list}>
                {notifications.map((item) => {
                  const unread = !isNotificationRead(item, readState);
                  const copy = formatNotification(t, item);
                  return (
                    <Pressable
                      key={item.id}
                      style={({ pressed }) => [
                        styles.row,
                        unread && styles.rowUnread,
                        pressed && styles.rowPressed,
                      ]}
                      onPress={() => void handleOpen(item)}
                      accessibilityRole="button">
                      <Text style={styles.rowEmoji}>{getNotificationKindIcon(item.kind)}</Text>
                      <View style={styles.rowCopy}>
                        <Text style={styles.rowTitle}>{copy.title}</Text>
                        <Text style={styles.rowBody} numberOfLines={2}>
                          {copy.body}
                        </Text>
                      </View>
                      <Pressable
                        style={styles.deleteBtn}
                        onPress={() => void handleDismiss(item)}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={t('notificationCenter.deleteOne')}>
                        <SymbolView
                          name={{ ios: 'trash', android: 'delete', web: 'delete' }}
                          tintColor={SmartCartColors.danger}
                          size={16}
                        />
                      </Pressable>
                      {item.route ? (
                        <SymbolView
                          name={{
                            ios: 'chevron.right',
                            android: 'chevron_right',
                            web: 'chevron_right',
                          }}
                          tintColor={SmartCartColors.textSecondary}
                          size={16}
                        />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  panel: {
    position: 'absolute',
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: SmartCartColors.border,
    padding: 16,
    overflow: 'hidden',
    ...SmartCartShadow.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: { fontSize: 20, fontWeight: '800', color: SmartCartColors.text },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  markAll: { fontSize: 13, fontWeight: '700', color: SmartCartColors.primary },
  clearAll: { fontSize: 13, fontWeight: '700', color: SmartCartColors.danger },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingBottom: 4,
  },
  empty: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  emptyEmoji: { fontSize: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: SmartCartColors.text },
  emptyBody: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  list: { gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: SmartCartRadius.md,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    backgroundColor: SmartCartColors.card,
  },
  rowUnread: {
    borderColor: SmartCartColors.primary,
    backgroundColor: SmartCartColors.badge,
  },
  rowPressed: { opacity: 0.92 },
  rowEmoji: { fontSize: 22 },
  rowCopy: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 14, fontWeight: '800', color: SmartCartColors.text },
  rowBody: { fontSize: 12, color: SmartCartColors.textSecondary, lineHeight: 16 },
  deleteBtn: { padding: 4 },
});
