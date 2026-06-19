import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SmartCartColors, SmartCartRadius } from '@/src/theme/smartCart';

const scanReceiptBanner = require('../../assets/images/scan-receipt-banner.png');

export function HeroScanCard() {
  const router = useRouter();
  const goToScan = () => router.push('/(tabs)/scan');

  return (
    <Pressable
      style={styles.wrapper}
      onPress={goToScan}
      accessibilityRole="button"
      accessibilityLabel="Scan Receipt. Upload or scan a receipt to extract items, track prices, and compare stores.">
      <View style={styles.bannerImageWrap}>
        <Image
          source={scanReceiptBanner}
          style={styles.bannerImage}
          contentFit="contain"
          accessibilityIgnoresInvertColors
        />
      </View>
      <View style={[styles.copyBlock, { pointerEvents: 'none' }]}>
        <Text style={styles.title}>Scan Receipt ✨</Text>
        <Text style={styles.subtitle}>
          Upload or scan a receipt to extract items, track prices, and compare stores.
        </Text>
        <View style={styles.scanButton}>
          <SymbolView
            name={{ ios: 'camera', android: 'photo_camera', web: 'photo_camera' }}
            size={24}
            tintColor={SmartCartColors.primaryDark}
          />
          <Text style={styles.scanButtonText}>Scan Now</Text>
        </View>
        <Text style={styles.secureText}>🛡️ Secure • Private • No Account Required</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '91%',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
  },
  bannerImageWrap: {
    width: '100%',
    pointerEvents: 'none',
  },
  bannerImage: {
    width: '100%',
    aspectRatio: 1024 / 617,
    borderRadius: 24,
  },
  copyBlock: {
    left: 17,
    position: 'absolute',
    top: 54,
    width: '44%',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
    lineHeight: 24,
    marginBottom: 8,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.94)',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    marginBottom: 11,
  },
  scanButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: SmartCartRadius.pill,
    flexDirection: 'row',
    gap: 9,
    paddingHorizontal: 19,
    paddingVertical: 10,
    shadowColor: '#064E3B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 3,
  },
  scanButtonText: {
    color: SmartCartColors.primaryDark,
    fontSize: 16,
    fontWeight: '800',
  },
  secureText: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 13,
    marginTop: 6,
  },
});
