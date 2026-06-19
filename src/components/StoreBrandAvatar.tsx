import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { buildCustomStore, CATALOG_STORES, type StoreDefinition } from '@/src/data/stores';
import { matchStoreByName, resolveStore } from '@/src/services/storeService';

type Props = {
  store: string;
  size?: number;
  variant?: 'avatar' | 'banner' | 'card';
  bannerHeight?: number;
};

export function StoreBrandAvatar({
  store,
  size = 36,
  variant = 'avatar',
  bannerHeight = 44,
}: Props) {
  const [storeDef, setStoreDef] = useState<StoreDefinition>(
    () => matchStoreByName(store, CATALOG_STORES) ?? buildCustomStore(store)
  );

  useEffect(() => {
    let active = true;
    resolveStore(store).then((resolved) => {
      if (active) setStoreDef(resolved);
    });
    return () => {
      active = false;
    };
  }, [store]);

  if (variant === 'banner') {
    return (
      <View style={[styles.banner, { height: bannerHeight, backgroundColor: storeDef.brandColor }]}>
        <Image
          source={{ uri: storeDef.logoUrl }}
          style={styles.bannerLogo}
          contentFit="contain"
          accessibilityLabel={`${storeDef.name} logo`}
        />
      </View>
    );
  }

  if (variant === 'card') {
    return (
      <View
        style={[
          styles.cardLogoFrame,
          {
            width: size,
            height: size,
            borderRadius: Math.max(12, size * 0.28),
            borderColor: storeDef.brandColor,
          },
        ]}>
        <Image
          source={{ uri: storeDef.logoUrl }}
          style={{ width: size - 6, height: size - 6 }}
          contentFit="contain"
          accessibilityLabel={`${storeDef.name} logo`}
        />
      </View>
    );
  }

  const radius = size / 2;

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
      <Image
        source={{ uri: storeDef.logoUrl }}
        style={{ width: size, height: size, borderRadius: radius }}
        contentFit="cover"
        accessibilityLabel={`${storeDef.name} logo`}
      />
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
});
