import { Image } from 'expo-image';
import { StyleSheet, Text, View, type TextStyle, type ViewStyle } from 'react-native';

import { SmartCartColors } from '@/src/theme/smartCart';

const logoSource = require('../../assets/images/penny-pantry-logo.png');

type Variant = 'hero' | 'inline' | 'icon';

type Props = {
  /** Logo image width/height in px. Defaults vary by variant. */
  size?: number;
  /** Show "Penny Pantry" text beside the logo (inline variant only). */
  showName?: boolean;
  /** Layout preset: hero (centered), inline (row wordmark), icon (image only). */
  variant?: Variant;
  nameColor?: string;
  nameSize?: number;
  nameStyle?: TextStyle;
  style?: ViewStyle;
};

const DEFAULT_SIZE: Record<Variant, number> = {
  hero: 64,
  inline: 24,
  icon: 160,
};

export function PennyPantryLogo({
  size,
  variant = 'icon',
  showName = variant === 'inline',
  nameColor,
  nameSize,
  nameStyle,
  style,
}: Props) {
  const imageSize = size ?? DEFAULT_SIZE[variant];
  const resolvedNameColor = nameColor ?? (variant === 'inline' ? SmartCartColors.primaryDark : '#7C3AED');
  const resolvedNameSize = nameSize ?? (variant === 'inline' ? 20 : 24);

  const image = (
    <Image
      source={logoSource}
      style={{
        width: imageSize,
        height: imageSize,
        borderRadius: imageSize * 0.12,
      }}
      contentFit="contain"
      accessibilityLabel="Penny Pantry"
    />
  );

  if (variant === 'inline' && showName) {
    return (
      <View style={[styles.inlineRow, style]} accessibilityRole="image" accessibilityLabel="Penny Pantry">
        {image}
        <Text
          style={[
            styles.inlineName,
            { color: resolvedNameColor, fontSize: resolvedNameSize },
            nameStyle,
          ]}
        >
          Penny Pantry
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        variant === 'hero' ? styles.heroContainer : styles.iconContainer,
        style,
      ]}
    >
      {image}
    </View>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  heroContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  inlineName: {
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
