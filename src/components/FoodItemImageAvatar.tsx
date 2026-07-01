import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { getItemEmoji } from '@/src/data/commonGroceryItems';
import { useCommonsFoodImage } from '@/src/hooks/useCommonsFoodImage';
import { SmartCartColors } from '@/src/theme/smartCart';

type Props = {
  itemName: string;
  canonicalName?: string;
  size?: 'sm' | 'md' | 'lg';
  shape?: 'circle' | 'square';
  showAttribution?: boolean;
  style?: ViewStyle;
};

const SIZES = {
  sm: { outer: 32, emoji: 16 },
  md: { outer: 44, emoji: 22 },
  lg: { outer: 56, emoji: 28 },
} as const;

function formatAttributionLabel(license?: string): string {
  if (license?.trim()) return license.trim();
  return 'Wikimedia Commons';
}

export function FoodItemImageAvatar({
  itemName,
  canonicalName,
  size = 'md',
  shape = 'circle',
  showAttribution = false,
  style,
}: Props) {
  const emoji = getItemEmoji(canonicalName, itemName);
  const { image, loading } = useCommonsFoodImage(itemName);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const dims = SIZES[size];
  const radius = shape === 'square' ? 12 : dims.outer / 2;

  useEffect(() => {
    setImageLoadFailed(false);
  }, [image?.thumbnailUrl, itemName]);

  const showPhoto = Boolean(image?.thumbnailUrl) && !loading && !imageLoadFailed;

  const openAttribution = () => {
    if (!image?.filePageUrl) return;
    void Linking.openURL(image.filePageUrl);
  };

  return (
    <View style={[styles.wrap, style]}>
      <View
        style={[
          styles.avatar,
          {
            width: dims.outer,
            height: dims.outer,
            borderRadius: radius,
          },
        ]}>
        {showPhoto ? (
          <Image
            source={{ uri: image!.thumbnailUrl }}
            style={styles.photo}
            contentFit="cover"
            accessibilityLabel={`Photo of ${itemName}`}
            accessibilityIgnoresInvertColors
            onError={() => setImageLoadFailed(true)}
          />
        ) : (
          <Text style={[styles.emoji, { fontSize: dims.emoji, lineHeight: dims.emoji * 1.15 }]}>
            {emoji}
          </Text>
        )}
      </View>
      {showAttribution && showPhoto && image ? (
        <Pressable
          onPress={openAttribution}
          accessibilityRole="link"
          accessibilityLabel={`Image license: ${formatAttributionLabel(image.license)}. Tap to view on Wikimedia Commons.`}
          hitSlop={6}>
          <Text style={styles.attribution} numberOfLines={1}>
            {formatAttributionLabel(image.license)}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 2,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SmartCartColors.badge,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  emoji: {
    textAlign: 'center',
  },
  attribution: {
    maxWidth: 72,
    fontSize: 9,
    color: SmartCartColors.textMuted,
    textDecorationLine: 'underline',
  },
});
