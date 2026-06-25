import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { buildCustomStore, CATALOG_STORES, type StoreDefinition } from '@/src/data/stores';
import { matchStoreByName, resolveStore } from '@/src/services/storeService';

type Props = {
  store: string;
  size?: number;
  variant?: 'avatar' | 'banner' | 'card';
  bannerHeight?: number;
};

/**
 * data: URIs are not supported by SDWebImage (iOS) or Glide (Android).
 * Catalog stores now use real CDN URLs; this guard remains for custom stores
 * whose logoUrl is still generated as an SVG data URI by buildCustomStore().
 */
function isDataUri(url: string): boolean {
  return url.startsWith('data:');
}

export function StoreBrandAvatar({
  store,
  size = 36,
  variant = 'avatar',
  bannerHeight = 44,
}: Props) {
  const [storeDef, setStoreDef] = useState<StoreDefinition>(
    () => matchStoreByName(store, CATALOG_STORES) ?? buildCustomStore(store)
  );
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    let active = true;
    setImageError(false);
    resolveStore(store).then((resolved) => {
      if (active) setStoreDef(resolved);
    });
    return () => {
      active = false;
    };
  }, [store]);

  const useFallback = imageError || isDataUri(storeDef.logoUrl);

  if (variant === 'banner') {
    const bannerFontSize = Math.max(14, bannerHeight * 0.4);
    return (
      <View style={[styles.banner, { height: bannerHeight, backgroundColor: storeDef.brandColor }]}>
        {useFallback ? (
          <Text style={[styles.initialsText, { fontSize: bannerFontSize }]} numberOfLines={1}>
            {storeDef.initials}
          </Text>
        ) : (
          <Image
            source={{ uri: storeDef.logoUrl }}
            style={styles.bannerLogo}
            contentFit="contain"
            cachePolicy="memory-disk"
            onError={() => setImageError(true)}
            accessibilityLabel={`${storeDef.name} logo`}
          />
        )}
      </View>
    );
  }

  if (variant === 'card') {
    const cardFontSize = Math.max(10, size * 0.35);
    return (
      <View
        style={[
          styles.cardLogoFrame,
          {
            width: size,
            height: size,
            borderRadius: Math.max(12, size * 0.28),
            borderColor: storeDef.brandColor,
            backgroundColor: useFallback ? storeDef.brandColor : '#FFFFFF',
          },
        ]}>
        {useFallback ? (
          <Text style={[styles.initialsText, { fontSize: cardFontSize }]} numberOfLines={1}>
            {storeDef.initials}
          </Text>
        ) : (
          <Image
            source={{ uri: storeDef.logoUrl }}
            style={{ width: size - 6, height: size - 6 }}
            contentFit="contain"
            cachePolicy="memory-disk"
            onError={() => setImageError(true)}
            accessibilityLabel={`${storeDef.name} logo`}
          />
        )}
      </View>
    );
  }

  const radius = size / 2;
  const avatarFontSize = Math.max(10, size * 0.38);

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: storeDef.brandColor,
        },
      ]}>
      {useFallback ? (
        <Text style={[styles.initialsText, { fontSize: avatarFontSize }]} numberOfLines={1}>
          {storeDef.initials}
        </Text>
      ) : (
        <Image
          source={{ uri: storeDef.logoUrl }}
          style={{ width: size, height: size, borderRadius: radius }}
          contentFit="cover"
          cachePolicy="memory-disk"
          onError={() => setImageError(true)}
          accessibilityLabel={`${storeDef.name} logo`}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  banner: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    overflow: 'hidden',
  },
  bannerLogo: {
    width: 36,
    height: 36,
  },
  cardLogoFrame: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  initialsText: {
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
