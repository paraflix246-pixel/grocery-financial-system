import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { OnboardingColors, OnboardingShadow } from '@/src/theme/onboardingTheme';

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.phoneOuter}>
      <View style={styles.phoneNotch} />
      <View style={styles.phoneScreen}>{children}</View>
    </View>
  );
}

export function SavingsSlideVisual() {
  return (
    <View style={styles.visualRoot}>
      <View style={styles.floatingBadgeLeft}>
        <Text style={styles.floatingDollar}>$</Text>
      </View>
      <View style={styles.floatingBadgeRight}>
        <Text style={styles.floatingDollar}>$</Text>
      </View>
      <PhoneFrame>
        <Text style={styles.phoneHeader}>Shop Summary</Text>
        <Text style={styles.phoneTotalLabel}>Total</Text>
        <Text style={styles.phoneTotalValue}>$84.67</Text>
        <View style={styles.savingsBanner}>
          <Text style={styles.savingsBannerText}>
            You saved <Text style={styles.savingsBold}>$12.40</Text> vs. regular prices
          </Text>
        </View>
        {[
          { name: 'Milk', save: '-$1.20' },
          { name: 'Bread', save: '-$0.85' },
          { name: 'Eggs', save: '-$1.10' },
        ].map((item) => (
          <View key={item.name} style={styles.listRow}>
            <Text style={styles.listName}>{item.name}</Text>
            <Text style={styles.listSave}>{item.save}</Text>
          </View>
        ))}
        <View style={styles.celebrationPill}>
          <Text style={styles.celebrationText}>Great job! You saved 15% 🎉</Text>
        </View>
      </PhoneFrame>
    </View>
  );
}

export function CompareSlideVisual() {
  return (
    <View style={styles.visualRoot}>
      <View style={styles.realtimePill}>
        <Text style={styles.realtimeIcon}>🕐</Text>
        <Text style={styles.realtimeText}>Prices updated real time</Text>
      </View>
      <View style={[styles.storeTag, styles.walmartTag]}>
        <Text style={styles.storeTagName}>Walmart</Text>
        <Text style={styles.storeTagPrice}>$2.48</Text>
      </View>
      <View style={[styles.storeTag, styles.targetTag]}>
        <Text style={styles.storeTagCrown}>👑</Text>
        <Text style={styles.storeTagName}>Target</Text>
        <Text style={styles.storeTagPriceBest}>$1.89</Text>
      </View>
      <PhoneFrame>
        <View style={styles.scanArea}>
          <View style={styles.barcodeLines}>
            {Array.from({ length: 8 }).map((_, i) => (
              <View
                key={i}
                style={[styles.barcodeLine, { height: 12 + (i % 3) * 8 }]}
              />
            ))}
          </View>
          <Text style={styles.scanLabel}>Scanning…</Text>
        </View>
        <View style={styles.productCard}>
          <Text style={styles.productEmoji}>🥛</Text>
          <View>
            <Text style={styles.productName}>Whole Milk</Text>
            <Text style={styles.productSize}>1 gal</Text>
          </View>
        </View>
      </PhoneFrame>
      <View style={styles.saveCallout}>
        <Text style={styles.saveCalloutText}>
          Save <Text style={styles.savingsBold}>$0.59</Text> per item
        </Text>
      </View>
    </View>
  );
}

export function ListSlideVisual() {
  const categories = [
    { label: 'Produce', items: ['Bananas', 'Spinach'] },
    { label: 'Dairy', items: ['Milk', 'Eggs'] },
    { label: 'Bakery', items: ['Bread'] },
  ];

  return (
    <View style={styles.visualRoot}>
      <View style={[styles.suggestionChip, styles.suggestionTop]}>
        <Text style={styles.suggestionText}>Low in pantry: Add milk? +</Text>
      </View>
      <View style={[styles.suggestionChip, styles.suggestionLeft]}>
        <Text style={styles.suggestionText}>Suggested: Eggs +</Text>
      </View>
      <View style={[styles.suggestionChip, styles.suggestionRight]}>
        <Text style={styles.suggestionText}>Popular: Oat Milk +</Text>
      </View>
      <PhoneFrame>
        <Text style={styles.phoneHeader}>My List</Text>
        {categories.map((cat) => (
          <View key={cat.label} style={styles.categoryBlock}>
            <Text style={styles.categoryLabel}>{cat.label}</Text>
            {cat.items.map((item) => (
              <View key={item} style={styles.checkRow}>
                <View style={styles.checkbox} />
                <Text style={styles.checkLabel}>{item}</Text>
              </View>
            ))}
          </View>
        ))}
        <View style={styles.addItemBtn}>
          <Text style={styles.addItemText}>Add item</Text>
        </View>
      </PhoneFrame>
    </View>
  );
}

export function SignupHeroVisual() {
  return (
    <View style={styles.heroRoot}>
      <View style={[styles.heroFloat, styles.heroFloatTag]}>
        <Text style={styles.heroFloatEmoji}>🏷️</Text>
      </View>
      <View style={[styles.heroFloat, styles.heroFloatChart]}>
        <Text style={styles.heroFloatEmoji}>📊</Text>
      </View>
      <View style={[styles.heroFloat, styles.heroFloatCheck]}>
        <Text style={styles.heroFloatEmoji}>✅</Text>
      </View>
      <View style={styles.basketCircle}>
        <Text style={styles.basketEmoji}>🧺</Text>
        <View style={styles.basketItems}>
          <Text style={styles.basketItemEmoji}>🥛</Text>
          <Text style={styles.basketItemEmoji}>🍞</Text>
          <Text style={styles.basketItemEmoji}>🍎</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  visualRoot: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 280,
    width: '100%',
    paddingHorizontal: 8,
  },
  phoneOuter: {
    width: 200,
    backgroundColor: OnboardingColors.text,
    borderRadius: 28,
    padding: 8,
    ...OnboardingShadow.card,
  },
  phoneNotch: {
    alignSelf: 'center',
    width: 56,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginBottom: 6,
  },
  phoneScreen: {
    backgroundColor: OnboardingColors.card,
    borderRadius: 20,
    padding: 14,
    minHeight: 220,
  },
  phoneHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: OnboardingColors.text,
    marginBottom: 8,
  },
  phoneTotalLabel: {
    fontSize: 11,
    color: OnboardingColors.textMuted,
  },
  phoneTotalValue: {
    fontSize: 22,
    fontWeight: '800',
    color: OnboardingColors.text,
    marginBottom: 10,
  },
  savingsBanner: {
    backgroundColor: OnboardingColors.greenBanner,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.25)',
  },
  savingsBannerText: {
    fontSize: 11,
    color: OnboardingColors.greenDark,
    lineHeight: 16,
  },
  savingsBold: {
    fontWeight: '800',
  },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: OnboardingColors.border,
  },
  listName: {
    fontSize: 12,
    color: OnboardingColors.text,
  },
  listSave: {
    fontSize: 12,
    fontWeight: '700',
    color: OnboardingColors.green,
  },
  celebrationPill: {
    marginTop: 10,
    backgroundColor: OnboardingColors.greenSoft,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  celebrationText: {
    fontSize: 10,
    fontWeight: '600',
    color: OnboardingColors.greenDark,
  },
  floatingBadgeLeft: {
    position: 'absolute',
    left: 24,
    top: 40,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: OnboardingColors.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  floatingBadgeRight: {
    position: 'absolute',
    right: 24,
    top: 60,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: OnboardingColors.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  floatingDollar: {
    fontSize: 16,
    fontWeight: '800',
    color: OnboardingColors.green,
  },
  realtimePill: {
    position: 'absolute',
    top: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: OnboardingColors.card,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: OnboardingColors.border,
    zIndex: 2,
    ...OnboardingShadow.cardSoft,
  },
  realtimeIcon: {
    fontSize: 12,
  },
  realtimeText: {
    fontSize: 11,
    fontWeight: '600',
    color: OnboardingColors.textMuted,
  },
  storeTag: {
    position: 'absolute',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    zIndex: 2,
    ...OnboardingShadow.cardSoft,
  },
  walmartTag: {
    top: 36,
    left: 16,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: 'rgba(0,113,206,0.2)',
  },
  targetTag: {
    top: 48,
    right: 16,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: 'rgba(204,0,0,0.2)',
    alignItems: 'center',
  },
  storeTagCrown: {
    fontSize: 10,
    marginBottom: 2,
  },
  storeTagName: {
    fontSize: 10,
    fontWeight: '700',
    color: OnboardingColors.text,
  },
  storeTagPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: OnboardingColors.walmart,
  },
  storeTagPriceBest: {
    fontSize: 14,
    fontWeight: '800',
    color: OnboardingColors.target,
  },
  scanArea: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  barcodeLines: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    marginBottom: 8,
  },
  barcodeLine: {
    width: 4,
    backgroundColor: OnboardingColors.text,
    borderRadius: 1,
  },
  scanLabel: {
    fontSize: 11,
    color: OnboardingColors.textMuted,
    fontWeight: '600',
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: OnboardingColors.greenSoft,
    borderRadius: 10,
    padding: 10,
  },
  productEmoji: {
    fontSize: 24,
  },
  productName: {
    fontSize: 12,
    fontWeight: '700',
    color: OnboardingColors.text,
  },
  productSize: {
    fontSize: 10,
    color: OnboardingColors.textMuted,
  },
  saveCallout: {
    position: 'absolute',
    bottom: 8,
    backgroundColor: OnboardingColors.green,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 16,
    ...OnboardingShadow.pill,
  },
  saveCalloutText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  suggestionChip: {
    position: 'absolute',
    backgroundColor: OnboardingColors.card,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: OnboardingColors.border,
    zIndex: 2,
    maxWidth: 160,
    ...OnboardingShadow.cardSoft,
  },
  suggestionTop: {
    top: 0,
    alignSelf: 'center',
  },
  suggestionLeft: {
    left: 8,
    top: 100,
  },
  suggestionRight: {
    right: 8,
    top: 80,
  },
  suggestionText: {
    fontSize: 10,
    fontWeight: '600',
    color: OnboardingColors.greenDark,
  },
  categoryBlock: {
    marginBottom: 8,
  },
  categoryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: OnboardingColors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 3,
  },
  checkbox: {
    width: 14,
    height: 14,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: OnboardingColors.green,
  },
  checkLabel: {
    fontSize: 12,
    color: OnboardingColors.text,
  },
  addItemBtn: {
    marginTop: 8,
    backgroundColor: OnboardingColors.green,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
  },
  addItemText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroRoot: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 160,
    width: '100%',
    marginBottom: 8,
  },
  basketCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: OnboardingColors.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(34,197,94,0.2)',
    ...OnboardingShadow.glow,
  },
  basketEmoji: {
    fontSize: 48,
  },
  basketItems: {
    position: 'absolute',
    bottom: 18,
    flexDirection: 'row',
    gap: 4,
  },
  basketItemEmoji: {
    fontSize: 16,
  },
  heroFloat: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: OnboardingColors.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...OnboardingShadow.cardSoft,
  },
  heroFloatTag: {
    top: 20,
    left: '18%',
  },
  heroFloatChart: {
    top: 8,
    right: '20%',
  },
  heroFloatCheck: {
    bottom: 16,
    right: '22%',
  },
  heroFloatEmoji: {
    fontSize: 18,
  },
});
