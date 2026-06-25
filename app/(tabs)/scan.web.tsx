import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/src/components/AppHeader';
import { MockupScreenTitle } from '@/src/components/mockup/MockupUI';
import { ReceiptScanProcessing } from '@/src/components/ReceiptScanProcessing';
import { scanReceiptFromImage, shouldOpenPreview } from '@/src/services/receiptParsePipeline';
import { getScanLimitStatus } from '@/src/services/scanLimitService';
import { useScanStore } from '@/src/store/useScanStore';
import { useSubscriptionStore } from '@/src/store/useSubscriptionStore';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';
import { pickReceiptImageWeb } from '@/src/utils/pickReceiptImageWeb';
import { promptScanLimitReached } from '@/src/utils/promptScanLimit';
import { validateParsedReceipt } from '@/src/utils/receiptValidation';
import type { ReceiptScanStage } from '@/src/utils/scanWaitTime';

function CornerGuide({ style }: { style?: object }) {
  return (
    <View style={[styles.corner, style]}>
      <View style={[styles.cornerLine, styles.cornerH]} />
      <View style={[styles.cornerLine, styles.cornerV]} />
    </View>
  );
}

export default function ScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tier = useSubscriptionStore((s) => s.tier);
  const [processing, setProcessing] = useState(false);
  const [scanStage, setScanStage] = useState<ReceiptScanStage>('preparing');
  const [scanRemaining, setScanRemaining] = useState<number | null>(null);

  const showScanError = (message: string) => {
    if (Platform.OS === 'web') {
      window.alert(message);
      return;
    }
    Alert.alert('Scan failed', message);
  };

  const { setImageUri, setRawOcrText, setDraft, setOcrMeta, setParseWarnings, reset, startManualEntry } =
    useScanStore();

  const ensureCanScan = useCallback(async (): Promise<boolean> => {
    if (tier !== 'free') return true;
    const status = await getScanLimitStatus();
    setScanRemaining(status.remaining);
    if (status.allowed) return true;
    promptScanLimitReached(() => router.push('/paywall' as never));
    return false;
  }, [router, tier]);

  useEffect(() => {
    if (tier !== 'free') {
      setScanRemaining(null);
      return;
    }
    void getScanLimitStatus().then((status) => setScanRemaining(status.remaining));
  }, [tier]);

  const processImage = useCallback(
    async (uri: string) => {
      if (!(await ensureCanScan())) return;
      setProcessing(true);
      setScanStage('preparing');
      try {
        reset();
        setImageUri(uri);
        const result = await scanReceiptFromImage(uri, { onStage: setScanStage });
        const { draft, parseMethod, ocrResult } = result;
        setRawOcrText(ocrResult.text);
        setDraft(draft);
        setOcrMeta({
          source: ocrResult.source,
          confidence: ocrResult.confidence,
          parseMethod,
          parseVerified: result.parseVerified,
          deepseekAudited: result.deepseekAudited,
        });
        setParseWarnings(
          validateParsedReceipt(draft, {
            ocrSource: ocrResult.source,
            ocrConfidence: ocrResult.confidence,
            parseMethod,
          })
        );
        router.push(shouldOpenPreview(result) ? '/receipt/preview' : '/receipt/edit');
      } catch (error) {
        const message =
          error instanceof Error && error.name === 'TimeoutError'
            ? 'Scan timed out. Check your connection and try again.'
            : error instanceof Error && error.message
              ? error.message
              : 'Something went wrong while scanning. Please try again.';
        showScanError(message);
        console.warn('Receipt scan failed:', error);
      } finally {
        setProcessing(false);
      }
    },
    [reset, router, setDraft, setImageUri, setOcrMeta, setParseWarnings, setRawOcrText, ensureCanScan]
  );

  const pickImage = async () => {
    if (!(await ensureCanScan())) return;
    try {
      const picked = await pickReceiptImageWeb();
      if (picked) {
        await processImage(picked.uri);
      }
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Could not load that image. Try a JPG, PNG, or WebP photo.';
      showScanError(message);
      console.warn('Receipt image pick failed:', error);
    }
  };

  if (processing) {
    return (
      <ReceiptScanProcessing
        stage={scanStage}
        header={
          <View style={[styles.processingHeader, { paddingTop: insets.top + 12 }]}>
            <AppHeader notificationCount={0} />
          </View>
        }
      />
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}>
      <AppHeader notificationCount={0} />

      <MockupScreenTitle
        title="Scan Receipt"
        subtitle="Upload a photo or PDF of your receipt. Review items before saving."
      />

      {scanRemaining != null && (
        <Text style={styles.scanLimitNote}>
          {scanRemaining} free scan{scanRemaining === 1 ? '' : 's'} left this month
        </Text>
      )}

      <Pressable
        style={({ pressed }) => [styles.uploadZone, pressed && styles.uploadZonePressed]}
        onPress={pickImage}
        accessibilityRole="button"
        accessibilityLabel="Choose receipt image from gallery">
        <CornerGuide style={styles.cornerTL} />
        <CornerGuide style={styles.cornerTR} />
        <CornerGuide style={styles.cornerBL} />
        <CornerGuide style={styles.cornerBR} />

        <View style={styles.uploadIconWrap}>
          <SymbolView
            name={{ ios: 'doc.viewfinder', android: 'document_scanner', web: 'document_scanner' }}
            tintColor={SmartCartColors.primary}
            size={40}
          />
        </View>
        <Text style={styles.uploadTitle}>Tap to upload receipt</Text>
        <Text style={styles.uploadHint}>Drag & drop or click to browse</Text>

        <View style={styles.uploadOptions}>
          <View style={styles.uploadOption}>
            <SymbolView
              name={{ ios: 'photo.on.rectangle', android: 'photo_library', web: 'photo_library' }}
              tintColor={SmartCartColors.primaryDark}
              size={18}
            />
            <Text style={styles.uploadOptionText}>Gallery</Text>
          </View>
          <View style={styles.uploadDivider} />
          <View style={styles.uploadOption}>
            <SymbolView
              name={{ ios: 'doc.fill', android: 'picture_as_pdf', web: 'picture_as_pdf' }}
              tintColor={SmartCartColors.primaryDark}
              size={18}
            />
            <Text style={styles.uploadOptionText}>PDF</Text>
          </View>
        </View>
      </Pressable>

      <Text style={styles.tipsTitle}>Tips for best results</Text>
      <Text style={styles.tipsBody}>
        Photograph the receipt flat, in good lighting, with all text in frame. Avoid shadows and
        creases. Scanning usually takes 15–45 seconds — review items before saving.
      </Text>

      <Pressable
        style={({ pressed }) => [styles.manualBtn, pressed && styles.manualBtnPressed]}
        onPress={async () => {
          if (!(await ensureCanScan())) return;
          startManualEntry();
          router.push('/receipt/edit');
        }}>
        <SymbolView name={{ ios: 'square.and.pencil', android: 'edit_note', web: 'edit_note' }} tintColor={SmartCartColors.primaryDark} size={20} />
        <Text style={styles.manualBtnText}>Add receipt manually</Text>
      </Pressable>
    </ScrollView>
  );
}

const CORNER = 28;
const LINE = 3;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SmartCartColors.background },
  content: { paddingHorizontal: 16 },
  scanLimitNote: {
    fontSize: 13,
    fontWeight: '600',
    color: SmartCartColors.textSecondary,
    marginBottom: 12,
    textAlign: 'center',
  },
  processingHeader: { paddingHorizontal: 16 },
  corner: { position: 'absolute', width: CORNER, height: CORNER },
  cornerTL: { top: 16, left: 16 },
  cornerTR: { top: 16, right: 16, transform: [{ scaleX: -1 }] },
  cornerBL: { bottom: 16, left: 16, transform: [{ scaleY: -1 }] },
  cornerBR: { bottom: 16, right: 16, transform: [{ scaleX: -1 }, { scaleY: -1 }] },
  cornerLine: { position: 'absolute', backgroundColor: SmartCartColors.primary },
  cornerH: { top: 0, left: 0, width: CORNER, height: LINE, borderTopLeftRadius: 2 },
  cornerV: { top: 0, left: 0, width: LINE, height: CORNER, borderTopLeftRadius: 2 },
  uploadZone: {
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.lg,
    padding: 32,
    alignItems: 'center',
    marginBottom: 20,
    minHeight: 260,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    ...SmartCartShadow.card,
  },
  uploadZonePressed: { opacity: 0.92, backgroundColor: SmartCartColors.badgeGreen },
  uploadIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: SmartCartColors.badge,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  uploadTitle: { fontSize: 18, fontWeight: '700', color: SmartCartColors.text },
  uploadHint: { fontSize: 13, color: SmartCartColors.textSecondary, marginTop: 4 },
  uploadOptions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    backgroundColor: SmartCartColors.badgeGreen,
    borderRadius: SmartCartRadius.pill,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  uploadOption: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  uploadOptionText: { fontSize: 13, fontWeight: '700', color: SmartCartColors.primaryDark },
  uploadDivider: { width: 1, height: 16, backgroundColor: SmartCartColors.border },
  tipsTitle: { fontSize: 14, fontWeight: '700', color: SmartCartColors.text, marginBottom: 6 },
  tipsBody: { fontSize: 13, color: SmartCartColors.textSecondary, lineHeight: 19, marginBottom: 20 },
  manualBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    ...SmartCartShadow.cardSoft,
  },
  manualBtnPressed: { backgroundColor: SmartCartColors.badge, borderColor: SmartCartColors.primary },
  manualBtnText: { fontSize: 15, fontWeight: '700', color: SmartCartColors.primaryDark },
});
