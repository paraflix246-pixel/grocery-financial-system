import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/Themed';
import { BackButton } from '@/src/components/BackButton';
import {
  ReceiptStorageChoicePanel,
} from '@/src/components/receipt/ReceiptStorageChoicePanel';
import type { ReceiptImageStoragePreference } from '@/src/models/types';
import { deleteAllReceipts } from '@/src/services/storageService';
import type { ReceiptStorageSessionChoice } from '@/src/services/privacyPreferencesService';
import { useSettingsStore } from '@/src/store/useSettingsStore';
import { SmartCartColors, SmartCartRadius } from '@/src/theme/smartCart';
import { getScreenBottomPadding } from '@/src/utils/safeAreaLayout';

function confirmDestructive(title: string, message: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

export default function PrivacySettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { settings, loading, loadSettings, saveSettings } = useSettingsStore();
  const [deletingReceipts, setDeletingReceipts] = useState(false);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const receiptChoice: ReceiptStorageSessionChoice | null =
    settings?.receiptImageStorage === 'data_only'
      ? 'data_only'
      : settings?.receiptImageStorage === 'image_and_data'
        ? 'image_and_data'
        : null;

  const handleCommunityToggle = useCallback(
    async (value: boolean) => {
      await saveSettings({ communityPriceSharing: value });
    },
    [saveSettings]
  );

  const handleReceiptChoiceChange = useCallback(
    async (choice: ReceiptStorageSessionChoice) => {
      await saveSettings({
        receiptImageStorage: choice as ReceiptImageStoragePreference,
        rememberReceiptImageChoice: true,
      });
    },
    [saveSettings]
  );

  const handleRememberChange = useCallback(
    async (remember: boolean) => {
      await saveSettings({ rememberReceiptImageChoice: remember });
    },
    [saveSettings]
  );

  const handleDeleteAllReceipts = useCallback(async () => {
    const confirmed = await confirmDestructive(
      t('privacy.deleteAllReceiptsTitle'),
      t('privacy.deleteAllReceiptsMessage')
    );
    if (!confirmed) return;
    setDeletingReceipts(true);
    try {
      const count = await deleteAllReceipts();
      if (Platform.OS === 'web') {
        window.alert(t('privacy.deleteAllReceiptsDone', { count }));
      } else {
        Alert.alert(t('privacy.deleteAllReceiptsTitle'), t('privacy.deleteAllReceiptsDone', { count }));
      }
    } finally {
      setDeletingReceipts(false);
    }
  }, [t]);

  if (loading && !settings) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={SmartCartColors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <BackButton />
        <Text style={styles.headerTitle}>{t('privacy.settingsTitle')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: getScreenBottomPadding(insets.bottom) },
        ]}
      >
        <Text style={styles.sectionTitle}>{t('privacy.communitySharing.section')}</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>{t('privacy.communitySharing.toggle')}</Text>
              <Text style={styles.rowHint}>{t('privacy.communitySharing.description')}</Text>
            </View>
            <Switch
              value={Boolean(settings?.communityPriceSharing)}
              onValueChange={(value) => void handleCommunityToggle(value)}
              trackColor={{ true: SmartCartColors.primary, false: SmartCartColors.border }}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t('privacy.receiptStorage.settingsSection')}</Text>
        <ReceiptStorageChoicePanel
          choice={receiptChoice}
          onChoiceChange={(choice) => void handleReceiptChoiceChange(choice)}
          rememberChoice={Boolean(settings?.rememberReceiptImageChoice)}
          onRememberChange={(remember) => void handleRememberChange(remember)}
        />

        <Text style={styles.sectionTitle}>{t('privacy.dataManagement.section')}</Text>
        <Pressable
          style={({ pressed }) => [styles.dangerBtn, pressed && styles.dangerBtnPressed]}
          onPress={() => void handleDeleteAllReceipts()}
          disabled={deletingReceipts}
          accessibilityRole="button"
        >
          {deletingReceipts ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.dangerBtnText}>{t('privacy.deleteAllReceipts')}</Text>
          )}
        </Pressable>
        <Text style={styles.dangerHint}>{t('privacy.deleteAllReceiptsHint')}</Text>

        <Text style={styles.sectionTitle}>{t('settings.legal')}</Text>
        <View style={styles.linkGroup}>
          {(
            [
              { route: '/privacy', label: t('privacy.legal.privacyPolicy') },
              { route: '/terms', label: t('privacy.legal.terms') },
              { route: '/data-retention', label: t('privacy.legal.dataRetention') },
              { route: '/cookies', label: t('privacy.legal.cookies') },
              { route: '/privacy-request', label: t('privacy.legal.privacyRequests') },
            ] as const
          ).map((link) => (
            <Pressable
              key={link.route}
              style={({ pressed }) => [styles.linkRow, pressed && styles.linkRowPressed]}
              onPress={() => router.push(link.route)}
              accessibilityRole="link"
            >
              <Text style={styles.linkLabel}>{link.label}</Text>
              <SymbolView
                name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                tintColor={SmartCartColors.textMuted}
                size={16}
              />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SmartCartColors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', textAlign: 'center', color: SmartCartColors.text },
  headerSpacer: { width: 40 },
  content: { padding: 16, gap: 8 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: SmartCartColors.textSecondary,
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  card: {
    padding: 16,
    borderRadius: SmartCartRadius.md,
    backgroundColor: SmartCartColors.card,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  rowText: { flex: 1, gap: 6 },
  rowLabel: { fontSize: 16, fontWeight: '600', color: SmartCartColors.text },
  rowHint: { fontSize: 13, color: SmartCartColors.textSecondary, lineHeight: 18 },
  dangerBtn: {
    backgroundColor: '#DC2626',
    padding: 16,
    borderRadius: SmartCartRadius.md,
    alignItems: 'center',
  },
  dangerBtnPressed: { opacity: 0.88 },
  dangerBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  dangerHint: { fontSize: 13, color: SmartCartColors.textMuted, lineHeight: 18, marginBottom: 8 },
  linkGroup: {
    borderRadius: SmartCartRadius.md,
    backgroundColor: SmartCartColors.card,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    overflow: 'hidden',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: SmartCartColors.border,
  },
  linkRowPressed: { backgroundColor: SmartCartColors.primaryMuted },
  linkLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: SmartCartColors.text },
});
