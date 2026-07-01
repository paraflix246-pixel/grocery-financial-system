import { Image } from 'expo-image';
import { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type StyleProp,
  type ImageStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';
import { SmartCartColors, SmartCartRadius } from '@/src/theme/smartCart';

const WEB_MODAL_Z_INDEX = 1300;
const MAX_ZOOM = 4;

type Props = {
  imageUri: string;
  thumbnailStyle?: StyleProp<ImageStyle>;
  /** Accent tint for expand icon (e.g. family workspace primary). */
  accentColor?: string;
};

function ReceiptImageLightbox({
  visible,
  imageUri,
  onClose,
  accentColor,
}: {
  visible: boolean;
  imageUri: string;
  onClose: () => void;
  accentColor?: string;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const closeTint = accentColor ?? SmartCartColors.textOnPrimary;

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);

  const resetZoom = useCallback(() => {
    scale.value = 1;
    savedScale.value = 1;
  }, [savedScale, scale]);

  useEffect(() => {
    if (!visible) resetZoom();
  }, [visible, resetZoom]);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = Math.min(MAX_ZOOM, Math.max(0.5, savedScale.value * event.scale));
    })
    .onEnd(() => {
      if (scale.value < 1) {
        scale.value = withTiming(1);
        savedScale.value = 1;
        return;
      }
      if (scale.value > MAX_ZOOM) {
        scale.value = withTiming(MAX_ZOOM);
        savedScale.value = MAX_ZOOM;
        return;
      }
      savedScale.value = scale.value;
    });

  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const imageWidth = windowWidth - 32;
  const imageHeight = windowHeight - insets.top - insets.bottom - 80;

  const image = (
    <Image
      source={{ uri: imageUri }}
      style={{ width: imageWidth, height: imageHeight }}
      contentFit="contain"
      accessibilityLabel={t('receipt.viewImage')}
    />
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.lightboxRoot}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
        />

        <View style={styles.lightboxContent} pointerEvents="box-none">
          <Pressable
            style={[styles.closeBtn, { top: insets.top + 12 }]}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            hitSlop={12}>
            <SymbolView
              name={{ ios: 'xmark.circle.fill', android: 'close', web: 'close' }}
              tintColor={closeTint}
              size={32}
            />
          </Pressable>

          {Platform.OS === 'ios' ? (
            <ScrollView
              style={styles.zoomScroll}
              contentContainerStyle={styles.zoomScrollContent}
              maximumZoomScale={MAX_ZOOM}
              minimumZoomScale={1}
              centerContent
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}>
              {image}
            </ScrollView>
          ) : Platform.OS === 'android' ? (
            <GestureDetector gesture={pinchGesture}>
              <Animated.View style={[styles.imageStage, animatedImageStyle]}>{image}</Animated.View>
            </GestureDetector>
          ) : (
            <ScrollView
              style={styles.zoomScroll}
              contentContainerStyle={styles.zoomScrollContent}
              maximumZoomScale={MAX_ZOOM}
              minimumZoomScale={1}
              centerContent
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}>
              {image}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

export function ReceiptImageViewer({ imageUri, thumbnailStyle, accentColor }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const trimmedUri = imageUri?.trim();

  if (!trimmedUri) return null;

  const hintTint = accentColor ?? SmartCartColors.primary;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={t('receipt.viewImage')}
        style={({ pressed }) => [styles.thumbWrap, pressed && styles.thumbPressed]}>
        <Image
          source={{ uri: trimmedUri }}
          style={[styles.thumbDefault, thumbnailStyle]}
          contentFit="cover"
        />
        <View style={styles.expandBadge}>
          <SymbolView
            name={{ ios: 'arrow.up.left.and.arrow.down.right', android: 'fullscreen', web: 'fullscreen' }}
            tintColor={hintTint}
            size={14}
          />
        </View>
      </Pressable>

      <ReceiptImageLightbox
        visible={open}
        imageUri={trimmedUri}
        onClose={() => setOpen(false)}
        accentColor={accentColor}
      />
    </>
  );
}

const styles = StyleSheet.create({
  thumbWrap: {
    position: 'relative',
  },
  thumbPressed: {
    opacity: 0.85,
  },
  thumbDefault: {
    width: 64,
    height: 80,
    borderRadius: SmartCartRadius.sm,
    backgroundColor: SmartCartColors.border,
  },
  expandBadge: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxRoot: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    ...(Platform.OS === 'web'
      ? {
          position: 'fixed' as const,
          top: 0,
          right: 0,
          left: 0,
          bottom: 0,
          zIndex: WEB_MODAL_Z_INDEX,
        }
      : null),
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  lightboxContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    right: 16,
    zIndex: 2,
  },
  zoomScroll: {
    flex: 1,
    width: '100%',
  },
  zoomScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageStage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
