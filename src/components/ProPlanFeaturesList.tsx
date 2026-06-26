import { useState } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Text } from '@/components/Themed';
import {
  PRO_PLAN_FEATURE_GROUPS,
  PRO_PLAN_HEADLINE_FEATURES,
  PRO_PLAN_FEATURES,
} from '@/src/constants/proPricing';
import { SmartCartColors } from '@/src/theme/smartCart';

type Variant = 'compact' | 'grouped' | 'full';

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
  return (
    <View style={[styles.featureRow, secondary && styles.featureRowSecondary]}>
      <SymbolView
        name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
        tintColor={accent}
        size={secondary ? 16 : 18}
      />
      <Text style={[styles.featureText, secondary && styles.featureTextSecondary, textStyle, secondaryStyle]}>
        {text}
      </Text>
    </View>
  );
}

export function ProPlanFeaturesList({
  variant = 'compact',
  accentColor = SmartCartColors.primary,
  mutedColor = SmartCartColors.textMuted,
  style,
  featureTextStyle,
  secondaryTextStyle,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  if (variant === 'full') {
    return (
      <View style={[styles.list, style]}>
        {PRO_PLAN_FEATURES.map((feature) => (
          <CheckRow key={feature} text={feature} accent={accentColor} textStyle={featureTextStyle} />
        ))}
      </View>
    );
  }

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
      {expanded ? (
        <View style={styles.expandedBlock}>
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
      ) : (
        PRO_PLAN_HEADLINE_FEATURES.map((feature) => (
          <CheckRow key={feature} text={feature} accent={accentColor} textStyle={featureTextStyle} />
        ))
      )}

      <Pressable
        onPress={() => setExpanded((value) => !value)}
        style={styles.expandBtn}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <Text style={[styles.expandText, { color: accentColor }]}>
          {expanded ? 'Show less' : 'See all Pro features'}
        </Text>
        <SymbolView
          name={{
            ios: expanded ? 'chevron.up' : 'chevron.down',
            android: expanded ? 'expand_less' : 'expand_more',
            web: expanded ? 'expand_less' : 'expand_more',
          }}
          tintColor={accentColor}
          size={14}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureRowSecondary: { paddingLeft: 2, gap: 8 },
  featureText: { flex: 1, fontSize: 14, lineHeight: 20 },
  featureTextSecondary: { fontSize: 13, lineHeight: 18, opacity: 0.85 },
  expandedBlock: { gap: 10 },
  expandBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, paddingVertical: 4 },
  expandText: { fontSize: 13, fontWeight: '600' },
  group: { gap: 6, marginBottom: 4 },
  groupTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 0.2, marginBottom: 2 },
});
