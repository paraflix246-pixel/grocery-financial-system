import * as ImagePicker from 'expo-image-picker';
import { SymbolView } from 'expo-symbols';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from '@/src/components/BackButton';
import { i18n } from '@/src/i18n';
import { CameraOverlay } from '@/src/components/CameraOverlay';
import { ReceiptScanProcessing } from '@/src/components/ReceiptScanProcessing';
import { assessReceiptLikelihood } from '@/src/services/receiptLikelihoodLogic';
import { lookupBarcodeProduct } from '@/src/services/barcodeProductService';
import { applyBarcodeScan, promptBarcodeDestination } from '@/src/services/barcodeScanFlow';
import { useReceiptProcessingQueue } from '@/src/services/receiptProcessingQueue';
import { scanReceiptFromImage, shouldOpenPreview } from '@/src/services/receiptParsePipeline';
import { getScanLimitStatus } from '@/src/services/scanLimitService';
import { finishOnboardingTryAndReturn } from '@/src/services/onboardingFlowState';
import { useScanStore } from '@/src/store/useScanStore';
import { useSubscriptionStore } from '@/src/store/useSubscriptionStore';
import { validateParsedReceipt } from '@/src/utils/receiptValidation';
import { promptScanLimitReached } from '@/src/utils/promptScanLimit';
import type { ReceiptScanStage } from '@/src/utils/scanWaitTime';

// Lazy-load vision-camera so the route does not crash when NitroModules is
// absent (e.g. an Expo Go / bare build that has not yet been rebuilt with the
// native camera module). If the require throws we degrade to a gallery-only UI.
let visionCamera: typeof import('react-native-vision-camera') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  visionCamera = require('react-native-vision-camera') as typeof import('react-native-vision-camera');
} catch {
  console.warn(
    '[scan] react-native-vision-camera unavailable (NitroModules not found). ' +
      'Camera features disabled — use gallery or manual entry.'
  );
}

function showScanError(message: string) {
  Alert.alert(i18n.t('scan.scanFailed'), message);
}

// ---------------------------------------------------------------------------
// CameraCapture — rendered ONLY when visionCamera module loaded successfully.
// Isolating the vision-camera hooks here prevents them from being called on
// every render of ScanScreen, which would crash when the native module is
// missing.
// ---------------------------------------------------------------------------

type CameraCaptureProps = {
  insets: ReturnType<typeof useSafeAreaInsets>;
  onCapture: (uri: string) => Promise<void>;
  onGallery: () => Promise<void>;
  onManualEntry: () => void;
  onBackgroundCapture: (uri: string) => void;
  onBarcodeScanned: (code: string) => Promise<void>;
  scanMode: 'receipt' | 'barcode';
  onScanModeChange: (mode: 'receipt' | 'barcode') => void;
};

function CameraCapture({
  insets,
  onCapture,
  onGallery,
  onManualEntry,
  onBackgroundCapture,
  onBarcodeScanned,
  scanMode,
  onScanModeChange,
}: CameraCaptureProps) {
  const { t } = useTranslation();
  const vc = visionCamera!;
  const { hasPermission, requestPermission } = vc.useCameraPermission();
  const device = vc.useCameraDevice('back');
  const photoOutput = vc.usePhotoOutput();
  const [flashOn, setFlashOn] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const lastLiveBarcodeRef = useRef<string | null>(null);
  const objectOutput = vc.useObjectOutput({
    types: ['ean-13', 'ean-8', 'upc-e', 'code-128'],
    onObjectsScanned: (objects) => {
      if (scanMode !== 'barcode') return;
      for (const object of objects) {
        if (!vc.isScannedCode(object)) continue;
        const value = object.value?.trim();
        if (!value || value === lastLiveBarcodeRef.current) return;
        lastLiveBarcodeRef.current = value;
        void onBarcodeScanned(value);
        return;
      }
    },
  });

  useEffect(() => {
    if (scanMode !== 'barcode') {
      lastLiveBarcodeRef.current = null;
    }
  }, [scanMode]);

  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  const submitManualBarcode = () => {
    const code = manualBarcode.trim();
    if (!code) return;
    void onBarcodeScanned(code);
  };

  const capturePhoto = async () => {
    try {
      const photoFile = await photoOutput.capturePhotoToFile({}, {});
      const uri =
        Platform.OS === 'android'
          ? `file://${photoFile.filePath}`
          : photoFile.filePath;
      await onCapture(uri);
    } catch (err) {
      console.warn('Capture failed, falling back to gallery:', err);
      await onGallery();
    }
  };

  if (!device || !hasPermission) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>{t('scan.title')}</Text>
        <Text style={styles.subtitle}>{t('scan.permissionRequired')}</Text>
        <Pressable style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>{t('scan.grantPermission')}</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={onGallery}>
          <Text style={styles.secondaryText}>{t('scan.pickGallery')}</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={onManualEntry}>
          <Text style={styles.secondaryText}>{t('scan.addManual')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <>
      <vc.Camera
        style={StyleSheet.absoluteFill}
        device={device}
        outputs={scanMode === 'receipt' ? [photoOutput] : [objectOutput]}
        isActive
      />
      {scanMode === 'receipt' ? (
        <CameraOverlay />
      ) : (
        <View style={styles.barcodeOverlay} pointerEvents="box-none">
          <View style={styles.barcodeFrame} />
          <Text style={styles.barcodeLiveHint}>{t('scan.barcodeLiveHint')}</Text>
          <Pressable style={styles.manualBarcodeLink} onPress={submitManualBarcode}>
            <Text style={styles.manualBarcodeLinkText}>{t('scan.barcodeEnterManual')}</Text>
          </Pressable>
          <TextInput
            style={styles.barcodeInputCompact}
            value={manualBarcode}
            onChangeText={setManualBarcode}
            placeholder="012345678905"
            keyboardType="number-pad"
            placeholderTextColor="rgba(255,255,255,0.45)"
          />
        </View>
      )}

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <BackButton showLabel={false} tintColor="#fff" style={styles.topBtn} />
        <View style={styles.modeToggle}>
          <Pressable
            style={[styles.modeChip, scanMode === 'receipt' && styles.modeChipActive]}
            onPress={() => onScanModeChange('receipt')}>
            <Text style={[styles.modeChipText, scanMode === 'receipt' && styles.modeChipTextActive]}>
              {t('scan.receiptMode')}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.modeChip, scanMode === 'barcode' && styles.modeChipActive]}
            onPress={() => onScanModeChange('barcode')}>
            <Text style={[styles.modeChipText, scanMode === 'barcode' && styles.modeChipTextActive]}>
              {t('scan.barcodeMode')}
            </Text>
          </Pressable>
        </View>
        <Pressable style={styles.topBtn} onPress={() => setFlashOn((f) => !f)}>
          <SymbolView
            name={{ ios: flashOn ? 'bolt.fill' : 'bolt.slash', android: 'flash_on', web: 'flash_on' }}
            tintColor="#fff"
            size={22}
          />
        </Pressable>
      </View>

      <View style={[styles.controls, { paddingBottom: 24 }]}>
        <Pressable onPress={onManualEntry}>
          <Text style={styles.retakeText}>{t('common.manual')}</Text>
        </Pressable>
        {scanMode === 'receipt' ? (
          <Pressable
            style={styles.captureBtn}
            onPress={capturePhoto}
            onLongPress={async () => {
              try {
                const photoFile = await photoOutput.capturePhotoToFile({}, {});
                const uri =
                  Platform.OS === 'android'
                    ? `file://${photoFile.filePath}`
                    : photoFile.filePath;
                onBackgroundCapture(uri);
              } catch {
                showScanError('Could not queue receipt for background processing.');
              }
            }}>
            <View style={styles.captureInner} />
          </Pressable>
        ) : (
          <View style={styles.barcodeHintWrap}>
            <Text style={styles.barcodeHint}>{t('scan.barcodeMode')}</Text>
          </View>
        )}
        <Pressable onPress={() => setFlashOn((f) => !f)}>
          <Text style={styles.flashText}>{flashOn ? t('scan.flashOn') : t('scan.flash')}</Text>
        </Pressable>
      </View>
    </>
  );
}

// ---------------------------------------------------------------------------
// ScanScreen — route default export. No vision-camera hooks called here.
// ---------------------------------------------------------------------------

export default function ScanScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { onboarding, mode } = useLocalSearchParams<{ onboarding?: string; mode?: string }>();
  const isOnboardingTry = onboarding === '1';
  const insets = useSafeAreaInsets();
  const tier = useSubscriptionStore((s) => s.tier);
  const [processing, setProcessing] = useState(false);
  const [scanMode, setScanMode] = useState<'receipt' | 'barcode'>(
    mode === 'barcode' ? 'barcode' : 'receipt'
  );
  const [scanStage, setScanStage] = useState<ReceiptScanStage>('preparing');
  const enqueueReceipt = useReceiptProcessingQueue((s) => s.enqueue);
  const [scanRemaining, setScanRemaining] = useState<number | null>(null);
  const processingUriRef = useRef<string | null>(null);
  const scanCancelledRef = useRef(false);
  const { setImageUri, setRawOcrText, setDraft, setOcrMeta, setParseWarnings, startManualEntry } =
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
      processingUriRef.current = uri;
      scanCancelledRef.current = false;
      setProcessing(true);
      setScanStage('preparing');
      try {
        setImageUri(uri);
        const result = await scanReceiptFromImage(uri, { onStage: setScanStage });
        if (scanCancelledRef.current) return;
        const { draft, parseMethod, ocrResult } = result;
        const likelihood = assessReceiptLikelihood(ocrResult.text);
        if (!likelihood.likelyReceipt && draft.items.length === 0) {
          Alert.alert(t('scan.notReceiptTitle'), t('scan.notReceiptBody'), [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('scan.addManual'),
              onPress: () => {
                startManualEntry();
                router.push('/receipt/edit');
              },
            },
          ]);
          return;
        }
        setOcrMeta({
          source: ocrResult.source,
          confidence: ocrResult.confidence,
          parseMethod,
          parseVerified: result.parseVerified,
        });
        setRawOcrText(ocrResult.text);
        setDraft(draft);
        setParseWarnings(
          validateParsedReceipt(draft, {
            ocrSource: ocrResult.source,
            ocrConfidence: ocrResult.confidence,
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
        processingUriRef.current = null;
        setProcessing(false);
      }
    },
    [router, setDraft, setImageUri, setOcrMeta, setParseWarnings, setRawOcrText, ensureCanScan, t, startManualEntry]
  );

  const handleManualEntry = useCallback(async () => {
    if (!(await ensureCanScan())) return;
    startManualEntry();
    router.push('/receipt/edit');
  }, [ensureCanScan, startManualEntry, router]);

  const queueBackgroundScan = useCallback(
    async (uri: string) => {
      if (!(await ensureCanScan())) return;
      enqueueReceipt(uri);
      Alert.alert(t('receiptQueue.queuedTitle'), t('receiptQueue.queuedBody'));
      router.replace('/(tabs)');
    },
    [enqueueReceipt, ensureCanScan, router, t]
  );

  const moveScanToBackground = useCallback(async () => {
    const uri = processingUriRef.current;
    if (!uri) return;
    scanCancelledRef.current = true;
    setProcessing(false);
    await queueBackgroundScan(uri);
  }, [queueBackgroundScan]);

  const handleBarcodeScanned = useCallback(
    async (code: string) => {
      const lookup = (await lookupBarcodeProduct(code)) ?? {
        barcode: code.replace(/\D/g, ''),
        name: code,
      };
      const finishIfOnboarding = async () => {
        if (isOnboardingTry) {
          await finishOnboardingTryAndReturn((href) => router.replace(href as never));
        }
      };
      promptBarcodeDestination(code, lookup.name, {
        onList: async () => {
          const result = await applyBarcodeScan(lookup, 'list');
          if (result.message) Alert.alert(t('scan.barcodeDetected'), result.message);
          await finishIfOnboarding();
        },
        onPantry: async () => {
          const result = await applyBarcodeScan(lookup, 'pantry');
          if (result.message) Alert.alert(t('scan.barcodeDetected'), result.message);
          await finishIfOnboarding();
        },
        onTrack: async () => {
          const result = await applyBarcodeScan(lookup, 'track');
          if (result.message) Alert.alert(t('scan.barcodeDetected'), result.message);
          await finishIfOnboarding();
        },
      });
    },
    [isOnboardingTry, router, t]
  );

  const pickImage = useCallback(async () => {
    if (!(await ensureCanScan())) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      await processImage(result.assets[0].uri);
    }
  }, [processImage, ensureCanScan]);

  if (processing) {
    return (
      <ReceiptScanProcessing
        variant="dark"
        stage={scanStage}
        onBackgroundPress={() => void moveScanToBackground()}
        backgroundLabel={t('receiptQueue.continueBackground')}
        header={
          <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
            <BackButton showLabel={false} tintColor="#fff" />
          </View>
        }
      />
    );
  }

  // NitroModules / vision-camera unavailable — show gallery + manual fallback
  if (!visionCamera) {
    return (
      <View style={styles.container}>
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <BackButton showLabel={false} tintColor="#fff" />
        </View>
        <View style={styles.center}>
          <Text style={styles.title}>{t('scan.title')}</Text>
          <Text style={styles.subtitle}>{t('scan.cameraUnavailable')}</Text>
          <Pressable style={styles.button} onPress={pickImage}>
            <Text style={styles.buttonText}>{t('scan.pickFromGallery')}</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={handleManualEntry}>
            <Text style={styles.secondaryText}>{t('scan.addManual')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <CameraCapture
        insets={insets}
        onCapture={processImage}
        onGallery={pickImage}
        onManualEntry={handleManualEntry}
        onBackgroundCapture={(uri) => void queueBackgroundScan(uri)}
        onBarcodeScanned={handleBarcodeScanned}
        scanMode={scanMode}
        onScanModeChange={setScanMode}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#111' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 8, color: '#fff' },
  subtitle: { opacity: 0.6, textAlign: 'center', marginBottom: 24, color: '#fff' },
  button: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondaryButton: { marginTop: 16 },
  secondaryText: { color: '#22C55E', fontWeight: '600' },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  topBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeToggle: { flexDirection: 'row', gap: 8 },
  modeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modeChipActive: { backgroundColor: 'rgba(34,197,94,0.85)' },
  modeChipText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  modeChipTextActive: { color: '#000' },
  barcodeHintWrap: {
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barcodeHint: { color: '#fff', fontWeight: '700', fontSize: 12, textAlign: 'center' },
  barcodeOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  barcodeFrame: {
    width: '72%',
    aspectRatio: 1.6,
    borderWidth: 2,
    borderColor: 'rgba(34,197,94,0.95)',
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  barcodeLiveHint: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 12,
  },
  manualBarcodeLink: { marginTop: 8 },
  manualBarcodeLinkText: { color: '#86EFAC', fontWeight: '700', fontSize: 13 },
  barcodeInputCompact: {
    width: '100%',
    maxWidth: 280,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  barcodeInput: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
  },
  retakeText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  flashText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  captureBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  captureInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#fff',
  },
});
