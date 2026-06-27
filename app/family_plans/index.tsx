import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import { useFeatureGate } from '@/src/hooks/useFeatureGate';
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
import { SmartCartRadius } from '@/src/theme/smartCart';
import { copyText, shareText } from '@/src/utils/copyOrShare';
import { showInfoAlert } from '@/src/utils/platformAlert';
import { getScreenBottomPadding } from '@/src/utils/safeAreaLayout';

const BG = '#0F0F0F';
const GREEN = '#22C55E';
const GREEN_DARK = '#16A34A';
const GOLD = '#EAB308';
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
  const hasLiveSync = syncUnlocked;

  const [familyCode, setFamilyCode] = useState('');
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

  const heroAccent = hasLiveSync ? GREEN_DARK : unlocked ? GREEN : TEXT_MUTED;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerStyle: { backgroundColor: BG },
          contentStyle: { backgroundColor: BG },
        }}
      />

      <View style={[styles.pageHeader, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.pageTitle}>{t('familyPlans.title')}</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: getScreenBottomPadding(insets.bottom) }]}
        showsVerticalScrollIndicator={false}>
        {unlocked ? (
          <LinearGradient
            colors={['rgba(22,163,74,0.4)', 'rgba(22,163,74,0.14)', 'rgba(15,15,15,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}>
            <TierBadge
              label={t('familyPlans.tierFamily')}
              accent={GOLD}
              accentBg="rgba(22,163,74,0.22)"
              accentBorder="rgba(234,179,8,0.45)"
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
            <Pressable style={styles.upgradeBtn} onPress={() => router.push('/paywall?family=1' as never)}>
              <Text style={styles.upgradeBtnText}>{t('familyPlans.getFamilyWorkspace')}</Text>
            </Pressable>
          </View>
        )}

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
              accent={GREEN_DARK}
              locked={!syncUnlocked}
            />
          )}
        </View>

        <View style={[styles.sectionCard, !unlocked && styles.sectionCardLocked]}>
          <View style={styles.sectionHeaderRow}>
            <SymbolView
              name={{ ios: 'key.fill', android: 'key', web: 'key' }}
              tintColor={unlocked ? (hasLiveSync ? GREEN_DARK : GREEN) : TEXT_DIM}
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
                tintColor={hasLiveSync ? GREEN_DARK : TEXT_MUTED}
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
                <Pressable style={[styles.primaryBtn, styles.primaryBtnHousehold]} onPress={() => router.push('/paywall?family=1' as never)}>
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
              tintColor={unlocked ? (hasLiveSync ? GREEN_DARK : GREEN) : TEXT_DIM}
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
            <Pressable style={styles.upgradeBtn} onPress={() => router.push('/paywall?family=1' as never)}>
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
    paddingHorizontal: 16,
    paddingBottom: 4,
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    textAlign: 'center',
  },
  content: { padding: 16, paddingBottom: 48, gap: 16 },
  heroGradient: {
    borderRadius: SmartCartRadius.lg,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(22,163,74,0.4)',
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
  upgradeBtn: {
    backgroundColor: GREEN,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  upgradeBtnText: { fontSize: 15, fontWeight: '700', color: '#000' },
  householdLink: { marginTop: 8, paddingVertical: 6 },
  householdLinkText: { fontSize: 13, color: TEXT_MUTED, textAlign: 'center', lineHeight: 19 },
  householdLinkAccent: { color: GREEN_DARK, fontWeight: '600' },
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
    borderColor: 'rgba(22,163,74,0.4)',
    backgroundColor: 'rgba(22,163,74,0.1)',
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
  primaryBtnHousehold: { backgroundColor: GREEN_DARK },
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
  metaText: { fontSize: 12, color: TEXT_DIM, textAlign: 'center' },
  syncCardPro: { borderColor: 'rgba(34,197,94,0.2)' },
  syncCardHousehold: {
    borderColor: 'rgba(22,163,74,0.45)',
    backgroundColor: 'rgba(22,163,74,0.1)',
  },
  liveBadge: {
    backgroundColor: 'rgba(22,163,74,0.22)',
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
