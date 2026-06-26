import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { SmartCartColors, SmartCartRadius } from '@/src/theme/smartCart';

const scanReceiptBanner = require('../../assets/images/scan-receipt-banner.png');

export function HeroScanCard() {
  const { t } = useTranslation();
  const router = useRouter();
  const [bannerFailed, setBannerFailed] = useState(false);
  const goToScan = () => router.push('/(tabs)/scan');

  return (
    <Pressable
      style={styles.wrapper}
      onPress={goToScan}
      accessibilityRole="button"
      accessibilityLabel={t('heroScan.a11y')}>
      <LinearGradient
        colors={['#15803D', '#22C55E', '#86EFAC']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {!bannerFailed ? (
        <Image
          source={scanReceiptBanner}
          style={styles.bannerImage}
          contentFit="cover"
          accessibilityIgnoresInvertColors
          onError={() => setBannerFailed(true)}
        />
      ) : null}
      <View style={[styles.copyBlock, { pointerEvents: 'none' }]}>
        <Text style={styles.title}>{t('heroScan.title')}</Text>
        <Text style={styles.subtitle}>{t('heroScan.subtitle')}</Text>
        <View style={styles.scanButton}>
          <SymbolView
            name={{ ios: 'camera', android: 'photo_camera', web: 'photo_camera' }}
            size={24}
            tintColor={SmartCartColors.primaryDark}
          />
          <Text style={styles.scanButtonText}>{t('heroScan.scanNow')}</Text>
        </View>
        <Text style={styles.secureText}>{t('heroScan.secure')}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    alignSelf: 'stretch',
    marginTop: 8,
    marginBottom: 20,
    aspectRatio: 1024 / 617,
    borderRadius: 24,
    backgroundColor: SmartCartColors.primaryDark,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
  },
  bannerImage: {
    ...StyleSheet.absoluteFill,
  },
  copyBlock: {
    position: 'absolute',
    left: 16,
    right: '48%',
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingVertical: 12,
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
