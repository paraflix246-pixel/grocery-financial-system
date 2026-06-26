import { useRouter } from 'expo-router';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

type Props = {
  prefix?: string;
  style?: StyleProp<ViewStyle>;
  mutedColor?: string;
  linkColor?: string;
};

const DEFAULT_MUTED = 'rgba(255,255,255,0.38)';
const DEFAULT_LINK = '#7C3AED';

/**
 * Short Terms + Privacy acknowledgment with tappable links.
 * LEGAL: Have qualified legal counsel review copy before production release.
 */
export function LegalFooter({
  prefix = 'By subscribing you agree to our',
  style,
  mutedColor = DEFAULT_MUTED,
  linkColor = DEFAULT_LINK,
}: Props) {
  const router = useRouter();

  return (
    <View style={[styles.root, style]}>
      <Text style={[styles.text, { color: mutedColor }]}>
        {prefix}{' '}
        <Text
          style={[styles.link, { color: linkColor }]}
          onPress={() => router.push('/terms')}
          accessibilityRole="link"
        >
          Terms of Service
        </Text>{' '}
        and{' '}
        <Text
          style={[styles.link, { color: linkColor }]}
          onPress={() => router.push('/privacy')}
          accessibilityRole="link"
        >
          Privacy Policy
        </Text>
        .
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    marginTop: 12,
    paddingHorizontal: 4,
  },
  text: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
  },
  link: {
    fontSize: 11,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
