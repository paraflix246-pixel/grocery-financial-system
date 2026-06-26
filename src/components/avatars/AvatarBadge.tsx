import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/Themed';
import type { AppAvatarPreset } from '@/src/components/avatars/appAvatars';

const IDLE_MS = 4 * 60 * 1000;

type Props = {
  preset: AppAvatarPreset;
  size?: 'sm' | 'md' | 'lg';
  animate?: boolean;
};

const SIZE_MAP = { sm: 36, md: 44, lg: 52 } as const;
const EMOJI_MAP = { sm: 18, md: 22, lg: 26 } as const;

/** Circular emoji avatar — optional subtle idle bounce every few minutes. */
export function AvatarBadge({ preset, size = 'md', animate = false }: Props) {
  const dim = SIZE_MAP[size];
  const scale = useSharedValue(1);

  useEffect(() => {
    if (!animate) return;

    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const runPulse = () => {
      scale.value = withSequence(
        withTiming(1.08, { duration: 280, easing: Easing.out(Easing.quad) }),
        withTiming(0.96, { duration: 220, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 260, easing: Easing.out(Easing.quad) })
      );
      timeoutId = setTimeout(runPulse, IDLE_MS);
    };

    timeoutId = setTimeout(runPulse, IDLE_MS);
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [animate, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.wrap,
        {
          width: dim,
          height: dim,
          borderRadius: dim / 2,
          backgroundColor: preset.background,
          borderColor: preset.ring,
        },
        animate ? animatedStyle : undefined,
      ]}
      accessibilityRole="image"
      accessibilityLabel={preset.emoji}>
      <Text style={[styles.emoji, { fontSize: EMOJI_MAP[size] }]}>{preset.emoji}</Text>
      <View style={[styles.ring, { borderColor: `${preset.ring}55` }]} pointerEvents="none" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    overflow: 'hidden',
  },
  emoji: {
    lineHeight: undefined,
  },
  ring: {
    ...StyleSheet.absoluteFill,
    borderRadius: 999,
    borderWidth: 3,
  },
});
