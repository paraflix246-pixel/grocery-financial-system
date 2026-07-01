import { SymbolView } from 'expo-symbols';
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentProps } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/Themed';
import { BackButton } from '@/src/components/BackButton';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { JoinFamilyCodeForm } from '@/src/components/family/JoinFamilyCodeForm';
import { useSettingsStore } from '@/src/store/useSettingsStore';
import {
  useSubscriptionStore,
  type SubscriptionTier,
} from '@/src/store/useSubscriptionStore';
import { refreshScheduledNotifications } from '@/src/services/notificationService';
import { signOut, getSession, getStoredUser, isSignedInAccount, changeAccountEmail, ChangeEmailError } from '@/src/services/authService';
import { confirmSignOut, shareApp } from '@/src/utils/accountMenuActions';
import { signOutAndNavigate } from '@/src/utils/logoutRouting';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';
import {
  getOpenLastListPreference,
  setOpenLastListPreference,
} from '@/src/utils/listNavigationPrefs';
import {
  PushNotificationSettings,
  type PushNotificationPrefs,
} from '@/src/components/settings/PushNotificationSettings';
import { DeleteAccountSheet } from '@/src/components/settings/DeleteAccountSheet';
import { useAdminStatus } from '@/src/hooks/useAdminStatus';
import {
  AppearanceSectionReset,
  LanguagePicker,
  ThemePicker,
  FontPicker,
  AvatarPicker,
} from '@/src/components/settings/AppearanceSettings';
import { PremiumScreenBackground } from '@/src/components/PremiumScreenBackground';
import { WorkspaceScopeSwitcher } from '@/src/components/WorkspaceScopeSwitcher';
import { canUseWorkspaceScope } from '@/src/services/dataScopeLogic';
import { useWorkspaceStore } from '@/src/store/useWorkspaceStore';
import {
  disableDevFamilyWorkspacePreview,
  isDevFamilyWorkspacePreviewActive,
  startDevFamilyWorkspacePreview,
} from '@/src/services/devFamilyWorkspacePreview';
import {
  isDevForceFreeCartPreviewActive,
  setDevForceFreeCartPreview,
} from '@/src/services/devFreeCartPreview';
import {
  getDevFamilyRoleOverride,
  setDevFamilyRoleOverride,
  type DevFamilyRoleOverride,
} from '@/src/services/devFamilyRolePreview';
import { promptDevFamilyPreviewSignIn } from '@/src/utils/devFamilyPreviewAuth';
import { useAppTheme } from '@/src/theme/AppThemeProvider';
import { useFamilyWorkspaceScreenTheme } from '@/src/hooks/useFamilyWorkspaceScreenTheme';
import { useAppFont } from '@/src/theme/AppFontProvider';
import type { AppThemeId } from '@/src/theme/appThemes';
import type { AppFontId } from '@/src/theme/appFonts';
import type { AppAvatarId } from '@/src/components/avatars/appAvatars';
import { useAvatar } from '@/src/components/avatars/AvatarProvider';
import { i18n, previewAppLocale, setAppLocale, type AppLocale } from '@/src/i18n';
import { getScreenBottomPadding } from '@/src/utils/safeAreaLayout';
import { submitUserFeedback } from '@/src/services/admin/adminApiService';
import { isLivePriceEstimatesEnabled } from '@/src/services/livePriceEstimatesPreferenceLogic';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

type MenuItem = {
  labelKey: string;
  subtitleKey: string;
  icon: SymbolName;
  route: string;
};

const SETTINGS_FOOTER_HEIGHT = 72;

const MENU_ITEMS: MenuItem[] = [
  {
    labelKey: 'settings.budget',
    subtitleKey: 'settings.budgetSub',
    icon: { ios: 'dollarsign.circle', android: 'payments', web: 'payments' },
    route: '/settings/budget',
  },
  {
    labelKey: 'settings.stores',
    subtitleKey: 'settings.storesSub',
    icon: { ios: 'storefront.fill', android: 'store', web: 'store' },
    route: '/stores',
  },
  {
    labelKey: 'settings.trackAlerts',
    subtitleKey: 'settings.trackAlertsSub',
    icon: { ios: 'bell.badge.fill', android: 'notifications_active', web: 'notifications_active' },
    route: '/price-tracker?tab=alerts',
  },
];

export default function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const { emailChanged } = useLocalSearchParams<{ emailChanged?: string }>();
  const {
    theme,
    themeId: persistedThemeId,
    ready: themeReady,
    previewTheme,
    revertTheme,
    setThemeId: persistThemeId,
  } = useAppTheme();
  const {
    fontId: persistedFontId,
    ready: fontReady,
    previewFont,
    revertFont,
    setFontId: persistFontId,
  } = useAppFont();
  const {
    avatarId: persistedAvatarId,
    ready: avatarReady,
    previewAvatar,
    revertAvatar,
    setAvatarId: persistAvatarId,
  } = useAvatar();
  const { settings, loadSettings, saveSettings } = useSettingsStore();
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [notifyPriceAlerts, setNotifyPriceAlerts] = useState(true);
  const [notifyPriceChangeAlerts, setNotifyPriceChangeAlerts] = useState(true);
  const [notifySaleAlerts, setNotifySaleAlerts] = useState(true);
  const [notifyCheaperStoreAlerts, setNotifyCheaperStoreAlerts] = useState(true);
  const [notifyBudgetAlerts, setNotifyBudgetAlerts] = useState(true);
  const [notifyWeeklySummaryAlerts, setNotifyWeeklySummaryAlerts] = useState(false);
  const [notifyFamilyListAlerts, setNotifyFamilyListAlerts] = useState(true);
  const [notifyPantryLowAlerts, setNotifyPantryLowAlerts] = useState(false);
  const [notifyHouseholdReceiptAlerts, setNotifyHouseholdReceiptAlerts] = useState(false);
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(true);
  const [openLastList, setOpenLastList] = useState(true);
  const [showLivePriceEstimates, setShowLivePriceEstimates] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [savedThemeId, setSavedThemeId] = useState<AppThemeId | null>(null);
  const [draftThemeId, setDraftThemeId] = useState<AppThemeId | null>(null);
  const [savedFontId, setSavedFontId] = useState<AppFontId | null>(null);
  const [draftFontId, setDraftFontId] = useState<AppFontId | null>(null);
  const [savedAvatarId, setSavedAvatarId] = useState<AppAvatarId | null>(null);
  const [draftAvatarId, setDraftAvatarId] = useState<AppAvatarId | null>(null);
  const [savedLocale, setSavedLocale] = useState<AppLocale | null>(null);
  const [draftLocale, setDraftLocale] = useState<AppLocale | null>(null);
  const allowLeaveRef = useRef(false);
  const [devResetting, setDevResetting] = useState(false);
  const [devTierSwitching, setDevTierSwitching] = useState(false);
  const [devFamilyPreview, setDevFamilyPreview] = useState(false);
  const [devFamilyPreviewBusy, setDevFamilyPreviewBusy] = useState(false);
  const [devFreeCartPreview, setDevFreeCartPreview] = useState(false);
  const [devFreeCartPreviewBusy, setDevFreeCartPreviewBusy] = useState(false);
  const [devFamilyRole, setDevFamilyRole] = useState<DevFamilyRoleOverride | null>(null);
  const refreshDevRoleOverride = useWorkspaceStore((s) => s.refreshDevRoleOverride);
  const [accountSheetVisible, setAccountSheetVisible] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);
  const [accountEmail, setAccountEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [changingEmail, setChangingEmail] = useState(false);
  const [emailChangeMessage, setEmailChangeMessage] = useState<string | null>(null);
  const tier = useSubscriptionStore((s) => s.tier);
  const { isAdmin } = useAdminStatus();
  const subscriptionSource = useSubscriptionStore((s) => s.subscriptionSource);
  const upgradeToPro = useSubscriptionStore((s) => s.upgradeToPro);
  const downgradeToFree = useSubscriptionStore((s) => s.downgradeToFree);
  const activeScope = useWorkspaceStore((s) => s.activeScope);
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);
  const hasActiveWorkspaceSub = useWorkspaceStore((s) => s.hasActiveWorkspaceSub);
  const isCurrentMember = useWorkspaceStore((s) => s.isCurrentMember);
  const hasWorkspace = canUseWorkspaceScope(isCurrentMember, hasActiveWorkspaceSub, isAdmin);
  const setActiveScope = useWorkspaceStore((s) => s.setActiveScope);
  const loadWorkspaces = useWorkspaceStore((s) => s.loadWorkspaces);
  const insets = useSafeAreaInsets();
  const footerBottomPadding = Math.max(insets.bottom, 12);
  const scrollBottomPadding =
    getScreenBottomPadding(insets.bottom, Platform.OS === 'web' ? 56 : 40) +
    SETTINGS_FOOTER_HEIGHT +
    footerBottomPadding;
  const fw = useFamilyWorkspaceScreenTheme();

  const load = useCallback(async () => {
    setLoading(true);
    const openLast = await getOpenLastListPreference();
    setOpenLastList(openLast);
    await loadSettings();
    const s = useSettingsStore.getState().settings;
    if (s) {
      setDisplayName(s.displayName);
      setPushNotificationsEnabled(s.pushNotificationsEnabled ?? true);
      setNotifyPriceAlerts(s.notifyPriceAlerts);
      setNotifyPriceChangeAlerts(s.notifyPriceChangeAlerts ?? true);
      setNotifySaleAlerts(s.notifySaleAlerts ?? true);
      setNotifyCheaperStoreAlerts(s.notifyCheaperStoreAlerts ?? true);
      setNotifyBudgetAlerts(s.notifyBudgetAlerts);
      setNotifyWeeklySummaryAlerts(s.notifyWeeklySummaryAlerts ?? false);
      setNotifyFamilyListAlerts(s.notifyFamilyListAlerts ?? true);
      setNotifyPantryLowAlerts(s.notifyPantryLowAlerts ?? false);
      setNotifyHouseholdReceiptAlerts(s.notifyHouseholdReceiptAlerts ?? false);
      setShowLivePriceEstimates(isLivePriceEstimatesEnabled(s));
    }
    const storedUser = await getStoredUser();
    const session = await getSession();
    const signedIn = await isSignedInAccount();
    setIsSignedIn(signedIn);
    setIsGuest(Boolean(storedUser?.isGuest || !session?.user));
    setAccountEmail(session?.user?.email ?? storedUser?.email ?? '');
    await loadWorkspaces();
    setLoading(false);
  }, [loadSettings, loadWorkspaces]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (emailChanged !== '1') return;
    void (async () => {
      const session = await getSession();
      setAccountEmail(session?.user?.email ?? '');
      setEmailChangeMessage(t('settings.changeEmailConfirmed'));
      router.replace('/settings');
    })();
  }, [emailChanged, router, t]);

  useEffect(() => {
    if (__DEV__) {
      void isDevFamilyWorkspacePreviewActive().then(setDevFamilyPreview);
      void getDevFamilyRoleOverride().then(setDevFamilyRole);
      void isDevForceFreeCartPreviewActive().then(setDevFreeCartPreview);
    }
  }, [hasActiveWorkspaceSub, activeScope]);

  useEffect(() => {
    if (savedLocale !== null) return;
    const locale: AppLocale = i18n.language === 'es' ? 'es' : 'en';
    setSavedLocale(locale);
    setDraftLocale(locale);
  }, [savedLocale]);

  useEffect(() => {
    if (!themeReady || savedThemeId !== null) return;
    setSavedThemeId(persistedThemeId);
    setDraftThemeId(persistedThemeId);
  }, [themeReady, persistedThemeId, savedThemeId]);

  useEffect(() => {
    if (!fontReady || savedFontId !== null) return;
    setSavedFontId(persistedFontId);
    setDraftFontId(persistedFontId);
  }, [fontReady, persistedFontId, savedFontId]);

  useEffect(() => {
    if (!avatarReady || savedAvatarId !== null) return;
    setSavedAvatarId(persistedAvatarId);
    setDraftAvatarId(persistedAvatarId);
  }, [avatarReady, persistedAvatarId, savedAvatarId]);

  const appearanceDirty =
    savedThemeId !== null &&
    draftThemeId !== null &&
    savedFontId !== null &&
    draftFontId !== null &&
    savedAvatarId !== null &&
    draftAvatarId !== null &&
    savedLocale !== null &&
    draftLocale !== null &&
    (draftThemeId !== savedThemeId ||
      draftFontId !== savedFontId ||
      draftAvatarId !== savedAvatarId ||
      draftLocale !== savedLocale);

  const saveAppearance = useCallback(async () => {
    if (!draftThemeId || !draftFontId || !draftAvatarId || !draftLocale) return;
    await persistThemeId(draftThemeId);
    await persistFontId(draftFontId);
    await persistAvatarId(draftAvatarId);
    await setAppLocale(draftLocale);
    setSavedThemeId(draftThemeId);
    setSavedFontId(draftFontId);
    setSavedAvatarId(draftAvatarId);
    setSavedLocale(draftLocale);
  }, [draftThemeId, draftFontId, draftAvatarId, draftLocale, persistThemeId, persistFontId, persistAvatarId]);

  const discardAppearance = useCallback(() => {
    if (savedThemeId) {
      revertTheme();
      setDraftThemeId(savedThemeId);
    }
    if (savedFontId) {
      revertFont();
      setDraftFontId(savedFontId);
    }
    if (savedAvatarId) {
      revertAvatar();
      setDraftAvatarId(savedAvatarId);
    }
    if (savedLocale) {
      previewAppLocale(savedLocale);
      setDraftLocale(savedLocale);
    }
  }, [savedThemeId, savedFontId, savedAvatarId, savedLocale, revertTheme, revertFont, revertAvatar]);

  const handleDraftThemeSelect = useCallback(
    (id: AppThemeId) => {
      previewTheme(id);
      setDraftThemeId(id);
    },
    [previewTheme],
  );

  const handleDraftFontSelect = useCallback(
    (id: AppFontId) => {
      previewFont(id);
      setDraftFontId(id);
    },
    [previewFont],
  );

  const handleDraftAvatarSelect = useCallback(
    (id: AppAvatarId) => {
      setDraftAvatarId(id);
      previewAvatar(id);
    },
    [previewAvatar],
  );

  const handleDraftLocaleSelect = useCallback((locale: AppLocale) => {
    setDraftLocale(locale);
    previewAppLocale(locale);
  }, []);

  const themeSectionDirty =
    savedThemeId !== null && draftThemeId !== null && draftThemeId !== savedThemeId;
  const fontSectionDirty =
    savedFontId !== null && draftFontId !== null && draftFontId !== savedFontId;
  const avatarSectionDirty =
    savedAvatarId !== null && draftAvatarId !== null && draftAvatarId !== savedAvatarId;
  const localeSectionDirty =
    savedLocale !== null && draftLocale !== null && draftLocale !== savedLocale;

  const resetThemeSection = useCallback(() => {
    if (!savedThemeId) return;
    previewTheme(savedThemeId);
    setDraftThemeId(savedThemeId);
  }, [savedThemeId, previewTheme]);

  const resetFontSection = useCallback(() => {
    if (!savedFontId) return;
    previewFont(savedFontId);
    setDraftFontId(savedFontId);
  }, [savedFontId, previewFont]);

  const resetAvatarSection = useCallback(() => {
    if (!savedAvatarId) return;
    previewAvatar(savedAvatarId);
    setDraftAvatarId(savedAvatarId);
  }, [savedAvatarId, previewAvatar]);

  const resetLocaleSection = useCallback(() => {
    if (!savedLocale) return;
    previewAppLocale(savedLocale);
    setDraftLocale(savedLocale);
  }, [savedLocale]);

  const confirmLeaveSettings = useCallback(
    (onLeave: () => void) => {
      Alert.alert(t('settings.unsavedChangesTitle'), t('settings.unsavedChangesMessage'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.discardChanges'),
          style: 'destructive',
          onPress: () => {
            discardAppearance();
            allowLeaveRef.current = true;
            onLeave();
          },
        },
        {
          text: t('common.save'),
          onPress: () => {
            void (async () => {
              setSaving(true);
              try {
                await saveAppearance();
                allowLeaveRef.current = true;
                onLeave();
              } catch {
                Alert.alert(t('common.saveFailed'));
              } finally {
                setSaving(false);
              }
            })();
          },
        },
      ]);
    },
    [discardAppearance, saveAppearance, t],
  );

  useFocusEffect(
    useCallback(() => {
      allowLeaveRef.current = false;
    }, []),
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (allowLeaveRef.current || !appearanceDirty) return;

      event.preventDefault();
      confirmLeaveSettings(() => navigation.dispatch(event.data.action));
    });

    return unsubscribe;
  }, [appearanceDirty, confirmLeaveSettings, navigation]);

  const handleDevTier = async (target: SubscriptionTier) => {
    if (target === tier) return;
    setDevTierSwitching(true);
    try {
      if (target === 'free') {
        await downgradeToFree();
      } else {
        await upgradeToPro('monthly');
      }
    } finally {
      setDevTierSwitching(false);
    }
  };

  const handleDevFreeCartPreview = async (enabled: boolean) => {
    setDevFreeCartPreviewBusy(true);
    try {
      await setDevForceFreeCartPreview(enabled);
      setDevFreeCartPreview(enabled);
    } finally {
      setDevFreeCartPreviewBusy(false);
    }
  };

  const handleDevReset = async () => {
    setDevResetting(true);
    try {
      await AsyncStorage.removeItem('grocery_onboarding_complete');
      const session = await getSession();
      if (session) await signOut();
      router.replace('/onboarding' as never);
    } finally {
      setDevResetting(false);
    }
  };

  const handleDevFamilyPreview = async () => {
    setDevFamilyPreviewBusy(true);
    try {
      if (devFamilyPreview) {
        await disableDevFamilyWorkspacePreview();
        setDevFamilyPreview(false);
      } else {
        const ready = await startDevFamilyWorkspacePreview(router, 'home');
        setDevFamilyPreview(ready);
        if (!ready) {
          promptDevFamilyPreviewSignIn(
            '/settings',
            {
              title: t('devFamilyPreview.routeTitle'),
              message: t('devFamilyPreview.signInRequired'),
              cancel: t('common.cancel'),
              signIn: t('common.signIn'),
            },
            (href) => router.push(href as never)
          );
        }
      }
    } catch (error) {
      Alert.alert(
        t('devFamilyPreview.routeTitle'),
        error instanceof Error ? error.message : t('devFamilyPreview.enableFailed')
      );
    } finally {
      setDevFamilyPreviewBusy(false);
    }
  };

  const handleDevFamilyRole = async (role: DevFamilyRoleOverride) => {
    const next = devFamilyRole === role ? null : role;
    await setDevFamilyRoleOverride(next);
    setDevFamilyRole(next);
    await refreshDevRoleOverride();
  };

  const handleLogout = () =>
    confirmSignOut(async () => {
      await signOutAndNavigate(router);
    }, t);

  const handleShareApp = async () => {
    await shareApp(t);
  };

  const handleSubmitFeedback = async () => {
    const trimmed = feedbackMessage.trim();
    if (!trimmed) {
      setFeedbackNotice(t('settings.feedbackEmpty'));
      return;
    }
    setFeedbackSending(true);
    setFeedbackNotice(null);
    try {
      await submitUserFeedback(trimmed, 'general');
      setFeedbackMessage('');
      setFeedbackNotice(t('settings.feedbackThanks'));
    } catch (error) {
      setFeedbackNotice(error instanceof Error ? error.message : t('settings.feedbackFailed'));
    } finally {
      setFeedbackSending(false);
    }
  };

  const handleChangeEmail = async () => {
    setEmailChangeMessage(null);
    const trimmed = newEmail.trim();
    if (!trimmed) {
      setEmailChangeMessage(t('settings.changeEmailRequired'));
      return;
    }
    setChangingEmail(true);
    try {
      const result = await changeAccountEmail(trimmed);
      setNewEmail('');
      setEmailChangeMessage(
        t('settings.changeEmailPending', { email: result.pendingNewEmail })
      );
    } catch (error) {
      if (error instanceof ChangeEmailError) {
        const errorKey = `settings.changeEmailErrors.${error.code}` as const;
        setEmailChangeMessage(t(errorKey, { defaultValue: t('settings.changeEmailFailed') }));
      } else {
        setEmailChangeMessage(
          error instanceof Error ? error.message : t('settings.changeEmailFailed')
        );
      }
    } finally {
      setChangingEmail(false);
    }
  };

  const pushNotificationPrefs: PushNotificationPrefs = useMemo(
    () => ({
      pushNotificationsEnabled,
      notifyPriceAlerts,
      notifyPriceChangeAlerts,
      notifySaleAlerts,
      notifyCheaperStoreAlerts,
      notifyBudgetAlerts,
      notifyWeeklySummaryAlerts,
      notifyFamilyListAlerts,
      notifyPantryLowAlerts,
      notifyHouseholdReceiptAlerts,
    }),
    [
      pushNotificationsEnabled,
      notifyPriceAlerts,
      notifyPriceChangeAlerts,
      notifySaleAlerts,
      notifyCheaperStoreAlerts,
      notifyBudgetAlerts,
      notifyWeeklySummaryAlerts,
      notifyFamilyListAlerts,
      notifyPantryLowAlerts,
      notifyHouseholdReceiptAlerts,
    ],
  );

  const handlePushNotificationChange = useCallback(
    (patch: Partial<PushNotificationPrefs>) => {
      if (patch.pushNotificationsEnabled !== undefined) {
        setPushNotificationsEnabled(patch.pushNotificationsEnabled);
      }
      if (patch.notifyPriceAlerts !== undefined) setNotifyPriceAlerts(patch.notifyPriceAlerts);
      if (patch.notifyPriceChangeAlerts !== undefined) {
        setNotifyPriceChangeAlerts(patch.notifyPriceChangeAlerts);
      }
      if (patch.notifySaleAlerts !== undefined) setNotifySaleAlerts(patch.notifySaleAlerts);
      if (patch.notifyCheaperStoreAlerts !== undefined) {
        setNotifyCheaperStoreAlerts(patch.notifyCheaperStoreAlerts);
      }
      if (patch.notifyBudgetAlerts !== undefined) setNotifyBudgetAlerts(patch.notifyBudgetAlerts);
      if (patch.notifyWeeklySummaryAlerts !== undefined) {
        setNotifyWeeklySummaryAlerts(patch.notifyWeeklySummaryAlerts);
      }
      if (patch.notifyFamilyListAlerts !== undefined) {
        setNotifyFamilyListAlerts(patch.notifyFamilyListAlerts);
      }
      if (patch.notifyPantryLowAlerts !== undefined) {
        setNotifyPantryLowAlerts(patch.notifyPantryLowAlerts);
      }
      if (patch.notifyHouseholdReceiptAlerts !== undefined) {
        setNotifyHouseholdReceiptAlerts(patch.notifyHouseholdReceiptAlerts);
      }

      void (async () => {
        try {
          await saveSettings(patch);
          await refreshScheduledNotifications();
        } catch (error) {
          console.warn('[settings] notification pref save failed:', error);
        }
      })();
    },
    [saveSettings],
  );

  const handleShowLivePriceEstimatesChange = useCallback(
    (value: boolean) => {
      setShowLivePriceEstimates(value);
      void (async () => {
        try {
          await saveSettings({ showLivePriceEstimates: value });
        } catch (error) {
          console.warn('[settings] live price estimates pref save failed:', error);
        }
      })();
    },
    [saveSettings],
  );

  const appearanceCardStyle = useMemo(
    () => [
      styles.card,
      {
        backgroundColor: fw.card,
        borderColor: fw.border,
        borderWidth: StyleSheet.hairlineWidth,
      },
    ],
    [fw],
  );

  const cardStyle = useMemo(
    () => [
      styles.card,
      {
        backgroundColor: fw.card,
        borderColor: fw.border,
        borderWidth: StyleSheet.hairlineWidth,
      },
    ],
    [fw],
  );

  const menuItemStyle = useMemo(
    () => [
      styles.menuItem,
      {
        backgroundColor: fw.card,
        borderColor: fw.border,
      },
    ],
    [fw],
  );

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      await saveSettings({
        displayName: displayName.trim(),
        pushNotificationsEnabled,
        notifyPriceAlerts,
        notifyPriceChangeAlerts,
        notifySaleAlerts,
        notifyCheaperStoreAlerts,
        notifyBudgetAlerts,
        notifyWeeklySummaryAlerts,
        notifyFamilyListAlerts,
        notifyPantryLowAlerts,
        notifyHouseholdReceiptAlerts,
        showLivePriceEstimates,
      });
      if (appearanceDirty) {
        await saveAppearance();
      }
      await refreshScheduledNotifications();
      await setOpenLastListPreference(openLastList);
      setSaveMessage(t('common.saved'));
    } catch {
      setSaveMessage(t('common.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PremiumScreenBackground style={styles.center}>
        <ActivityIndicator size="large" color={fw.activityColor} />
      </PremiumScreenBackground>
    );
  }

  return (
    <PremiumScreenBackground style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <BackButton showLabel={false} tintColor={theme.text} />
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>{t('settings.title')}</Text>
          {appearanceDirty ? (
            <Text style={styles.unsavedHint}>{t('settings.unsavedChangesHint')}</Text>
          ) : null}
        </View>
        <Pressable onPress={handleSave} disabled={saving} hitSlop={8}>
          <Text
            style={[
              styles.saveLink,
              { color: theme.primary },
              appearanceDirty && [styles.saveLinkActive, { color: theme.primary }],
              saving && styles.saveLinkDisabled,
            ]}>
            {saving ? '...' : saveMessage ?? t('common.save')}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: scrollBottomPadding }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        showsVerticalScrollIndicator={Platform.OS === 'web'}>
        {isAdmin ? (
          <>
            <Text style={styles.sectionTitle}>{t('more.sections.essentials')}</Text>
            <View style={styles.menu}>
              <Pressable
                style={({ pressed }) => [menuItemStyle, pressed && styles.menuItemPressed]}
                onPress={() => router.push('/admin' as never)}
                accessibilityRole="button"
                accessibilityLabel={t('admin.nav.dashboard')}>
                <View style={styles.menuIcon}>
                  <SymbolView
                    name={{ ios: 'shield.lefthalf.filled', android: 'admin_panel_settings', web: 'admin_panel_settings' }}
                    tintColor={fw.primary}
                    size={20}
                  />
                </View>
                <View style={styles.menuText}>
                  <Text style={styles.menuLabel}>{t('admin.nav.dashboard')}</Text>
                  <Text style={styles.menuSub}>{t('admin.nav.dashboardSub')}</Text>
                </View>
                <SymbolView
                  name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                  tintColor={SmartCartColors.textMuted}
                  size={16}
                />
              </Pressable>
            </View>
          </>
        ) : null}

        <Text style={styles.sectionTitle}>{t('settings.profile')}</Text>
        <View style={cardStyle}>
          <Text style={styles.fieldLabel}>{t('settings.displayName')}</Text>
          <Text style={styles.fieldHint}>{t('settings.displayNameHint')}</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder={t('settings.displayNamePlaceholder')}
            placeholderTextColor={SmartCartColors.textMuted}
            autoCapitalize="words"
          />
        </View>

        <Text style={styles.sectionTitle}>{t('settings.account')}</Text>
        <View style={cardStyle}>
          {isSignedIn ? (
            <>
              <Text style={styles.fieldHint}>{t('settings.signedIn')}</Text>
              {accountEmail ? (
                <>
                  <Text style={styles.fieldLabel}>{t('settings.currentEmail')}</Text>
                  <Text style={styles.accountEmail}>{accountEmail}</Text>
                  <View style={styles.divider} />
                  <Text style={styles.fieldLabel}>{t('settings.changeEmail')}</Text>
                  <Text style={styles.fieldHint}>{t('settings.changeEmailHint')}</Text>
                  <TextInput
                    style={styles.input}
                    value={newEmail}
                    onChangeText={setNewEmail}
                    placeholder={t('settings.changeEmailPlaceholder')}
                    placeholderTextColor={SmartCartColors.textMuted}
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    editable={!changingEmail}
                  />
                  <Pressable
                    style={({ pressed }) => [
                      styles.secondaryBtn,
                      pressed && styles.secondaryBtnPressed,
                      changingEmail && styles.secondaryBtnDisabled,
                    ]}
                    onPress={() => void handleChangeEmail()}
                    disabled={changingEmail || !newEmail.trim()}
                    accessibilityRole="button"
                    accessibilityLabel={t('settings.changeEmailSubmit')}
                  >
                    {changingEmail ? (
                      <ActivityIndicator color={fw.primary} />
                    ) : (
                      <Text style={[styles.secondaryBtnText, { color: fw.primary }]}>
                        {t('settings.changeEmailSubmit')}
                      </Text>
                    )}
                  </Pressable>
                  {emailChangeMessage ? (
                    <Text style={styles.emailChangeMessage}>{emailChangeMessage}</Text>
                  ) : null}
                </>
              ) : null}
            </>
          ) : null}
          <Text style={styles.fieldHint}>
            {isGuest ? t('settings.deleteGuestHint') : t('settings.deleteAccountHint')}
          </Text>
          <Pressable
            style={({ pressed }) => [styles.dangerBtn, pressed && styles.dangerBtnPressed]}
            onPress={() => setAccountSheetVisible(true)}
            accessibilityRole="button"
            accessibilityLabel={t('settings.deleteAccount')}
          >
            <Text style={styles.dangerBtnText}>{t('settings.deleteAccount')}</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>{t('settings.household')}</Text>
        <View style={[cardStyle, fw.householdCard]}>
          {hasWorkspace ? (
            <>
              <WorkspaceScopeSwitcher
                scope={activeScope}
                workspaceName={currentWorkspace?.name}
                hasWorkspace={hasWorkspace}
                showBranding
                onScopeChange={(scope) => void setActiveScope(scope)}
                onManageHousehold={() => router.push('/family_plans' as never)}
              />
              <Text style={styles.fieldHint}>{t('settings.householdHint')}</Text>
              {currentWorkspace ? (
                <Text style={styles.membershipStatus}>
                  {t('familyJoin.joinedAs', { name: currentWorkspace.name })}
                  {' · '}
                  {t('familyJoin.joinedCode', { code: currentWorkspace.inviteCode })}
                </Text>
              ) : null}
            </>
          ) : isCurrentMember && currentWorkspace ? (
            <>
              <Text style={styles.fieldLabel}>{t('familyJoin.membershipStatus')}</Text>
              <Text style={styles.membershipStatus}>
                {t('familyJoin.joinedAs', { name: currentWorkspace.name })}
              </Text>
              <Text style={styles.fieldHint}>{t('familyJoin.errors.noSubscription')}</Text>
            </>
          ) : (
            <>
              <Text style={styles.fieldLabel}>{t('familyJoin.title')}</Text>
              <Text style={styles.fieldHint}>{t('familyJoin.settingsHint')}</Text>
              {!isSignedIn ? (
                <>
                  <Text style={styles.fieldHint}>{t('familyJoin.signInRequired')}</Text>
                  <Pressable
                    style={styles.householdUpgradeBtn}
                    onPress={() => router.push('/onboarding/signin' as never)}>
                    <Text style={styles.householdUpgradeBtnText}>{t('familyJoin.signInCta')}</Text>
                  </Pressable>
                </>
              ) : (
                <JoinFamilyCodeForm
                  variant="settings"
                  onSignInRequired={() => router.push('/onboarding/signin' as never)}
                />
              )}
            </>
          )}
          <View style={styles.divider} />
          <Pressable
            style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
            onPress={() => router.push('/family_plans' as never)}>
            <Text style={styles.menuLabel}>{t('settings.householdManage')}</Text>
            <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={16} tintColor={SmartCartColors.textMuted} />
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>{t('settings.appearance')}</Text>
        <View style={appearanceCardStyle}>
          <Text style={styles.fieldLabel}>{t('settings.theme')}</Text>
          <Text style={styles.fieldHint}>{t('settings.themeHint')}</Text>
          <ThemePicker
            themeId={draftThemeId ?? persistedThemeId}
            onThemeSelect={handleDraftThemeSelect}
          />
          <AppearanceSectionReset visible={themeSectionDirty} onPress={resetThemeSection} />
          <View style={styles.divider} />
          <Text style={styles.fieldLabel}>{t('settings.font')}</Text>
          <Text style={styles.fieldHint}>{t('settings.fontHint')}</Text>
          <FontPicker
            fontId={draftFontId ?? persistedFontId}
            onFontSelect={handleDraftFontSelect}
          />
          <AppearanceSectionReset visible={fontSectionDirty} onPress={resetFontSection} />
          <View style={styles.divider} />
          <Text style={styles.fieldLabel}>{t('settings.avatar')}</Text>
          <Text style={styles.fieldHint}>{t('settings.avatarHint')}</Text>
          <AvatarPicker
            avatarId={draftAvatarId ?? persistedAvatarId}
            onAvatarSelect={handleDraftAvatarSelect}
          />
          <AppearanceSectionReset visible={avatarSectionDirty} onPress={resetAvatarSection} />
          <View style={styles.divider} />
          <Text style={styles.fieldLabel}>{t('common.language')}</Text>
          <Text style={styles.fieldHint}>{t('settings.languageHint')}</Text>
          <LanguagePicker
            locale={draftLocale ?? (i18n.language === 'es' ? 'es' : 'en')}
            onLocaleChange={handleDraftLocaleSelect}
          />
          <AppearanceSectionReset visible={localeSectionDirty} onPress={resetLocaleSection} />
        </View>

        <Text style={styles.sectionTitle}>{t('settings.pushNotificationsSection')}</Text>
        <PushNotificationSettings
          values={pushNotificationPrefs}
          onChange={handlePushNotificationChange}
          cardStyle={cardStyle}
          showDevTests={false}
        />

        <Text style={styles.sectionTitle}>{t('settings.listBehavior')}</Text>
        <View style={cardStyle}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>{t('settings.openLastList')}</Text>
              <Text style={styles.toggleHint}>{t('settings.openLastListHint')}</Text>
            </View>
            <Switch
              value={openLastList}
              onValueChange={setOpenLastList}
              trackColor={{ false: SmartCartColors.border, true: SmartCartColors.primaryMuted }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t('settings.livePriceEstimatesSection')}</Text>
        <View style={cardStyle}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>{t('settings.livePriceEstimates')}</Text>
              <Text style={styles.toggleHint}>{t('settings.livePriceEstimatesHint')}</Text>
            </View>
            <Switch
              value={showLivePriceEstimates}
              onValueChange={handleShowLivePriceEstimatesChange}
              trackColor={{ false: SmartCartColors.border, true: SmartCartColors.primaryMuted }}
              thumbColor="#fff"
              accessibilityLabel={t('settings.livePriceEstimates')}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t('settings.scanning')}</Text>
        <View style={cardStyle}>
          <Text style={styles.infoText}>{t('settings.scanningInfo')}</Text>
        </View>

        <Text style={styles.sectionTitle}>{t('settings.feedback')}</Text>
        <View style={cardStyle}>
          <Text style={styles.fieldHint}>{t('settings.feedbackHint')}</Text>
          <TextInput
            value={feedbackMessage}
            onChangeText={setFeedbackMessage}
            placeholder={t('settings.feedbackPlaceholder')}
            placeholderTextColor={SmartCartColors.textMuted}
            style={styles.feedbackInput}
            multiline
            editable={!feedbackSending}
          />
          <Pressable
            style={[styles.feedbackBtn, { backgroundColor: fw.primary }, feedbackSending && styles.feedbackBtnDisabled]}
            onPress={() => void handleSubmitFeedback()}
            disabled={feedbackSending}
            accessibilityRole="button"
            accessibilityLabel={t('settings.feedbackSend')}>
            <Text style={styles.feedbackBtnText}>
              {feedbackSending ? t('settings.feedbackSending') : t('settings.feedbackSend')}
            </Text>
          </Pressable>
          {feedbackNotice ? <Text style={styles.feedbackNotice}>{feedbackNotice}</Text> : null}
        </View>

        {__DEV__ && (
          <>
            <Text style={styles.sectionTitle}>{t('settings.developer')}</Text>
            <View style={cardStyle}>
              <Text style={styles.fieldLabel}>{t('settings.devTier')}</Text>
              <Text style={styles.fieldHint}>
                {t('settings.devCurrent', {
                  tier: tier === 'free' ? t('common.free') : t('common.pro'),
                  trial: subscriptionSource === 'trial' ? t('settings.devTrial') : '',
                })}
              </Text>
              <View style={styles.tierToggle}>
                {(['free', 'pro'] as const).map((option) => (
                  <Pressable
                    key={option}
                    style={[styles.tierBtn, tier === option && styles.tierBtnActive]}
                    onPress={() => handleDevTier(option)}
                    disabled={devTierSwitching}
                    accessibilityRole="button"
                    accessibilityLabel={`Set ${option === 'free' ? t('common.free') : t('common.pro')}`}
                  >
                    <Text style={[styles.tierBtnText, tier === option && styles.tierBtnTextActive]}>
                      {option === 'free' ? t('common.free') : t('common.pro')}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.divider} />
              <Text style={styles.fieldLabel}>{t('settings.devFreeCartPreview')}</Text>
              <Text style={styles.fieldHint}>
                {isAdmin
                  ? t('settings.devFreeCartPreviewAdminHint')
                  : t('settings.devFreeCartPreviewHint')}
              </Text>
              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleLabel}>{t('settings.devFreeCartPreviewToggle')}</Text>
                </View>
                <Switch
                  value={devFreeCartPreview}
                  onValueChange={(value) => void handleDevFreeCartPreview(value)}
                  disabled={devFreeCartPreviewBusy}
                  trackColor={{ false: SmartCartColors.border, true: SmartCartColors.primaryMuted }}
                  thumbColor="#fff"
                  accessibilityLabel={t('settings.devFreeCartPreviewToggle')}
                />
              </View>
              {devFreeCartPreview || (isAdmin && tier === 'free') ? (
                <Text style={styles.fieldHint}>{t('settings.devFreeCartPreviewOn')}</Text>
              ) : null}
              <View style={styles.divider} />
              <Text style={styles.fieldLabel}>{t('settings.devFamilyPreview')}</Text>
              <Text style={styles.fieldHint}>{t('settings.devFamilyPreviewHint')}</Text>
              <Pressable
                style={[styles.devFamilyPreviewBtn, devFamilyPreview && styles.devFamilyPreviewBtnActive]}
                onPress={() => void handleDevFamilyPreview()}
                disabled={devFamilyPreviewBusy}
                accessibilityRole="button"
                accessibilityLabel={
                  devFamilyPreview ? t('settings.devFamilyPreviewDisable') : t('settings.devFamilyPreviewOff')
                }>
                <Text
                  style={[
                    styles.devFamilyPreviewBtnText,
                    devFamilyPreview && styles.devFamilyPreviewBtnTextActive,
                  ]}>
                  {devFamilyPreviewBusy
                    ? '…'
                    : devFamilyPreview
                      ? t('settings.devFamilyPreviewDisable')
                      : t('settings.devFamilyPreviewOff')}
                </Text>
              </Pressable>
              {devFamilyPreview ? (
                <>
                  <Text style={styles.fieldHint}>{t('settings.devFamilyPreviewOn')}</Text>
                  <View style={styles.divider} />
                  <Text style={styles.fieldLabel}>{t('settings.devFamilyRole')}</Text>
                  <Text style={styles.fieldHint}>{t('settings.devFamilyRoleHint')}</Text>
                  <View style={styles.tierToggle}>
                    {(['owner', 'member'] as const).map((role) => (
                      <Pressable
                        key={role}
                        style={[
                          styles.tierBtn,
                          (devFamilyRole === role || (devFamilyRole === null && role === 'owner')) &&
                            styles.tierBtnActive,
                        ]}
                        onPress={() => void handleDevFamilyRole(role)}
                        accessibilityRole="button"
                        accessibilityLabel={
                          role === 'owner'
                            ? t('settings.devFamilyRoleOwner')
                            : t('settings.devFamilyRoleMember')
                        }>
                        <Text
                          style={[
                            styles.tierBtnText,
                            (devFamilyRole === role ||
                              (devFamilyRole === null && role === 'owner')) &&
                              styles.tierBtnTextActive,
                          ]}>
                          {role === 'owner'
                            ? t('settings.devFamilyRoleOwner')
                            : t('settings.devFamilyRoleMember')}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              ) : null}
              <View style={styles.divider} />
              <Pressable
                onPress={handleDevReset}
                disabled={devResetting}
                accessibilityRole="button"
                accessibilityLabel="Reset onboarding"
              >
                <Text style={styles.devResetText}>
                  {devResetting ? '…' : t('settings.devReset')}
                </Text>
              </Pressable>
            </View>
          </>
        )}

        <Text style={styles.sectionTitle}>{t('privacy.settingsTitle')}</Text>
        <View style={styles.menu}>
          <Pressable
            style={({ pressed }) => [menuItemStyle, pressed && styles.menuItemPressed]}
            onPress={() => router.push('/settings/privacy')}
            accessibilityRole="link"
            accessibilityLabel={t('privacy.settingsTitle')}
          >
            <View style={styles.menuIcon}>
              <SymbolView
                name={{ ios: 'hand.raised.fill', android: 'privacy_tip', web: 'privacy_tip' }}
                tintColor={fw.primary}
                size={20}
              />
            </View>
            <View style={styles.menuText}>
              <Text style={styles.menuLabel}>{t('privacy.settingsTitle')}</Text>
              <Text style={styles.menuSub}>{t('privacy.settingsSub')}</Text>
            </View>
            <SymbolView
              name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
              tintColor={SmartCartColors.textMuted}
              size={16}
            />
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>{t('settings.legal')}</Text>
        <View style={styles.menu}>
          <Pressable
            style={({ pressed }) => [menuItemStyle, pressed && styles.menuItemPressed]}
            onPress={() => router.push('/privacy')}
            accessibilityRole="link"
            accessibilityLabel={t('privacy.legal.privacyPolicy')}
          >
            <View style={styles.menuIcon}>
              <SymbolView
                name={{ ios: 'hand.raised.fill', android: 'privacy_tip', web: 'privacy_tip' }}
                tintColor={fw.primary}
                size={20}
              />
            </View>
            <View style={styles.menuText}>
              <Text style={styles.menuLabel}>{t('privacy.legal.privacyPolicy')}</Text>
              <Text style={styles.menuSub}>{t('settings.legalPrivacySub')}</Text>
            </View>
            <SymbolView
              name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
              tintColor={SmartCartColors.textMuted}
              size={16}
            />
          </Pressable>
          <Pressable
            style={({ pressed }) => [menuItemStyle, pressed && styles.menuItemPressed]}
            onPress={() => router.push('/data-retention')}
            accessibilityRole="link"
            accessibilityLabel={t('privacy.legal.dataRetention')}
          >
            <View style={styles.menuIcon}>
              <SymbolView
                name={{ ios: 'clock.arrow.circlepath', android: 'history', web: 'history' }}
                tintColor={fw.primary}
                size={20}
              />
            </View>
            <View style={styles.menuText}>
              <Text style={styles.menuLabel}>{t('privacy.legal.dataRetention')}</Text>
              <Text style={styles.menuSub}>{t('settings.legalDataRetentionSub')}</Text>
            </View>
            <SymbolView
              name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
              tintColor={SmartCartColors.textMuted}
              size={16}
            />
          </Pressable>
          <Pressable
            style={({ pressed }) => [menuItemStyle, pressed && styles.menuItemPressed]}
            onPress={() => router.push('/cookies')}
            accessibilityRole="link"
            accessibilityLabel={t('privacy.legal.cookies')}
          >
            <View style={styles.menuIcon}>
              <SymbolView
                name={{ ios: 'globe', android: 'language', web: 'language' }}
                tintColor={fw.primary}
                size={20}
              />
            </View>
            <View style={styles.menuText}>
              <Text style={styles.menuLabel}>{t('privacy.legal.cookies')}</Text>
              <Text style={styles.menuSub}>{t('settings.legalCookiesSub')}</Text>
            </View>
            <SymbolView
              name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
              tintColor={SmartCartColors.textMuted}
              size={16}
            />
          </Pressable>
          <Pressable
            style={({ pressed }) => [menuItemStyle, pressed && styles.menuItemPressed]}
            onPress={() => router.push('/terms')}
            accessibilityRole="link"
            accessibilityLabel={t('privacy.legal.terms')}
          >
            <View style={styles.menuIcon}>
              <SymbolView
                name={{ ios: 'doc.text.fill', android: 'description', web: 'description' }}
                tintColor={fw.primary}
                size={20}
              />
            </View>
            <View style={styles.menuText}>
              <Text style={styles.menuLabel}>{t('privacy.legal.terms')}</Text>
              <Text style={styles.menuSub}>{t('settings.legalTermsSub')}</Text>
            </View>
            <SymbolView
              name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
              tintColor={SmartCartColors.textMuted}
              size={16}
            />
          </Pressable>
          <Pressable
            style={({ pressed }) => [menuItemStyle, pressed && styles.menuItemPressed]}
            onPress={() => router.push('/copyright')}
            accessibilityRole="link"
            accessibilityLabel={t('settings.legalCopyright')}
          >
            <View style={styles.menuIcon}>
              <SymbolView
                name={{ ios: 'c.circle.fill', android: 'copyright', web: 'copyright' }}
                tintColor={fw.primary}
                size={20}
              />
            </View>
            <View style={styles.menuText}>
              <Text style={styles.menuLabel}>{t('settings.legalCopyright')}</Text>
              <Text style={styles.menuSub}>{t('settings.legalCopyrightSub')}</Text>
            </View>
            <SymbolView
              name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
              tintColor={SmartCartColors.textMuted}
              size={16}
            />
          </Pressable>
          <Pressable
            style={({ pressed }) => [menuItemStyle, pressed && styles.menuItemPressed]}
            onPress={() => router.push('/privacy-request')}
            accessibilityRole="link"
            accessibilityLabel={t('privacy.legal.privacyRequests')}
          >
            <View style={styles.menuIcon}>
              <SymbolView
                name={{ ios: 'envelope.fill', android: 'mail', web: 'mail' }}
                tintColor={fw.primary}
                size={20}
              />
            </View>
            <View style={styles.menuText}>
              <Text style={styles.menuLabel}>{t('privacy.legal.privacyRequests')}</Text>
              <Text style={styles.menuSub}>{t('settings.legalPrivacyRequestsSub')}</Text>
            </View>
            <SymbolView
              name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
              tintColor={SmartCartColors.textMuted}
              size={16}
            />
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>{t('settings.preferences')}</Text>
        <View style={styles.menu}>
          <Pressable
            style={({ pressed }) => [menuItemStyle, pressed && styles.menuItemPressed]}
            onPress={() => void handleShareApp()}
            accessibilityRole="button"
            accessibilityLabel={t('settings.shareApp')}
          >
            <View style={styles.menuIcon}>
              <SymbolView
                name={{ ios: 'square.and.arrow.up', android: 'share', web: 'share' }}
                tintColor={fw.primary}
                size={20}
              />
            </View>
            <View style={styles.menuText}>
              <Text style={styles.menuLabel}>{t('settings.shareApp')}</Text>
              <Text style={styles.menuSub}>{t('settings.shareAppSub')}</Text>
            </View>
            <SymbolView
              name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
              tintColor={SmartCartColors.textMuted}
              size={16}
            />
          </Pressable>
          {MENU_ITEMS.map((item) => (
            <Pressable
              key={item.labelKey}
              style={({ pressed }) => [menuItemStyle, pressed && styles.menuItemPressed]}
              onPress={() => router.push(item.route as never)}>
              <View style={styles.menuIcon}>
                <SymbolView name={item.icon} tintColor={fw.primary} size={20} />
              </View>
              <View style={styles.menuText}>
                <Text style={styles.menuLabel}>{t(item.labelKey)}</Text>
                <Text style={styles.menuSub}>{t(item.subtitleKey)}</Text>
              </View>
              <SymbolView
                name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                tintColor={SmartCartColors.textMuted}
                size={16}
              />
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View
        style={[
          styles.stickyFooter,
          fw.footer,
          { paddingBottom: footerBottomPadding, borderTopColor: fw.border },
        ]}>
        {isSignedIn ? (
          <Pressable
            style={({ pressed }) => [
              styles.footerLogoutBtn,
              { borderColor: fw.border },
              pressed && styles.footerLogoutBtnPressed,
            ]}
            onPress={handleLogout}
            accessibilityRole="button"
            accessibilityLabel={t('settings.logout')}>
            <SymbolView
              name={{
                ios: 'rectangle.portrait.and.arrow.right',
                android: 'logout',
                web: 'logout',
              }}
              tintColor={SmartCartColors.danger}
              size={18}
            />
            <Text style={styles.footerLogoutText}>{t('settings.logout')}</Text>
          </Pressable>
        ) : (
          <Pressable
            style={({ pressed }) => [
              styles.footerSignInBtn,
              { backgroundColor: fw.primary },
              pressed && styles.footerSignInBtnPressed,
            ]}
            onPress={() => router.push('/onboarding/signin' as never)}
            accessibilityRole="button"
            accessibilityLabel={t('common.signIn')}>
            <Text style={styles.footerSignInText}>{t('common.signIn')}</Text>
          </Pressable>
        )}
      </View>

      <DeleteAccountSheet
        visible={accountSheetVisible}
        onClose={() => setAccountSheetVisible(false)}
      />
      </KeyboardAvoidingView>
    </PremiumScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  headerTitleWrap: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center', color: SmartCartColors.text },
  saveLink: { fontSize: 16, fontWeight: '700', color: SmartCartColors.primary, minWidth: 72, textAlign: 'right' },
  saveLinkActive: { color: SmartCartColors.primaryDark },
  saveLinkDisabled: { opacity: 0.5 },
  unsavedHint: { fontSize: 11, fontWeight: '600', color: SmartCartColors.primary, marginTop: 2 },
  scroll: { flex: 1 },
  content: { padding: 16, flexGrow: 1 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: SmartCartColors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 12,
  },
  card: {
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.md,
    padding: 16,
    marginBottom: 20,
    ...SmartCartShadow.card,
  },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: SmartCartColors.text },
  fieldHint: { fontSize: 12, color: SmartCartColors.textSecondary, marginTop: 2, marginBottom: 10 },
  membershipStatus: { fontSize: 13, color: SmartCartColors.text, marginBottom: 8, lineHeight: 18 },
  input: {
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    borderRadius: SmartCartRadius.sm,
    padding: 12,
    fontSize: 16,
    backgroundColor: SmartCartColors.background,
    color: SmartCartColors.text,
  },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  toggleInfo: { flex: 1 },
  toggleLabel: { fontSize: 15, fontWeight: '600', color: SmartCartColors.text },
  toggleHint: { fontSize: 12, color: SmartCartColors.textSecondary, marginTop: 2 },
  toggleNote: { fontSize: 12, color: SmartCartColors.danger, marginTop: 6, lineHeight: 17 },
  infoText: { fontSize: 14, color: SmartCartColors.textSecondary, lineHeight: 20 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: SmartCartColors.border, marginVertical: 14 },
  menu: { gap: 10 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.md,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    ...SmartCartShadow.cardSoft,
  },
  menuItemPressed: { backgroundColor: SmartCartColors.badge, borderColor: SmartCartColors.primary },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${SmartCartColors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: '700', color: SmartCartColors.text },
  menuSub: { fontSize: 12, color: SmartCartColors.textSecondary, marginTop: 2 },
  devResetText: { fontSize: 13, color: SmartCartColors.textMuted, textAlign: 'center', paddingVertical: 4 },
  tierToggle: {
    flexDirection: 'row',
    backgroundColor: SmartCartColors.background,
    borderRadius: SmartCartRadius.sm,
    padding: 4,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
  },
  tierBtn: { flex: 1, paddingVertical: 8, borderRadius: SmartCartRadius.sm - 2, alignItems: 'center' },
  tierBtnActive: { backgroundColor: SmartCartColors.primary },
  tierBtnText: { fontSize: 13, fontWeight: '600', color: SmartCartColors.textSecondary },
  tierBtnTextActive: { color: '#fff' },
  householdUpgradeBtn: {
    marginTop: 4,
    marginBottom: 8,
    paddingVertical: 12,
    borderRadius: SmartCartRadius.pill,
    backgroundColor: '#16A34A',
    alignItems: 'center',
  },
  householdUpgradeBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  devFamilyPreviewBtn: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: SmartCartRadius.sm,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    alignItems: 'center',
    backgroundColor: SmartCartColors.background,
  },
  devFamilyPreviewBtnActive: {
    borderColor: '#16A34A',
    backgroundColor: 'rgba(22,163,74,0.12)',
  },
  devFamilyPreviewBtnText: { fontSize: 14, fontWeight: '700', color: SmartCartColors.text },
  devFamilyPreviewBtnTextActive: { color: '#16A34A' },
  dangerBtn: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: SmartCartRadius.sm,
    borderWidth: 1,
    borderColor: SmartCartColors.danger,
    alignItems: 'center',
  },
  dangerBtnPressed: { backgroundColor: `${SmartCartColors.danger}12` },
  dangerBtnText: { fontSize: 15, fontWeight: '700', color: SmartCartColors.danger },
  stickyFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  footerLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: SmartCartRadius.md,
    borderWidth: 1,
    backgroundColor: SmartCartColors.card,
  },
  footerLogoutBtnPressed: { backgroundColor: `${SmartCartColors.danger}10` },
  footerLogoutText: { fontSize: 16, fontWeight: '700', color: SmartCartColors.danger },
  footerSignInBtn: {
    paddingVertical: 14,
    borderRadius: SmartCartRadius.md,
    alignItems: 'center',
  },
  footerSignInBtnPressed: { opacity: 0.9 },
  footerSignInText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  accountEmail: { fontSize: 15, color: SmartCartColors.text, marginBottom: 4 },
  secondaryBtn: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: SmartCartRadius.sm,
    borderWidth: 1,
    borderColor: SmartCartColors.primary,
    alignItems: 'center',
  },
  secondaryBtnPressed: { backgroundColor: `${SmartCartColors.primary}12` },
  secondaryBtnDisabled: { opacity: 0.5 },
  secondaryBtnText: { fontSize: 15, fontWeight: '700', color: SmartCartColors.primary },
  emailChangeMessage: {
    marginTop: 10,
    fontSize: 13,
    color: SmartCartColors.textSecondary,
    lineHeight: 18,
  },
  feedbackInput: {
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    borderRadius: SmartCartRadius.sm,
    padding: 12,
    fontSize: 15,
    backgroundColor: SmartCartColors.background,
    color: SmartCartColors.text,
    minHeight: 96,
    textAlignVertical: 'top',
  },
  feedbackBtn: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: SmartCartRadius.sm,
    alignItems: 'center',
  },
  feedbackBtnDisabled: { opacity: 0.6 },
  feedbackBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  feedbackNotice: {
    marginTop: 10,
    fontSize: 13,
    color: SmartCartColors.textSecondary,
    lineHeight: 18,
  },
});
