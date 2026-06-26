import { StyleSheet, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Text } from '@/components/Themed';
import { PRO_PLAN_FEATURE_GROUPS, PRO_PLAN_FEATURES } from '@/src/constants/proPricing';
import { SmartCartColors } from '@/src/theme/smartCart';

type Variant = 'full' | 'grouped';

type Props = {
  variant?: Variant;
  accentColor?: string;
  mutedColor?: string;
  style?: StyleProp<ViewStyle>;
  featureTextStyle?: StyleProp<TextStyle>;
  secondaryTextStyle?: StyleProp<TextStyle>;
};

function CheckRow({
  text,
  accent,
  textStyle,
  secondary,
  secondaryStyle,
}: {
  text: string;
  accent: string;
  textStyle?: StyleProp<TextStyle>;
  secondary?: boolean;
  secondaryStyle?: StyleProp<TextStyle>;
}) {
  const iconSize = secondary ? 16 : 18;

  return (
    <View style={[styles.featureRow, secondary && styles.featureRowSecondary]}>
      <View style={[styles.iconWrap, { width: iconSize, height: iconSize }]}>
        <SymbolView
          name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
          tintColor={accent}
          size={iconSize}
        />
      </View>
      <Text
        style={[
          styles.featureText,
          secondary && styles.featureTextSecondary,
          textStyle,
          secondaryStyle,
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

export function ProPlanFeaturesList({
  variant = 'full',
  accentColor = SmartCartColors.primary,
  mutedColor = SmartCartColors.textMuted,
  style,
  featureTextStyle,
  secondaryTextStyle,
}: Props) {
  if (variant === 'grouped') {
    return (
      <View style={[styles.list, style]}>
        {PRO_PLAN_FEATURE_GROUPS.map((group) => (
          <View key={group.title} style={styles.group}>
            <Text style={[styles.groupTitle, { color: accentColor }]}>{group.title}</Text>
            {group.items.map((item) => (
              <CheckRow
                key={item}
                text={item}
                accent={mutedColor}
                secondary
                textStyle={featureTextStyle}
                secondaryStyle={secondaryTextStyle}
              />
            ))}
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={[styles.list, style]}>
      {PRO_PLAN_FEATURES.map((feature) => (
        <CheckRow key={feature} text={feature} accent={accentColor} textStyle={featureTextStyle} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10, paddingRight: 4 },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    width: '100%',
  },
  featureRowSecondary: { paddingLeft: 2, gap: 8 },
  iconWrap: {
    flexShrink: 0,
    marginTop: 1,
  },
  featureText: {
    flex: 1,
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  featureTextSecondary: {
    fontSize: 13,
    lineHeight: 19,
    opacity: 0.85,
  },
  group: { gap: 8, marginBottom: 6 },
  groupTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 0.2, marginBottom: 2 },
});
