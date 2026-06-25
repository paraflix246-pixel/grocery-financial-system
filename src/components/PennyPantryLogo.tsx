import { Image } from 'expo-image';
import { StyleSheet, View, type ViewStyle } from 'react-native';

const logoSource = require('../../assets/images/penny-pantry-logo.png');

type Props = {
  size?: number;
  style?: ViewStyle;
};

export function PennyPantryLogo({ size = 160, style }: Props) {
  return (
    <View style={[styles.container, style]}>
      <Image
        source={logoSource}
        style={{ width: size, height: size, borderRadius: size * 0.12 }}
        contentFit="contain"
        accessibilityLabel="Penny Pantry"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
});
