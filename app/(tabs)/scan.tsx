import * as ImagePicker from 'expo-image-picker';
import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from '@/src/components/BackButton';
import { CameraOverlay } from '@/src/components/CameraOverlay';
import { ReceiptScanProcessing } from '@/src/components/ReceiptScanProcessing';
import { scanReceiptFromImage, shouldOpenPreview } from '@/src/services/receiptParsePipeline';
import { getScanLimitStatus } from '@/src/services/scanLimitService';
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
  Alert.alert('Scan failed', message);
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
};

function CameraCapture({ insets, onCapture, onGallery, onManualEntry }: CameraCaptureProps) {
  const vc = visionCamera!;
  const { hasPermission, requestPermission } = vc.useCameraPermission();
  const device = vc.useCameraDevice('back');
  const photoOutput = vc.usePhotoOutput();
  const [flashOn, setFlashOn] = useState(false);

  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

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
        <Text style={styles.title}>Scan Receipt</Text>
        <Text style={styles.subtitle}>Camera permission required</Text>
        <Pressable style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={onGallery}>
          <Text style={styles.secondaryText}>Or pick from gallery</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={onManualEntry}>
          <Text style={styles.secondaryText}>Add receipt manually</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <>
      <vc.Camera
        style={StyleSheet.absoluteFill}
        device={device}
        outputs={[photoOutput]}
        isActive
      />
      <CameraOverlay />

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <BackButton showLabel={false} tintColor="#fff" style={styles.topBtn} />
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
          <Text style={styles.retakeText}>Manual</Text>
        </Pressable>
        <Pressable style={styles.captureBtn} onPress={capturePhoto}>
          <View style={styles.captureInner} />
        </Pressable>
        <Pressable onPress={() => setFlashOn((f) => !f)}>
          <Text style={styles.flashText}>{flashOn ? 'Flash On' : 'Flash'}</Text>
        </Pressable>
      </View>
    </>
  );
}

// ---------------------------------------------------------------------------
// ScanScreen — route default export. No vision-camera hooks called here.
// ---------------------------------------------------------------------------

export default function ScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tier = useSubscriptionStore((s) => s.tier);
  const [processing, setProcessing] = useState(false);
  const [scanStage, setScanStage] = useState<ReceiptScanStage>('preparing');
  const [scanRemaining, setScanRemaining] = useState<number | null>(null);
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
      setProcessing(true);
      setScanStage('preparing');
      try {
        setImageUri(uri);
        const result = await scanReceiptFromImage(uri, { onStage: setScanStage });
        const { draft, parseMethod, ocrResult } = result;
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
        setProcessing(false);
      }
    },
    [router, setDraft, setImageUri, setOcrMeta, setParseWarnings, setRawOcrText, ensureCanScan]
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

  const handleManualEntry = useCallback(async () => {
    if (!(await ensureCanScan())) return;
    startManualEntry();
    router.push('/receipt/edit');
  }, [ensureCanScan, startManualEntry, router]);

  if (processing) {
    return (
      <ReceiptScanProcessing
        variant="dark"
        stage={scanStage}
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
          <Text style={styles.title}>Scan Receipt</Text>
          <Text style={styles.subtitle}>
            Camera not available — use gallery or manual entry
          </Text>
          <Pressable style={styles.button} onPress={pickImage}>
            <Text style={styles.buttonText}>Pick from gallery</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={handleManualEntry}>
            <Text style={styles.secondaryText}>Add receipt manually</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraCapture
        insets={insets}
        onCapture={processImage}
        onGallery={pickImage}
        onManualEntry={handleManualEntry}
      />
    </View>
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
