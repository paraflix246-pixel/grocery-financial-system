import React, { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import {
  OnboardingColors,
  OnboardingSlideAccent,
} from '@/src/theme/onboardingTheme';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

export type FeatureSlideData = {
  key: string;
  icon: SymbolName;
  titleParts: [string, string];
  subtitle: string;
  accent: OnboardingSlideAccent;
};

export function OnboardingFeatureSlide({ slide }: { slide: FeatureSlideData }) {
  return (
    <View style={styles.container}>
      <View style={[styles.iconCircle, { backgroundColor: slide.accent.iconBg }]}>
        <SymbolView name={slide.icon} size={44} tintColor={slide.accent.iconTint} />
      </View>
      <Text style={styles.title}>
        {slide.titleParts[0]}
        {'\n'}
        <Text style={styles.titleAccent}>{slide.titleParts[1]}</Text>
      </Text>
      <Text style={styles.subtitle} numberOfLines={2}>
        {slide.subtitle}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
  },
  title: {
    color: OnboardingColors.text,
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.8,
    lineHeight: 40,
    marginBottom: 14,
  },
  titleAccent: {
    color: OnboardingColors.green,
  },
  subtitle: {
    color: OnboardingColors.textMuted,
    fontSize: 17,
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: 300,
  },
});
