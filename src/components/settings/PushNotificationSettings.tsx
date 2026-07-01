import { SymbolView } from 'expo-symbols';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { Text } from '@/components/Themed';
import {
  DEFAULT_NOTIFICATION_PREFS,
  type NotificationType,
} from '@/src/services/notificationPreferenceLogic';
import {
  getNotificationPermissionStatus,
  NOTIFICATION_TITLES,
  openSystemNotificationSettings,
  requestNotificationPermissions,
  sendDevSampleNotification,
  type NotificationPermissionStatus,
} from '@/src/services/notificationService';
import { SmartCartColors, SmartCartRadius } from '@/src/theme/smartCart';

export type PushNotificationPrefs = typeof DEFAULT_NOTIFICATION_PREFS;

type Props = {
  values: PushNotificationPrefs;
  onChange: (patch: Partial<PushNotificationPrefs>) => void;
  cardStyle?: StyleProp<ViewStyle>;
  showManageAlertsLink?: boolean;
  showDevTests?: boolean;
};

type ToggleDef = {
  key: keyof PushNotificationPrefs;
  labelKey: string;
  hintKey: string;
};

const PRICE_TOGGLES: ToggleDef[] = [
  { key: 'notifyPriceAlerts', labelKey: 'settings.priceDropAlerts', hintKey: 'settings.priceDropAlertsHint' },
  {
    key: 'notifyPriceChangeAlerts',
    labelKey: 'settings.priceChangeAlerts',
    hintKey: 'settings.priceChangeAlertsHint',
  },
  { key: 'notifySaleAlerts', labelKey: 'settings.saleAlerts', hintKey: 'settings.saleAlertsHint' },
  {
    key: 'notifyCheaperStoreAlerts',
    labelKey: 'settings.cheaperStoreAlerts',
    hintKey: 'settings.cheaperStoreAlertsHint',
  },
  { key: 'notifyBudgetAlerts', labelKey: 'settings.budgetAlerts', hintKey: 'settings.budgetAlertsHint' },
  {
    key: 'notifyWeeklySummaryAlerts',
    labelKey: 'settings.weeklySummaryAlerts',
    hintKey: 'settings.weeklySummaryAlertsHint',
  },
];

const HOUSEHOLD_TOGGLES: ToggleDef[] = [
  {
    key: 'notifyFamilyListAlerts',
    labelKey: 'settings.familyListAlerts',
    hintKey: 'settings.familyListAlertsHint',
  },
  {
    key: 'notifyPantryLowAlerts',
    labelKey: 'settings.pantryLowAlerts',
    hintKey: 'settings.pantryLowAlertsHint',
  },
  {
    key: 'notifyHouseholdReceiptAlerts',
    labelKey: 'settings.householdReceiptAlerts',
    hintKey: 'settings.householdReceiptAlertsHint',
  },
];

const DEV_TEST_TYPES: NotificationType[] = [
  'price_drop',
  'price_change',
  'sale',
  'cheaper_store',
  'budget',
  'weekly_summary',
  'family_list',
  'pantry_low',
  'household_receipt',
];

function ToggleRow({
  label,
  hint,
  value,
  disabled,
  onValueChange,
}: {
  label: string;
  hint: string;
  value: boolean;
  disabled: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleInfo}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleHint}>{hint}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: SmartCartColors.border, true: SmartCartColors.primaryMuted }}
        thumbColor="#fff"
        disabled={disabled}
      />
    </View>
  );
}

export function PushNotificationSettings({
  values,
  onChange,
  cardStyle,
  showManageAlertsLink = true,
  showDevTests = __DEV__,
}: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const [permissionStatus, setPermissionStatus] =
    useState<NotificationPermissionStatus>('undetermined');
  const [devTesting, setDevTesting] = useState<NotificationType | null>(null);

  const refreshPermission = useCallback(async () => {
    setPermissionStatus(await getNotificationPermissionStatus());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshPermission();
    }, [refreshPermission]),
  );

  const pushBlocked =
    Platform.OS !== 'web' &&
    values.pushNotificationsEnabled &&
    permissionStatus === 'denied';

  const handlePushMasterToggle = async (enabled: boolean) => {
    if (enabled && Platform.OS !== 'web') {
      const granted = await requestNotificationPermissions();
      await refreshPermission();
      if (!granted) return;
    }
    onChange({ pushNotificationsEnabled: enabled });
  };

  const handleRequestPermission = async () => {
    if (permissionStatus === 'denied') {
      await openSystemNotificationSettings();
      await refreshPermission();
      return;
    }
    const granted = await requestNotificationPermissions();
    await refreshPermission();
    if (granted) {
      onChange({ pushNotificationsEnabled: true });
    }
  };

  const handleDevTest = async (type: NotificationType) => {
    setDevTesting(type);
    try {
      if (Platform.OS !== 'web') {
        await requestNotificationPermissions();
      }
      await sendDevSampleNotification(type);
    } finally {
      setDevTesting(null);
    }
  };

  const renderToggleGroup = (groupLabelKey: string, toggles: ToggleDef[]) => (
    <>
      <Text style={styles.groupLabel}>{t(groupLabelKey)}</Text>
      {toggles.map((toggle, index) => (
        <View key={toggle.key}>
          {index > 0 ? <View style={styles.divider} /> : null}
          <ToggleRow
            label={t(toggle.labelKey)}
            hint={t(toggle.hintKey)}
            value={values[toggle.key] as boolean}
            disabled={false}
            onValueChange={(value) => onChange({ [toggle.key]: value } as Partial<PushNotificationPrefs>)}
          />
        </View>
      ))}
    </>
  );

  return (
    <View style={[styles.card, cardStyle]}>
      <Text style={styles.sectionIntro}>{t('settings.pushNotificationsIntro')}</Text>

      {Platform.OS === 'web' ? (
        <Text style={styles.webNote}>{t('settings.pushNotificationsWebNote')}</Text>
      ) : null}

      {permissionStatus !== 'unsupported' && permissionStatus !== 'granted' ? (
        <View style={[styles.permissionBanner, pushBlocked && styles.permissionBannerBlocked]}>
          <Text style={styles.permissionText}>
            {permissionStatus === 'denied'
              ? t('settings.pushPermissionDenied')
              : t('settings.pushPermissionNeeded')}
          </Text>
          <Pressable
            style={({ pressed }) => [styles.permissionBtn, pressed && styles.permissionBtnPressed]}
            onPress={() => void handleRequestPermission()}
            accessibilityRole="button"
            accessibilityLabel={t('settings.pushPermissionAction')}>
            <Text style={styles.permissionBtnText}>{t('settings.pushPermissionAction')}</Text>
          </Pressable>
        </View>
      ) : null}

      <ToggleRow
        label={t('settings.pushNotificationsMaster')}
        hint={t('settings.pushNotificationsMasterHint')}
        value={values.pushNotificationsEnabled}
        disabled={false}
        onValueChange={(value) => void handlePushMasterToggle(value)}
      />

      <View style={styles.divider} />

      {renderToggleGroup('settings.pushNotificationTypes', PRICE_TOGGLES)}

      <View style={styles.divider} />

      {renderToggleGroup('settings.pushNotificationGroupHousehold', HOUSEHOLD_TOGGLES)}

      {showManageAlertsLink ? (
        <>
          <View style={styles.divider} />
          <Pressable
            style={({ pressed }) => [styles.linkRow, pressed && styles.linkRowPressed]}
            onPress={() => router.push('/price-tracker?tab=alerts' as never)}
            accessibilityRole="link"
            accessibilityLabel={t('settings.manageTrackedAlerts')}>
            <View style={styles.linkText}>
              <Text style={styles.linkLabel}>{t('settings.manageTrackedAlerts')}</Text>
              <Text style={styles.linkHint}>{t('settings.manageTrackedAlertsHint')}</Text>
            </View>
            <SymbolView
              name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
              tintColor={SmartCartColors.textMuted}
              size={16}
            />
          </Pressable>
        </>
      ) : null}

      {showDevTests && Platform.OS !== 'web' ? (
        <>
          <View style={styles.divider} />
          <Text style={styles.groupLabel}>{t('settings.pushNotificationsDevTests')}</Text>
          <Text style={styles.devHint}>{t('settings.pushNotificationsDevTestsHint')}</Text>
          <View style={styles.devGrid}>
            {DEV_TEST_TYPES.map((type) => (
              <Pressable
                key={type}
                style={({ pressed }) => [
                  styles.devBtn,
                  pressed && styles.devBtnPressed,
                  devTesting === type && styles.devBtnActive,
                ]}
                disabled={devTesting != null}
                onPress={() => void handleDevTest(type)}
                accessibilityRole="button"
                accessibilityLabel={NOTIFICATION_TITLES[type]}>
                <Text style={styles.devBtnText} numberOfLines={2}>
                  {NOTIFICATION_TITLES[type]}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.md,
    padding: 16,
    marginBottom: 20,
  },
  sectionIntro: {
    fontSize: 13,
    color: SmartCartColors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  webNote: {
    fontSize: 12,
    color: SmartCartColors.textMuted,
    lineHeight: 17,
    marginBottom: 12,
  },
  permissionBanner: {
    backgroundColor: `${SmartCartColors.primary}12`,
    borderRadius: SmartCartRadius.sm,
    padding: 12,
    marginBottom: 14,
    gap: 8,
  },
  permissionBannerBlocked: {
    backgroundColor: `${SmartCartColors.danger}10`,
  },
  permissionText: {
    fontSize: 13,
    color: SmartCartColors.text,
    lineHeight: 18,
  },
  permissionBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: SmartCartRadius.sm,
    backgroundColor: SmartCartColors.primary,
  },
  permissionBtnPressed: { opacity: 0.9 },
  permissionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  groupLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: SmartCartColors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 10,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  toggleInfo: { flex: 1 },
  toggleLabel: { fontSize: 15, fontWeight: '600', color: SmartCartColors.text },
  toggleHint: { fontSize: 12, color: SmartCartColors.textSecondary, marginTop: 2 },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: SmartCartColors.border,
    marginVertical: 14,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  linkRowPressed: { opacity: 0.85 },
  linkText: { flex: 1 },
  linkLabel: { fontSize: 15, fontWeight: '600', color: SmartCartColors.primary },
  linkHint: { fontSize: 12, color: SmartCartColors.textSecondary, marginTop: 2 },
  devHint: {
    fontSize: 12,
    color: SmartCartColors.textMuted,
    lineHeight: 17,
    marginBottom: 10,
  },
  devGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  devBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: SmartCartRadius.sm,
    backgroundColor: `${SmartCartColors.primary}14`,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: SmartCartColors.border,
    minWidth: '47%',
    flexGrow: 1,
  },
  devBtnPressed: { opacity: 0.85 },
  devBtnActive: { opacity: 0.6 },
  devBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: SmartCartColors.text,
    textAlign: 'center',
  },
});
