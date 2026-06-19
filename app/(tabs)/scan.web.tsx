import * as ImagePicker from 'expo-image-picker';
import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/src/components/AppHeader';
import { recognizeTextFromImageDetailed } from '@/src/services/ocrService.web';
import { parseReceiptText } from '@/src/services/receiptParser';
import { useScanStore } from '@/src/store/useScanStore';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';
import { validateParsedReceipt } from '@/src/utils/receiptValidation';

export default function ScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [processing, setProcessing] = useState(false);
  const [ocrSource, setOcrSource] = useState<'tesseract' | 'fallback' | 'empty' | null>(null);
  const { setImageUri, setRawOcrText, setDraft, setOcrMeta, setParseWarnings, reset, startManualEntry } =
    useScanStore();

  const processImage = useCallback(
    async (uri: string) => {
      setProcessing(true);
      try {
        reset();
        setImageUri(uri);
        const { text, source, confidence } = await recognizeTextFromImageDetailed(uri);
        setOcrSource(source);
        setOcrMeta({ source, confidence });
        setRawOcrText(text);
        const draft = parseReceiptText(text);
        setDraft(draft);
        setParseWarnings(validateParsedReceipt(draft, { ocrSource: source, ocrConfidence: confidence }));
        router.push(source === 'empty' ? '/receipt/edit' : '/receipt/preview');
      } finally {
        setProcessing(false);
      }
    },
    [reset, router, setDraft, setImageUri, setOcrMeta, setParseWarnings, setRawOcrText]
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
      <View style={styles.container}>
        <View style={[styles.processingHeader, { paddingTop: insets.top + 12 }]}>
          <AppHeader notificationCount={0} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={SmartCartColors.primary} />
          <Text style={styles.processingText}>Processing receipt...</Text>
          <Text style={styles.processingHint}>
            {ocrSource === 'tesseract'
              ? 'Reading text with Tesseract OCR — review and edit before saving'
              : 'Could not read receipt text — you will enter details manually'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}>
      <AppHeader notificationCount={0} />

      <View style={styles.demoBanner}>
        <SymbolView
          name={{ ios: 'info.circle.fill', android: 'info', web: 'info' }}
          tintColor={SmartCartColors.accentOrange}
          size={18}
        />
        <Text style={styles.demoBannerText}>
          For best results, photograph the receipt flat, in good lighting, with all text in frame. Always review scanned data before saving.
        </Text>
      </View>

      <Text style={styles.title}>Upload Receipt</Text>
      <Text style={styles.subtitle}>
        Choose a photo from your gallery. On mobile, use the Scan tab for camera capture.
      </Text>

      <Pressable
        style={({ pressed }) => [styles.uploadCard, pressed && styles.uploadCardPressed]}
        onPress={pickImage}
        accessibilityRole="button"
        accessibilityLabel="Choose receipt image from gallery">
        <View style={styles.uploadIconWrap}>
          <SymbolView
            name={{ ios: 'photo.on.rectangle', android: 'photo_library', web: 'photo_library' }}
            tintColor={SmartCartColors.primary}
            size={36}
          />
        </View>
        <Text style={styles.uploadTitle}>Choose from gallery</Text>
        <Text style={styles.uploadHint}>JPG or PNG receipt photo</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.manualBtn, pressed && styles.manualBtnPressed]}
        onPress={() => {
          startManualEntry();
          router.push('/receipt/edit');
        }}>
        <SymbolView name={{ ios: 'square.and.pencil', android: 'edit_note', web: 'edit_note' }} tintColor={SmartCartColors.primaryDark} size={20} />
        <Text style={styles.manualBtnText}>Add receipt manually</Text>
      </Pressable>

      <View style={styles.noteCard}>
        <Text style={styles.noteTitle}>What happens next</Text>
        <Text style={styles.noteBody}>
          Your image is parsed into editable line items. Review totals, fix any mistakes, then save to track spending and price history.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SmartCartColors.background },
  content: { paddingHorizontal: 16 },
  processingHeader: { paddingHorizontal: 16 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: SmartCartColors.background,
    padding: 24,
  },
  processingText: { marginTop: 16, color: SmartCartColors.text, fontWeight: '600', fontSize: 16 },
  processingHint: { marginTop: 8, color: SmartCartColors.textSecondary, fontSize: 13, textAlign: 'center' },
  demoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FFF7ED',
    borderRadius: SmartCartRadius.sm,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  demoBannerText: { flex: 1, fontSize: 13, color: SmartCartColors.text, lineHeight: 18 },
  title: { fontSize: 28, fontWeight: '800', color: SmartCartColors.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: SmartCartColors.textSecondary, marginTop: 6, marginBottom: 24, lineHeight: 20 },
  uploadCard: {
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.lg,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: SmartCartColors.primary,
    borderStyle: 'dashed',
    marginBottom: 20,
    ...SmartCartShadow.card,
  },
  uploadCardPressed: { opacity: 0.9, backgroundColor: SmartCartColors.badge },
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
  manualBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.md,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    ...SmartCartShadow.cardSoft,
  },
  manualBtnPressed: { backgroundColor: SmartCartColors.badge, borderColor: SmartCartColors.primary },
  manualBtnText: { fontSize: 15, fontWeight: '700', color: SmartCartColors.primaryDark },
  noteCard: {
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.md,
    padding: 16,
    ...SmartCartShadow.cardSoft,
  },
  noteTitle: { fontSize: 14, fontWeight: '700', color: SmartCartColors.text, marginBottom: 6 },
  noteBody: { fontSize: 13, color: SmartCartColors.textSecondary, lineHeight: 19 },
});
