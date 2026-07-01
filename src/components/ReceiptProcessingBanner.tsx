import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { Text } from '@/components/Themed';
import { useReceiptProcessingQueue } from '@/src/services/receiptProcessingQueue';
import type { ReceiptQueueJob } from '@/src/services/receiptProcessingQueue';
import { useScanStore } from '@/src/store/useScanStore';
import { shouldOpenPreview } from '@/src/services/receiptParsePipeline';
import { SmartCartColors, SmartCartRadius } from '@/src/theme/smartCart';
import { getDeepReadScanWaitMessages } from '@/src/utils/scanWaitTime';

function openJobInPreview(
  job: ReceiptQueueJob,
  consumeJobResult: (jobId: string) => ReceiptQueueJob | null,
  router: ReturnType<typeof useRouter>['push']
) {
  const consumed = consumeJobResult(job.id);
  if (!consumed?.result) return;
  const scanStore = useScanStore.getState();
  scanStore.setImageUri(consumed.imageUri);
  scanStore.setRawOcrText(consumed.result.ocrText);
  scanStore.setOcrMeta({
    source: consumed.result.ocrSource,
    confidence: consumed.result.ocrConfidence,
    parseMethod: consumed.result.parseMethod,
    parseVerified: consumed.result.parseVerified,
  });
  scanStore.setDraft(consumed.result.draft);
  scanStore.setParseWarnings(consumed.result.parseWarnings);
  router(
    shouldOpenPreview({
      draft: consumed.result.draft,
      parseMethod: consumed.result.parseMethod,
      parseVerified: consumed.result.parseVerified,
      ocrResult: {
        text: consumed.result.ocrText,
        source: consumed.result.ocrSource,
        confidence: consumed.result.ocrConfidence,
      },
    })
      ? '/receipt/preview'
      : '/receipt/edit'
  );
}

export function ReceiptProcessingBanner() {
  const { t } = useTranslation();
  const router = useRouter();
  const jobs = useReceiptProcessingQueue((s) => s.jobs);
  const clearFinished = useReceiptProcessingQueue((s) => s.clearFinished);
  const dismissJob = useReceiptProcessingQueue((s) => s.dismissJob);
  const consumeJobResult = useReceiptProcessingQueue((s) => s.consumeJobResult);

  if (jobs.length === 0) return null;

  const pendingCount = jobs.filter((job) => job.status === 'queued' || job.status === 'processing').length;
  const doneCount = jobs.filter((job) => job.status === 'done').length;
  const failedCount = jobs.filter((job) => job.status === 'failed').length;

  return (
    <View style={styles.stack}>
      {pendingCount > 0 ? (
        <View style={styles.summaryRow}>
          <Text style={styles.summaryText}>
            {t('receiptQueue.queueSummary', { count: pendingCount })}
          </Text>
        </View>
      ) : null}

      {jobs.map((job) => {
        if (job.status === 'done') {
          return (
            <Pressable
              key={job.id}
              style={[styles.banner, styles.bannerSuccess]}
              onPress={() => openJobInPreview(job, consumeJobResult, router.push)}>
              <Text style={styles.emoji}>✅</Text>
              <View style={styles.copy}>
                <Text style={styles.title}>{t('receiptQueue.doneTitle')}</Text>
                <Text style={styles.subtitle}>{t('receiptQueue.doneBody')}</Text>
              </View>
              <SymbolView
                name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                tintColor={SmartCartColors.primaryDark}
                size={18}
              />
            </Pressable>
          );
        }

        if (job.status === 'failed') {
          return (
            <Pressable
              key={job.id}
              style={[styles.banner, styles.bannerError]}
              onPress={() => dismissJob(job.id)}>
              <Text style={styles.emoji}>⚠️</Text>
              <View style={styles.copy}>
                <Text style={styles.title}>{t('receiptQueue.failedTitle')}</Text>
                <Text style={styles.subtitle} numberOfLines={2}>
                  {job.error ?? t('receiptQueue.failedBody')}
                </Text>
              </View>
              <SymbolView
                name={{ ios: 'xmark', android: 'close', web: 'close' }}
                tintColor={SmartCartColors.danger}
                size={18}
              />
            </Pressable>
          );
        }

        const { label } = getDeepReadScanWaitMessages(0, job.stage);
        return (
          <View key={job.id} style={styles.banner}>
            <Text style={styles.emoji}>🧾</Text>
            <View style={styles.copy}>
              <Text style={styles.title}>{t('receiptQueue.processingTitle')}</Text>
              <Text style={styles.subtitle}>{label}</Text>
            </View>
          </View>
        );
      })}

      {failedCount > 0 && doneCount === 0 && pendingCount === 0 ? (
        <Pressable onPress={clearFinished} style={styles.clearLink}>
          <Text style={styles.clearLinkText}>{t('receiptQueue.clearFailed')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 8, marginBottom: 12 },
  summaryRow: { marginHorizontal: 16 },
  summaryText: { fontSize: 12, fontWeight: '700', color: SmartCartColors.textSecondary },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    padding: 14,
    borderRadius: SmartCartRadius.md,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  bannerSuccess: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  bannerError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  emoji: { fontSize: 22 },
  copy: { flex: 1 },
  title: { fontSize: 14, fontWeight: '800', color: SmartCartColors.text },
  subtitle: { fontSize: 12, color: SmartCartColors.textSecondary, marginTop: 2 },
  clearLink: { alignSelf: 'center', paddingVertical: 4 },
  clearLinkText: { fontSize: 12, fontWeight: '600', color: SmartCartColors.textSecondary },
});
