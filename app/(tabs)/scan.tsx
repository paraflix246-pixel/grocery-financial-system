import * as ImagePicker from 'expo-image-picker';
import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  usePhotoOutput,
} from 'react-native-vision-camera';

import { BackButton } from '@/src/components/BackButton';
import { CameraOverlay } from '@/src/components/CameraOverlay';
import { scanReceiptFromImage, shouldOpenPreview } from '@/src/services/receiptParsePipeline';
import { useScanStore } from '@/src/store/useScanStore';
import { validateParsedReceipt } from '@/src/utils/receiptValidation';

export default function ScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const photoOutput = usePhotoOutput();
  const [processing, setProcessing] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const { setImageUri, setRawOcrText, setDraft, setOcrMeta, setParseWarnings, startManualEntry } = useScanStore();

  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  const processImage = useCallback(
    async (uri: string) => {
      setProcessing(true);
      try {
        setImageUri(uri);
        const result = await scanReceiptFromImage(uri);
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
      } finally {
        setProcessing(false);
      }
    },
    [router, setDraft, setImageUri, setOcrMeta, setParseWarnings, setRawOcrText]
  );

  const capturePhoto = async () => {
    try {
      const photoFile = await photoOutput.capturePhotoToFile({}, {});
      const uri =
        Platform.OS === 'android'
          ? `file://${photoFile.filePath}`
          : photoFile.filePath;
      await processImage(uri);
    } catch (err) {
      console.warn('Capture failed, falling back to gallery:', err);
      await pickImage();
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      await processImage(result.assets[0].uri);
    }
  };

  if (processing) {
    return (
      <View style={styles.container}>
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <BackButton showLabel={false} tintColor="#fff" />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.processingText}>Processing receipt...</Text>
        </View>
      </View>
    );
  }

  if (!device || !hasPermission) {
    return (
      <View style={styles.container}>
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <BackButton showLabel={false} tintColor="#fff" />
        </View>
        <View style={styles.center}>
          <Text style={styles.title}>Scan Receipt</Text>
          <Text style={styles.subtitle}>Camera permission required</Text>
          <Pressable style={styles.button} onPress={requestPermission}>
            <Text style={styles.buttonText}>Grant Permission</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={pickImage}>
            <Text style={styles.secondaryText}>Or pick from gallery</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => {
              startManualEntry();
              router.push('/receipt/edit');
            }}>
            <Text style={styles.secondaryText}>Add receipt manually</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
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

      <View style={[styles.controls, { paddingBottom: insets.bottom + 24 }]}>
        <Pressable
          onPress={() => {
            startManualEntry();
            router.push('/receipt/edit');
          }}>
          <Text style={styles.retakeText}>Manual</Text>
        </Pressable>
        <Pressable style={styles.captureBtn} onPress={capturePhoto}>
          <View style={styles.captureInner} />
        </Pressable>
        <Pressable onPress={() => setFlashOn((f) => !f)}>
          <Text style={styles.flashText}>{flashOn ? 'Flash On' : 'Flash'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#111' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 8, color: '#fff' },
  subtitle: { opacity: 0.6, textAlign: 'center', marginBottom: 24, color: '#fff' },
  processingText: { marginTop: 16, opacity: 0.7, color: '#fff' },
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
