import * as ImagePicker from 'expo-image-picker';
import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CameraOverlay } from '@/src/components/CameraOverlay';
import { AppHeader } from '@/src/components/AppHeader';
import { recognizeTextFromImage } from '@/src/services/ocrService.web';
import { parseReceiptText } from '@/src/services/receiptParser';
import { useScanStore } from '@/src/store/useScanStore';
import { SmartCartColors } from '@/src/theme/smartCart';

const TAB_BAR_HEIGHT = 72;

export default function ScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [processing, setProcessing] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const { setImageUri, setRawOcrText, setDraft } = useScanStore();

  const processImage = useCallback(
    async (uri: string) => {
      setProcessing(true);
      try {
        setImageUri(uri);
        const text = await recognizeTextFromImage(uri);
        setRawOcrText(text);
        const draft = parseReceiptText(text);
        setDraft(draft);
        router.push('/receipt/preview');
      } finally {
        setProcessing(false);
      }
    },
    [router, setDraft, setImageUri, setRawOcrText]
  );

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      await processImage(result.assets[0].uri);
    }
  };

  if (processing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.processingText}>Processing receipt...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.headerStrip, { paddingTop: insets.top + 8 }]}>
        <AppHeader notificationCount={0} />
      </View>
      <View style={styles.viewfinder}>
        <CameraOverlay />
      </View>

      <View style={styles.topBar}>
        <Pressable style={styles.topBtn} onPress={() => router.back()}>
          <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} tintColor="#fff" size={22} />
        </Pressable>
        <Pressable style={styles.topBtn} onPress={() => setFlashOn((f) => !f)}>
          <SymbolView name={{ ios: 'bolt.slash', android: 'flash_off', web: 'flash_off' }} tintColor="#fff" size={22} />
        </Pressable>
      </View>

      <View
        style={[styles.controls, { paddingBottom: insets.bottom + 24, bottom: TAB_BAR_HEIGHT }]}
        pointerEvents="box-none">
        <Pressable onPress={pickImage}>
          <Text style={styles.retakeText}>Retake</Text>
        </Pressable>
        <Pressable style={styles.captureBtn} onPress={pickImage}>
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
  container: { flex: 1, backgroundColor: SmartCartColors.background },
  headerStrip: { paddingHorizontal: 16, backgroundColor: SmartCartColors.background },
  viewfinder: { flex: 1, backgroundColor: '#1a1a1a' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111' },
  processingText: { marginTop: 16, color: '#fff', opacity: 0.7 },
  topBar: {
    position: 'absolute',
    top: 72,
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
