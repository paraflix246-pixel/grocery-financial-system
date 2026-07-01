import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import { BackButton } from '@/src/components/BackButton';
import { useFeatureGate } from '@/src/hooks/useFeatureGate';
import { useDevFamilyPreview } from '@/src/hooks/useDevFamilyPreview';
import { buildPaywallHref } from '@/src/utils/paywallRoutes';
import { startDevFamilyWorkspacePreview } from '@/src/services/devFamilyWorkspacePreview';
import { promptDevFamilyPreviewSignIn } from '@/src/utils/devFamilyPreviewAuth';
import {
  buildFamilyInviteUrl,
  getOrCreateFamilyCode,
  parseFamilyInviteInput,
} from '@/src/services/familyCodeService';
import { parseFamilyListSnapshot } from '@/src/services/familyListSnapshot';
import { importFamilyListSnapshot } from '@/src/services/familyImportService';
import {
  buildListSnapshot,
  ensureFamilyGroup,
  flushFamilySyncQueue,
  getFamilySyncQueue,
  getLastFamilyExportTimestamp,
  isFamilySyncAvailable,
  joinFamilyGroupByCode,
  shareListToFamily,
  startFamilyRealtimeSync,
} from '@/src/services/familySyncService';
import { getActiveList, getAllLists } from '@/src/services/storageService';
import type { FamilyListSnapshot } from '@/src/services/familyListSnapshot';
import { useListStore } from '@/src/store/useListStore';
import { useWorkspaceStore } from '@/src/store/useWorkspaceStore';
import {
  buildHouseholdInviteMailto,
  isValidInviteEmail,
} from '@/src/services/workspaceInviteService';
import { SmartCartRadius } from '@/src/theme/smartCart';
import { FamilyWorkspaceTheme } from '@/src/theme/familyWorkspaceTheme';
import { copyText, shareText } from '@/src/utils/copyOrShare';
import { showInfoAlert } from '@/src/utils/platformAlert';
import { getScreenBottomPadding } from '@/src/utils/safeAreaLayout';

const BG = '#0F0F0F';
const GREEN = '#22C55E';
const GOLD = '#EAB308';
const FAMILY = FamilyWorkspaceTheme.accent;
const FAMILY_DARK = FamilyWorkspaceTheme.accentDark;
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_MUTED = 'rgba(255,255,255,0.55)';
const TEXT_DIM = 'rgba(255,255,255,0.38)';
const CARD_BG = 'rgba(255,255,255,0.05)';
const CARD_BORDER = 'rgba(255,255,255,0.1)';

type StepIconName = {
  ios: 'person.2.fill' | 'square.and.arrow.up.fill' | 'iphone.and.arrow.forward' | 'arrow.triangle.2.circlepath';
  android: 'group' | 'share' | 'phone_android' | 'sync';
  web: 'group' | 'share' | 'phone_android' | 'sync';
};

const SHARE_STEP_KEYS = ['step1', 'step2', 'step3'] as const;

const SHARE_STEP_ICONS: ReadonlyArray<StepIconName> = [
  { ios: 'person.2.fill', android: 'group', web: 'group' },
  { ios: 'square.and.arrow.up.fill', android: 'share', web: 'share' },
  { ios: 'iphone.and.arrow.forward', android: 'phone_android', web: 'phone_android' },
];

const SYNC_STEP_ICON: StepIconName = {
  ios: 'arrow.triangle.2.circlepath',
  android: 'sync',
  web: 'sync',
};

type TierBadgeProps = {
  label: string;
  accent: string;
  accentBg: string;
  accentBorder: string;
};

function TierBadge({ label, accent, accentBg, accentBorder }: TierBadgeProps) {
  return (
    <View style={[styles.tierBadge, { backgroundColor: accentBg, borderColor: accentBorder }]}>
      <Text style={[styles.tierBadgeText, { color: accent }]}>{label}</Text>
    </View>
  );
}

type StepRowProps = {
  step: number;
  title: string;
  body: string;
  icon: StepIconName;
  accent: string;
  locked?: boolean;
};

function StepRow({ step, title, body, icon, accent, locked }: StepRowProps) {
  return (
    <View style={[styles.stepRow, locked && styles.stepRowLocked]}>
      <View style={[styles.stepNumber, { borderColor: `${accent}55`, backgroundColor: `${accent}18` }]}>
        <Text style={[styles.stepNumberText, { color: accent }]}>{step}</Text>
      </View>
      <View style={styles.stepContent}>
        <View style={styles.stepTitleRow}>
          <SymbolView
            name={icon}
            tintColor={locked ? TEXT_DIM : accent}
            size={18}
          />
          <Text style={[styles.stepTitle, locked && styles.stepTitleLocked]}>{title}</Text>
        </View>
        <Text style={[styles.stepBody, locked && styles.stepBodyLocked]}>{body}</Text>
      </View>
    </View>
  );
}

export default function FamilyPlansScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const { unlocked, requestAccess } = useFeatureGate('family_plans');
  const { unlocked: syncUnlocked, requestAccess: requestSyncAccess } = useFeatureGate('multi_user_sync');
  const { active: devPreviewActive } = useDevFamilyPreview();
  const hasLiveSync = syncUnlocked;
  const [devPreviewBusy, setDevPreviewBusy] = useState(false);

  const [familyCode, setFamilyCode] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [importText, setImportText] = useState('');
  const [lastExportAt, setLastExportAt] = useState<string | null>(null);
  const [syncQueueSize, setSyncQueueSize] = useState(0);

  const locale = i18n.language.startsWith('es') ? 'es' : 'en';
  const formatDateTime = (iso: string) => new Date(iso).toLocaleString(locale);

  const shareSteps = useMemo(
    () =>
      SHARE_STEP_KEYS.map((key, index) => ({
        key,
        title: t(`familyPlans.steps.${key}.title`),
        body: t(`familyPlans.steps.${key}.body`),
        icon: SHARE_STEP_ICONS[index],
      })),
    [t]
  );

  const loadCode = useCallback(async () => {
    const code = await getOrCreateFamilyCode();
    setFamilyCode(code);
    if (unlocked) {
      try {
        await ensureFamilyGroup();
        if (syncUnlocked) await startFamilyRealtimeSync();
      } catch (error) {
        console.warn('[family_plans] ensureFamilyGroup failed:', error);
      }
    }
    setLastExportAt(await getLastFamilyExportTimestamp());
    setSyncQueueSize((await getFamilySyncQueue()).length);
  }, [unlocked, syncUnlocked]);

  useEffect(() => {
    loadCode();
  }, [loadCode]);

  const handleExportList = async () => {
    if (!requestAccess()) return;
    const lists = await getAllLists();
    const active = lists.find((l) => l.isActive) ?? lists[0];
    if (!active) {
      showInfoAlert(
        t('familyPlans.alerts.noLists.title'),
        t('familyPlans.alerts.noLists.message')
      );
      return;
    }
    try {
      let snapshot;
      let inviteUrl: string;
      let synced = false;

      try {
        const result = await shareListToFamily(active.id);
        snapshot = result.snapshot;
        inviteUrl = result.inviteUrl;
        synced = result.synced;
      } catch (syncError) {
        console.warn('[family_plans] supabase sync unavailable, falling back to clipboard:', syncError);
        const code = familyCode || (await getOrCreateFamilyCode());
        const localSnapshot = await buildListSnapshot(active.id, code);
        if (!localSnapshot) {
          showInfoAlert(
            t('familyPlans.alerts.shareFailed.title'),
            t('familyPlans.alerts.shareFailed.buildMessage')
          );
          return;
        }
        snapshot = localSnapshot;
        inviteUrl = buildFamilyInviteUrl(code);
      }

      const payload = JSON.stringify(snapshot, null, 2);
      const shareMessage = `${inviteUrl}\n\n${payload}`;
      await shareText(shareMessage, t('familyPlans.alerts.shareSubject', { listName: snapshot.listName }), {
        successTitle: t('familyPlans.alerts.shareSuccess.title'),
        successMessage: synced
          ? t('familyPlans.alerts.shareSuccess.syncedMessage')
          : isFamilySyncAvailable()
            ? t('familyPlans.alerts.shareSuccess.upgradeMessage')
            : t('familyPlans.alerts.shareSuccess.supabaseMessage'),
      });
      setLastExportAt(snapshot.exportedAt ?? null);
      setSyncQueueSize((await getFamilySyncQueue()).length);
    } catch {
      showInfoAlert(
        t('familyPlans.alerts.shareFailed.title'),
        t('familyPlans.alerts.shareFailed.genericMessage')
      );
    }
  };

  const runImport = async (snapshot: FamilyListSnapshot, mode: 'merge' | 'new') => {
    try {
      const active = await getActiveList();
      const result =
        mode === 'merge' && active
          ? await importFamilyListSnapshot(snapshot, { mergeIntoListId: active.id })
          : await importFamilyListSnapshot(snapshot, { createNew: true });
      await useListStore.getState().loadLists();
      await useListStore.getState().loadListItems(result.listId);
      setImportText('');
      const skippedPart = result.skipped
        ? t('familyPlans.alerts.listAdded.skipped', { count: result.skipped })
        : '';
      Alert.alert(
        t('familyPlans.alerts.listAdded.title'),
        t('familyPlans.alerts.listAdded.message', {
          added: result.added,
          items: t('common.items', { count: result.added }),
          skipped: skippedPart,
        })
      );
      router.push(`/list/${result.listId}`);
    } catch (error) {
      Alert.alert(
        t('familyPlans.alerts.importFailed.title'),
        error instanceof Error ? error.message : t('familyPlans.alerts.importFailed.genericMessage')
      );
    }
  };

  const handleImport = async () => {
    if (!requestAccess()) return;
    const parsed = parseFamilyInviteInput(importText);
    if (!parsed) {
      Alert.alert(
        t('familyPlans.alerts.couldNotReadInvite.title'),
        t('familyPlans.alerts.couldNotReadInvite.message')
      );
      return;
    }

    if (parsed.type === 'code') {
      try {
        const result = await joinFamilyGroupByCode(parsed.code);
        setFamilyCode(result.code);
        await useWorkspaceStore.getState().loadWorkspaces();
        if (syncUnlocked) await startFamilyRealtimeSync();
        setImportText('');
        Alert.alert(
          t('familyPlans.alerts.joinedFamily.title'),
          t('familyPlans.alerts.joinedFamily.message', { code: result.code })
        );
      } catch (error) {
        Alert.alert(
          t('familyPlans.alerts.joinFailed.title'),
          error instanceof Error ? error.message : t('familyPlans.alerts.joinFailed.genericMessage')
        );
      }
      return;
    }

    try {
      const snapshot = parseFamilyListSnapshot(parsed.raw);
      Alert.alert(
        t('familyPlans.alerts.addSharedList.title'),
        t('familyPlans.alerts.addSharedList.message', {
          listName: snapshot.listName ?? t('familyPlans.sharedListFallback'),
          count: snapshot.items.length,
        }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('familyPlans.alerts.mergeIntoList'), onPress: () => void runImport(snapshot, 'merge') },
          { text: t('familyPlans.alerts.createNewList'), onPress: () => void runImport(snapshot, 'new') },
        ]
      );
    } catch (error) {
      Alert.alert(
        t('familyPlans.alerts.couldNotReadInvite.title'),
        error instanceof Error
          ? error.message
          : t('familyPlans.alerts.couldNotReadInvite.fallbackMessage')
      );
    }
  };

  const handleFlushSync = async () => {
    if (!requestSyncAccess()) return;
    const flushed = await flushFamilySyncQueue();
    setSyncQueueSize((await getFamilySyncQueue()).length);
    Alert.alert(
      t('familyPlans.alerts.syncComplete.title'),
      flushed > 0
        ? t('familyPlans.alerts.syncComplete.updated', { count: flushed })
        : t('familyPlans.alerts.syncComplete.upToDate')
    );
  };

  const handleCopyCode = async () => {
    if (!requestAccess()) return;
    if (!familyCode) return;
    const inviteUrl = buildFamilyInviteUrl(familyCode);
    const message = t('familyPlans.alerts.inviteMessage', { code: familyCode, url: inviteUrl });
    await copyText(message, {
      title: t('familyPlans.alerts.inviteCopied.title'),
      message: t('familyPlans.alerts.inviteCopied.message'),
    });
  };

  const handleCopyInviteLink = async () => {
    if (!requestAccess()) return;
    if (!familyCode) return;
    const inviteUrl = buildFamilyInviteUrl(familyCode);
    await copyText(inviteUrl, {
      title: t('familyPlans.alerts.inviteCopied.title'),
      message: t('familyPlans.alerts.inviteCopied.message'),
    });
  };

  const handleEmailInvite = async () => {
    if (!requestAccess()) return;
    if (!familyCode) return;
    if (!isValidInviteEmail(inviteEmail)) {
      Alert.alert(t('familyPlans.emailInvite.title'), t('familyPlans.emailInvite.invalidEmail'));
      return;
    }
    const inviteUrl = buildFamilyInviteUrl(familyCode);
    const mailto = buildHouseholdInviteMailto({
      email: inviteEmail,
      subject: t('familyPlans.emailInvite.subject'),
      code: familyCode,
      inviteUrl,
      bodyTemplate: t('familyPlans.alerts.inviteMessage', { code: familyCode, url: inviteUrl }),
    });
    const opened = await Linking.openURL(mailto);
    if (!opened) {
      await copyText(inviteUrl, {
        title: t('familyPlans.alerts.inviteCopied.title'),
        message: t('familyPlans.alerts.inviteCopied.message'),
      });
    }
  };

  const handleDevPreview = async () => {
    setDevPreviewBusy(true);
    try {
      const ready = await startDevFamilyWorkspacePreview(router, 'family_plans');
      if (!ready) {
        promptDevFamilyPreviewSignIn(
          '/family_plans',
          {
            title: t('devFamilyPreview.routeTitle'),
            message: t('devFamilyPreview.signInRequired'),
            cancel: t('common.cancel'),
            signIn: t('common.signIn'),
          },
          (href) => router.push(href as never)
        );
      }
    } catch (error) {
      Alert.alert(
        t('devFamilyPreview.routeTitle'),
        error instanceof Error ? error.message : t('devFamilyPreview.enableFailed')
      );
    } finally {
      setDevPreviewBusy(false);
    }
  };

  const heroAccent = hasLiveSync ? FAMILY_DARK : unlocked ? FAMILY : TEXT_MUTED;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: false,
          contentStyle: { backgroundColor: BG, overflow: 'visible' },
        }}
      />

      <View style={[styles.pageHeader, { paddingTop: insets.top + 8 }]}>
        <BackButton showLabel={false} tintColor={TEXT_PRIMARY} />
        <View style={styles.pageTitleWrap}>
          <Text style={styles.pageTitle}>{t('familyPlans.title')}</Text>
        </View>
        <View style={styles.pageHeaderSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: getScreenBottomPadding(insets.bottom) }]}
        showsVerticalScrollIndicator={false}>
        {unlocked ? (
          <LinearGradient
            colors={[...FamilyWorkspaceTheme.heroGradient]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}>
            <TierBadge
              label={t('familyPlans.tierFamily')}
              accent={GOLD}
              accentBg={FamilyWorkspaceTheme.heroBadgeBg}
              accentBorder={FamilyWorkspaceTheme.heroBadgeBorder}
            />
            <Text style={styles.heroTitle}>{t('familyPlans.hero.title')}</Text>
            <Text style={styles.heroSubtitle}>{t('familyPlans.hero.subtitle')}</Text>
          </LinearGradient>
        ) : (
          <View style={[styles.heroCard, styles.heroCardFree]}>
            <TierBadge
              label={t('common.free')}
              accent={TEXT_MUTED}
              accentBg="rgba(255,255,255,0.06)"
              accentBorder={CARD_BORDER}
            />
            <Text style={[styles.heroTitle, styles.heroTitleMuted]}>{t('familyPlans.freeHero.title')}</Text>
            <Text style={styles.heroSubtitle}>{t('familyPlans.freeHero.subtitle')}</Text>
            {__DEV__ ? (
              <Pressable
                style={[styles.previewWorkspaceBtn, devPreviewBusy && styles.previewWorkspaceBtnBusy]}
                disabled={devPreviewBusy || devPreviewActive}
                onPress={() => void handleDevPreview()}>
                <Text style={styles.previewWorkspaceBtnText}>
                  {devPreviewActive
                    ? t('familyPlans.previewWorkspaceActive')
                    : devPreviewBusy
                      ? t('common.processing')
                      : t('familyPlans.previewWorkspace')}
                </Text>
              </Pressable>
            ) : null}
            <Pressable style={styles.upgradeBtn} onPress={() => router.push(buildPaywallHref('family') as never)}>
              <Text style={styles.upgradeBtnText}>{t('familyPlans.getFamilyWorkspace')}</Text>
            </Pressable>
          </View>
        )}

        {unlocked ? (
          <View style={styles.workspaceOverviewCard}>
            <Text style={styles.workspaceOverviewTitle}>{t('familyPlans.workspaceOverview.title')}</Text>
            <Text style={styles.workspaceOverviewItem}>• {t('familyPlans.workspaceOverview.personal')}</Text>
            <Text style={styles.workspaceOverviewItem}>• {t('familyPlans.workspaceOverview.family')}</Text>
            <Text style={styles.workspaceOverviewHint}>{t('familyPlans.workspaceOverview.switcher')}</Text>
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>{t('familyPlans.howItWorks')}</Text>
          {shareSteps.map((step, index) => (
            <StepRow
              key={step.key}
              step={index + 1}
              title={step.title}
              body={step.body}
              icon={step.icon}
              accent={heroAccent}
              locked={!unlocked}
            />
          ))}
          {unlocked && (
            <StepRow
              step={shareSteps.length + 1}
              title={t('familyPlans.steps.sync.title')}
              body={t('familyPlans.steps.sync.body')}
              icon={SYNC_STEP_ICON}
              accent={FAMILY_DARK}
              locked={!syncUnlocked}
            />
          )}
        </View>

        <View style={[styles.sectionCard, !unlocked && styles.sectionCardLocked]}>
          <View style={styles.sectionHeaderRow}>
            <SymbolView
              name={{ ios: 'key.fill', android: 'key', web: 'key' }}
              tintColor={unlocked ? (hasLiveSync ? FAMILY_DARK : FAMILY) : TEXT_DIM}
              size={20}
            />
            <Text style={styles.sectionTitle}>{t('familyPlans.familyCode.title')}</Text>
          </View>
          <Text style={styles.sectionHint}>
            {unlocked
              ? t('familyPlans.familyCode.hintUnlocked')
              : t('familyPlans.familyCode.hintLocked')}
          </Text>
          <Pressable
            onPress={() => void (unlocked ? handleCopyCode() : requestAccess())}
            style={[styles.codeDisplay, hasLiveSync && styles.codeDisplayHousehold, unlocked && !hasLiveSync && styles.codeDisplayPro, !unlocked && styles.codeDisplayLocked]}>
            <Text style={[styles.codeValue, !unlocked && styles.codeValueLocked]}>
              {unlocked ? familyCode || '…' : '••••-••••'}
            </Text>
            {!unlocked ? <Text style={styles.codeTapHint}>{t('familyPlans.familyCode.tapToUnlock')}</Text> : null}
          </Pressable>
          <Pressable
            style={[styles.primaryBtn, hasLiveSync && styles.primaryBtnHousehold, !unlocked && styles.primaryBtnMuted]}
            onPress={handleCopyCode}>
            <SymbolView
              name={{ ios: 'doc.on.doc.fill', android: 'content_copy', web: 'content_copy' }}
              tintColor={unlocked ? '#000' : TEXT_MUTED}
              size={18}
            />
            <Text style={[styles.primaryBtnText, !unlocked && styles.primaryBtnTextMuted]}>
              {unlocked ? t('familyPlans.familyCode.copyInvite') : t('familyPlans.unlockWithFamily')}
            </Text>
          </Pressable>
          {unlocked ? (
            <>
              <Pressable style={styles.secondaryBtn} onPress={() => void handleCopyInviteLink()}>
                <Text style={styles.secondaryBtnText}>{t('familyPlans.familyCode.copyLink')}</Text>
              </Pressable>
              <View style={styles.emailInviteBlock}>
                <Text style={styles.sectionHint}>{t('familyPlans.emailInvite.hint')}</Text>
                <TextInput
                  style={styles.emailInput}
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                  placeholder={t('familyPlans.emailInvite.placeholder')}
                  placeholderTextColor={TEXT_DIM}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Pressable
                  style={[styles.primaryBtn, hasLiveSync && styles.primaryBtnHousehold]}
                  onPress={() => void handleEmailInvite()}>
                  <SymbolView
                    name={{ ios: 'envelope.fill', android: 'mail', web: 'mail' }}
                    tintColor="#000"
                    size={18}
                  />
                  <Text style={styles.primaryBtnText}>{t('familyPlans.emailInvite.button')}</Text>
                </Pressable>
              </View>
            </>
          ) : null}
        </View>

        <View style={[styles.sectionCard, !unlocked && styles.sectionCardLocked]}>
          <View style={styles.sectionHeaderRow}>
            <SymbolView
              name={{ ios: 'cart.fill', android: 'shopping_cart', web: 'shopping_cart' }}
              tintColor={unlocked ? GREEN : TEXT_DIM}
              size={20}
            />
            <Text style={styles.sectionTitle}>{t('familyPlans.shareList.title')}</Text>
          </View>
          <Text style={styles.sectionHint}>{t('familyPlans.shareList.hint')}</Text>
          <Pressable
            style={[styles.primaryBtn, !unlocked && styles.primaryBtnMuted]}
            onPress={handleExportList}>
            <SymbolView
              name={{ ios: 'square.and.arrow.up.fill', android: 'share', web: 'share' }}
              tintColor={unlocked ? '#000' : TEXT_MUTED}
              size={18}
            />
            <Text style={[styles.primaryBtnText, !unlocked && styles.primaryBtnTextMuted]}>
              {t('familyPlans.shareList.button')}
            </Text>
          </Pressable>
          {unlocked && (
            <Pressable style={styles.secondaryBtn} onPress={() => router.push('/list/share' as never)}>
              <Text style={styles.secondaryBtnText}>{t('familyPlans.shareList.openFullScreen')}</Text>
            </Pressable>
          )}
          {unlocked && lastExportAt && (
            <Text style={styles.metaText}>
              {t('familyPlans.shareList.lastShared', { date: formatDateTime(lastExportAt) })}
            </Text>
          )}
        </View>

        {unlocked && (
          <View
            style={[
              styles.sectionCard,
              hasLiveSync ? styles.syncCardHousehold : styles.syncCardPro,
            ]}>
            <View style={styles.sectionHeaderRow}>
              <SymbolView
                name={{ ios: 'arrow.triangle.2.circlepath', android: 'sync', web: 'sync' }}
                tintColor={hasLiveSync ? FAMILY_DARK : TEXT_MUTED}
                size={20}
              />
              <Text style={styles.sectionTitle}>{t('familyPlans.sync.title')}</Text>
              {hasLiveSync && (
                <View style={styles.liveBadge}>
                  <Text style={styles.liveBadgeText}>{t('familyPlans.sync.liveBadge')}</Text>
                </View>
              )}
            </View>
            {syncUnlocked ? (
              <>
                <Text style={styles.sectionHint}>{t('familyPlans.sync.hintActive')}</Text>
                <View style={styles.syncStats}>
                  <View style={styles.syncStat}>
                    <Text style={styles.syncStatLabel}>{t('familyPlans.sync.lastSync')}</Text>
                    <Text style={styles.syncStatValue}>
                      {lastExportAt ? formatDateTime(lastExportAt) : t('familyPlans.sync.notYet')}
                    </Text>
                  </View>
                  <View style={styles.syncStat}>
                    <Text style={styles.syncStatLabel}>{t('familyPlans.sync.pending')}</Text>
                    <Text style={styles.syncStatValue}>{syncQueueSize}</Text>
                  </View>
                </View>
                <Pressable style={[styles.primaryBtn, styles.primaryBtnHousehold]} onPress={() => void handleFlushSync()}>
                  <Text style={styles.primaryBtnText}>{t('familyPlans.sync.syncNow')}</Text>
                </Pressable>
                {!isFamilySyncAvailable() ? (
                  <Text style={styles.metaText}>{t('familyPlans.sync.supabaseHint')}</Text>
                ) : null}
              </>
            ) : (
              <>
                <Text style={styles.sectionHint}>{t('familyPlans.sync.upgradeHint')}</Text>
                <Pressable style={[styles.primaryBtn, styles.primaryBtnHousehold]} onPress={() => router.push(buildPaywallHref('family') as never)}>
                  <Text style={styles.primaryBtnText}>{t('familyPlans.getFamilyWorkspace')}</Text>
                </Pressable>
              </>
            )}
          </View>
        )}

        <View style={[styles.sectionCard, !unlocked && styles.sectionCardLocked]}>
          <View style={styles.sectionHeaderRow}>
            <SymbolView
              name={{ ios: 'tray.and.arrow.down.fill', android: 'download', web: 'download' }}
              tintColor={unlocked ? (hasLiveSync ? FAMILY_DARK : FAMILY) : TEXT_DIM}
              size={20}
            />
            <Text style={styles.sectionTitle}>{t('familyPlans.receive.title')}</Text>
          </View>
          <Text style={styles.sectionHint}>{t('familyPlans.receive.hint')}</Text>
          <TextInput
            style={[styles.textArea, !unlocked && styles.textAreaLocked]}
            multiline
            editable={unlocked}
            placeholder={t('familyPlans.receive.placeholder')}
            placeholderTextColor={TEXT_DIM}
            value={importText}
            onChangeText={setImportText}
          />
          <Pressable
            style={[styles.primaryBtn, hasLiveSync && styles.primaryBtnHousehold, !unlocked && styles.primaryBtnMuted]}
            onPress={handleImport}>
            <Text style={[styles.primaryBtnText, !unlocked && styles.primaryBtnTextMuted]}>
              {unlocked ? t('familyPlans.receive.addToLists') : t('familyPlans.unlockWithFamily')}
            </Text>
          </Pressable>
        </View>

        {!unlocked && (
          <View style={styles.planCompareCard}>
            <Text style={styles.planCompareTitle}>{t('familyPlans.compare.title')}</Text>
            <Text style={styles.planCompareItem}>{t('familyPlans.compare.item1')}</Text>
            <Text style={styles.planCompareItem}>{t('familyPlans.compare.item2')}</Text>
            {__DEV__ ? (
              <Pressable
                style={styles.previewWorkspaceBtn}
                disabled={devPreviewBusy || devPreviewActive}
                onPress={() => void handleDevPreview()}>
                <Text style={styles.previewWorkspaceBtnText}>
                  {devPreviewActive
                    ? t('familyPlans.previewWorkspaceActive')
                    : devPreviewBusy
                      ? t('common.processing')
                      : t('familyPlans.previewWorkspace')}
                </Text>
              </Pressable>
            ) : null}
            <Pressable style={styles.upgradeBtn} onPress={() => router.push(buildPaywallHref('family') as never)}>
              <Text style={styles.upgradeBtnText}>{t('familyPlans.compare.comparePlans')}</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  pageTitleWrap: { flex: 1, alignItems: 'center' },
  pageTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    textAlign: 'center',
  },
  pageHeaderSpacer: { width: 40 },
  content: { padding: 16, paddingBottom: 48, gap: 16 },
  heroGradient: {
    borderRadius: SmartCartRadius.lg,
    padding: 24,
    borderWidth: 1,
    borderColor: FamilyWorkspaceTheme.bannerBorder,
    gap: 12,
  },
  heroCard: {
    borderRadius: SmartCartRadius.lg,
    padding: 24,
    borderWidth: 1,
    gap: 12,
  },
  heroCardPro: {
    backgroundColor: CARD_BG,
    borderColor: 'rgba(34,197,94,0.3)',
  },
  heroCardFree: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: CARD_BORDER,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    letterSpacing: -0.4,
    lineHeight: 30,
  },
  heroTitleMuted: { color: 'rgba(255,255,255,0.75)' },
  heroSubtitle: {
    fontSize: 15,
    color: TEXT_MUTED,
    lineHeight: 22,
  },
  tierBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  tierBadgeText: { fontSize: 12, fontWeight: '700' },
  workspaceOverviewCard: {
    borderRadius: SmartCartRadius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: FamilyWorkspaceTheme.bannerBorder,
    backgroundColor: FamilyWorkspaceTheme.bannerBg,
    gap: 8,
  },
  workspaceOverviewTitle: { fontSize: 16, fontWeight: '800', color: TEXT_PRIMARY },
  workspaceOverviewItem: { fontSize: 14, color: TEXT_MUTED, lineHeight: 21 },
  workspaceOverviewHint: { fontSize: 13, color: TEXT_DIM, lineHeight: 19, marginTop: 4 },
  upgradeBtn: {
    backgroundColor: FAMILY,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  upgradeBtnText: { fontSize: 15, fontWeight: '700', color: '#000' },
  previewWorkspaceBtn: {
    backgroundColor: FamilyWorkspaceTheme.heroBadgeBg,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: FamilyWorkspaceTheme.syncCardBorder,
  },
  previewWorkspaceBtnBusy: { opacity: 0.7 },
  previewWorkspaceBtnText: { fontSize: 15, fontWeight: '700', color: FamilyWorkspaceTheme.accentLight },
  householdLink: { marginTop: 8, paddingVertical: 6 },
  householdLinkText: { fontSize: 13, color: TEXT_MUTED, textAlign: 'center', lineHeight: 19 },
  householdLinkAccent: { color: FAMILY_DARK, fontWeight: '600' },
  sectionCard: {
    backgroundColor: CARD_BG,
    borderRadius: SmartCartRadius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    gap: 12,
  },
  sectionCardLocked: { opacity: 0.72 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: TEXT_DIM,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: TEXT_PRIMARY, flex: 1 },
  sectionHint: { fontSize: 14, color: TEXT_MUTED, lineHeight: 20 },
  stepRow: { flexDirection: 'row', gap: 14, marginBottom: 4 },
  stepRowLocked: { opacity: 0.55 },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  stepNumberText: { fontSize: 14, fontWeight: '800' },
  stepContent: { flex: 1, gap: 4 },
  stepTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepTitle: { fontSize: 15, fontWeight: '700', color: TEXT_PRIMARY },
  stepTitleLocked: { color: TEXT_MUTED },
  stepBody: { fontSize: 13, color: TEXT_MUTED, lineHeight: 19 },
  stepBodyLocked: { color: TEXT_DIM },
  codeDisplay: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: SmartCartRadius.md,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  codeDisplayPro: { borderColor: 'rgba(34,197,94,0.25)' },
  codeDisplayHousehold: {
    borderColor: FamilyWorkspaceTheme.syncCardBorder,
    backgroundColor: FamilyWorkspaceTheme.syncCardBg,
  },
  codeValue: {
    fontSize: 26,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    letterSpacing: 3,
  },
  codeValueLocked: { color: TEXT_DIM, letterSpacing: 6 },
  codeDisplayLocked: { opacity: 0.85 },
  codeTapHint: { fontSize: 11, fontWeight: '600', color: TEXT_DIM, marginTop: 6 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: GREEN,
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  primaryBtnHousehold: { backgroundColor: FAMILY_DARK },
  primaryBtnMuted: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#000' },
  primaryBtnTextMuted: { color: TEXT_MUTED },
  secondaryBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  secondaryBtnText: { fontSize: 14, fontWeight: '600', color: TEXT_MUTED },
  emailInviteBlock: { marginTop: 14, gap: 10 },
  emailInput: {
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: SmartCartRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: TEXT_PRIMARY,
    fontSize: 15,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  metaText: { fontSize: 12, color: TEXT_DIM, textAlign: 'center' },
  syncCardPro: { borderColor: 'rgba(34,197,94,0.2)' },
  syncCardHousehold: {
    borderColor: FamilyWorkspaceTheme.syncCardBorder,
    backgroundColor: FamilyWorkspaceTheme.syncCardBg,
  },
  liveBadge: {
    backgroundColor: FamilyWorkspaceTheme.liveBadgeBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(234,179,8,0.4)',
  },
  liveBadgeText: { fontSize: 11, fontWeight: '700', color: GOLD },
  syncStats: { flexDirection: 'row', gap: 12 },
  syncStat: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: SmartCartRadius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  syncStatLabel: { fontSize: 11, color: TEXT_DIM, fontWeight: '600', textTransform: 'uppercase' },
  syncStatValue: { fontSize: 13, color: TEXT_PRIMARY, fontWeight: '600', marginTop: 4 },
  textArea: {
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: SmartCartRadius.md,
    padding: 14,
    minHeight: 100,
    fontSize: 14,
    color: TEXT_PRIMARY,
    backgroundColor: 'rgba(255,255,255,0.03)',
    textAlignVertical: 'top',
  },
  textAreaLocked: { color: TEXT_DIM },
  planCompareCard: {
    backgroundColor: 'rgba(34,197,94,0.08)',
    borderRadius: SmartCartRadius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.25)',
    gap: 10,
  },
  planCompareTitle: { fontSize: 16, fontWeight: '700', color: TEXT_PRIMARY },
  planCompareItem: { fontSize: 14, color: TEXT_MUTED, lineHeight: 21 },
});
