import { StyleSheet, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Text } from '@/components/Themed';
import { FAMILY_PLAN_FEATURES, FAMILY_PLAN_FEATURE_GROUPS } from '@/src/constants/proPricing';
import { SmartCartColors } from '@/src/theme/smartCart';

type Variant = 'full' | 'grouped';

type Props = {
  variant?: Variant;
  accentColor?: string;
  mutedColor?: string;
  leadLabel?: string;
  style?: StyleProp<ViewStyle>;
  featureTextStyle?: StyleProp<TextStyle>;
  leadTextStyle?: StyleProp<TextStyle>;
};

function CheckRow({
  text,
  accent,
  textStyle,
}: {
  text: string;
  accent: string;
  textStyle?: StyleProp<TextStyle>;
}) {
  return (
    <View style={styles.featureRow}>
      <View style={styles.iconWrap}>
        <SymbolView
          name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
          tintColor={accent}
          size={18}
        />
      </View>
      <Text style={[styles.featureText, textStyle]}>{text}</Text>
    </View>
  );
}

export function FamilyPlanFeaturesList({
  variant = 'full',
  accentColor = '#16A34A',
  mutedColor = SmartCartColors.textMuted,
  leadLabel,
  style,
  featureTextStyle,
  leadTextStyle,
}: Props) {
  if (variant === 'grouped') {
    return (
      <View style={[styles.list, style]}>
        {FAMILY_PLAN_FEATURE_GROUPS.map((group) => (
          <View key={group.title} style={styles.group}>
            <Text style={[styles.groupTitle, { color: accentColor }]}>{group.title}</Text>
            {group.items.map((item) => (
              <CheckRow key={item} text={item} accent={mutedColor} textStyle={featureTextStyle} />
            ))}
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={[styles.list, style]}>
      {leadLabel ? (
        <Text style={[styles.leadLabel, { color: mutedColor }, leadTextStyle]}>{leadLabel}</Text>
      ) : null}
      {FAMILY_PLAN_FEATURES.map((feature) => (
        <CheckRow key={feature} text={feature} accent={accentColor} textStyle={featureTextStyle} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10, paddingRight: 4 },
  leadLabel: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 2,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    width: '100%',
  },
  iconWrap: {
    width: 18,
    height: 18,
    flexShrink: 0,
    marginTop: 1,
  },
  featureText: {
    flex: 1,
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  group: { gap: 8, marginBottom: 6 },
  groupTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 0.2, marginBottom: 2 },
});
