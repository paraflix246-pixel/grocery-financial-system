import { StyleSheet, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Text } from '@/components/Themed';
import {
  PRO_CARD_FRAMING,
  PRO_PLAN_FEATURE_DETAILS,
  PRO_PLAN_FEATURE_GROUPS,
  PRO_PLAN_FEATURES,
} from '@/src/constants/proPricing';
import { SmartCartColors } from '@/src/theme/smartCart';

type Variant = 'full' | 'grouped' | 'premium';

type Props = {
  variant?: Variant;
  accentColor?: string;
  mutedColor?: string;
  framingText?: string;
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

function PremiumFeatureRow({
  upgradeLabel,
  text,
  freeLimit,
  accentColor,
  mutedColor,
  textStyle,
}: {
  upgradeLabel: string;
  text: string;
  freeLimit?: string;
  accentColor: string;
  mutedColor: string;
  textStyle?: StyleProp<TextStyle>;
}) {
  return (
    <View style={styles.premiumRow}>
      <View style={[styles.upgradeBadge, { borderColor: `${accentColor}55`, backgroundColor: `${accentColor}18` }]}>
        <Text style={[styles.upgradeBadgeText, { color: accentColor }]}>{upgradeLabel}</Text>
      </View>
      <View style={styles.premiumTextCol}>
        <Text style={[styles.premiumFeatureText, textStyle]}>{text}</Text>
        {freeLimit ? (
          <Text style={[styles.freeLimitText, { color: mutedColor }]}>Free: {freeLimit}</Text>
        ) : null}
      </View>
    </View>
  );
}

export function ProPlanFeaturesList({
  variant = 'full',
  accentColor = SmartCartColors.primary,
  mutedColor = SmartCartColors.textMuted,
  framingText = PRO_CARD_FRAMING,
  style,
  featureTextStyle,
  secondaryTextStyle,
}: Props) {
  if (variant === 'premium') {
    return (
      <View style={[styles.list, style]}>
        <Text style={[styles.framingText, { color: mutedColor }]}>{framingText}</Text>
        {PRO_PLAN_FEATURE_DETAILS.map((feature) => (
          <PremiumFeatureRow
            key={feature.text}
            upgradeLabel={feature.upgradeLabel}
            text={feature.text}
            freeLimit={feature.freeLimit}
            accentColor={accentColor}
            mutedColor={mutedColor}
            textStyle={featureTextStyle}
          />
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
      {PRO_PLAN_FEATURES.map((feature) => (
        <CheckRow key={feature} text={feature} accent={accentColor} textStyle={featureTextStyle} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10, paddingRight: 4 },
  framingText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    marginBottom: 2,
  },
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
  premiumRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    width: '100%',
  },
  upgradeBadge: {
    flexShrink: 0,
    marginTop: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 72,
    alignItems: 'center',
  },
  upgradeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  premiumTextCol: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    gap: 2,
  },
  premiumFeatureText: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
    color: '#FFFFFF',
  },
  freeLimitText: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '500',
  },
  group: { gap: 8, marginBottom: 6 },
  groupTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 0.2, marginBottom: 2 },
});
