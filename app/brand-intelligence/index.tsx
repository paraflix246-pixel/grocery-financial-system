import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Text } from '@/components/Themed';
import { ItemEmojiAvatar } from '@/src/components/ItemEmojiAvatar';
import { HorizontalScrollRow } from '@/src/components/HorizontalScrollRow';
import { MockupCard, MockupScreenTitle, MockupSearchBar } from '@/src/components/mockup/MockupUI';
import { ProUpgradeBanner } from '@/src/components/ProUpgradeBanner';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { useFeatureGate } from '@/src/hooks/useFeatureGate';
import type { BrandOwnershipEntry } from '@/src/data/brandData';
import {
  getMatchTypeLabel,
  getPopularBrandEntries,
  searchBrandIntelligence,
  type BrandIntelligenceResult,
} from '@/src/services/brandIntelligenceService';
import { getFeatureLabel } from '@/src/services/featureGateService';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';

const BRAND_EMOJI: Record<string, string> = {
  Oreo: '🍪',
  Cheerios: '🥣',
  Kraft: '🧀',
  Tide: '🧴',
  'Coca-Cola': '🥤',
  'Great Value': '🛒',
  'Kirkland Signature': '📦',
  Ritz: '🍘',
  Heinz: '🍅',
  Sprite: '🥤',
  Pampers: '👶',
  Gillette: '🪒',
  Crest: '🦷',
  Bounty: '🧻',
  'Nature Valley': '🌾',
  Philadelphia: '🧀',
  'Oscar Mayer': '🌭',
  Equate: '💊',
  "Sam's Choice": '🛒',
};

function brandEmoji(brand: string): string {
  return BRAND_EMOJI[brand] ?? '🏷️';
}

function BrandResultCard({
  result,
  onBrandPress,
}: {
  result: BrandIntelligenceResult;
  onBrandPress: (brand: string) => void;
}) {
  const { entry, matchType, matchedOn, siblingBrands, sameParentBrands, alternativeBrands } = result;

  return (
    <>
      <MockupCard style={styles.resultCard}>
        <View style={styles.matchBadge}>
          <Text style={styles.matchBadgeText}>{getMatchTypeLabel(matchType)}</Text>
          {matchType !== 'brand' ? (
            <Text style={styles.matchSubtext}>Matched on “{matchedOn}”</Text>
          ) : null}
        </View>
        <View style={styles.brandHeader}>
          <ItemEmojiAvatar emoji={brandEmoji(entry.brand)} size="lg" shape="square" />
          <View style={styles.brandHeaderText}>
            <Text style={styles.brandName}>{entry.brand}</Text>
            <Text style={styles.ownerLabel}>Owned by</Text>
            <Text style={styles.ownerName}>{entry.owner}</Text>
            {entry.category ? <Text style={styles.categoryLabel}>{entry.category}</Text> : null}
          </View>
        </View>
        {siblingBrands.length > 0 ? (
          <>
            <Text style={styles.inlineSectionTitle}>Sibling brands</Text>
            <View style={styles.subsidiaryRow}>
              {siblingBrands.map((sub) => (
                <Pressable
                  key={sub}
                  style={({ pressed }) => [styles.subsidiaryChip, pressed && styles.chipPressed]}
                  onPress={() => onBrandPress(sub)}>
                  <Text style={styles.subsidiaryText}>{sub}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}
      </MockupCard>

      {sameParentBrands.length > 0 ? (
        <RecommendationSection
          title="Same parent company"
          subtitle={`Other brands owned by ${entry.owner}`}
          entries={sameParentBrands}
          onBrandPress={onBrandPress}
        />
      ) : null}

      {alternativeBrands.length > 0 ? (
        <RecommendationSection
          title="You might also like"
          subtitle={`Alternatives in ${entry.category ?? 'this category'}`}
          entries={alternativeBrands}
          onBrandPress={onBrandPress}
        />
      ) : null}
    </>
  );
}

function RecommendationSection({
  title,
  subtitle,
  entries,
  onBrandPress,
}: {
  title: string;
  subtitle: string;
  entries: BrandOwnershipEntry[];
  onBrandPress: (brand: string) => void;
}) {
  return (
    <View style={styles.recSection}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      {entries.map((entry) => (
        <Pressable
          key={entry.brand}
          style={({ pressed }) => [styles.recRow, pressed && styles.recRowPressed]}
          onPress={() => onBrandPress(entry.brand)}>
          <ItemEmojiAvatar emoji={brandEmoji(entry.brand)} size="sm" shape="square" />
          <View style={styles.recRowText}>
            <Text style={styles.recBrand}>{entry.brand}</Text>
            <Text style={styles.recOwner}>{entry.owner}</Text>
          </View>
          <SymbolView
            name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
            tintColor={SmartCartColors.textMuted}
            size={14}
          />
        </Pressable>
      ))}
    </View>
  );
}

function PopularBrandChips({
  brands,
  onSelect,
}: {
  brands: BrandOwnershipEntry[];
  onSelect: (brand: string) => void;
}) {
  return (
    <HorizontalScrollRow contentContainerStyle={styles.logoRow}>
      {brands.map((brand) => (
        <Pressable
          key={brand.brand}
          style={({ pressed }) => [styles.logoCard, pressed && styles.logoCardPressed]}
          onPress={() => onSelect(brand.brand)}>
          <ItemEmojiAvatar emoji={brandEmoji(brand.brand)} size="md" shape="square" />
          <Text style={styles.logoLabel}>{brand.brand}</Text>
        </Pressable>
      ))}
    </HorizontalScrollRow>
  );
}

export default function BrandIntelligenceScreen() {
  const router = useRouter();
  const { unlocked, requestAccess } = useFeatureGate('insights_pro');
  const [searchQuery, setSearchQuery] = useState('');
  const popularBrands = getPopularBrandEntries();

  const trimmedQuery = searchQuery.trim();
  const hasQuery = trimmedQuery.length > 0;

  const searchResult = useMemo(() => {
    if (!hasQuery || !unlocked) return null;
    return searchBrandIntelligence(trimmedQuery);
  }, [hasQuery, trimmedQuery, unlocked]);

  const handleSearchChange = (text: string) => {
    if (!unlocked && text.trim().length > 0) {
      if (!requestAccess()) return;
    }
    setSearchQuery(text);
  };

  const handleBrandSelect = (brand: string) => {
    if (!unlocked && !requestAccess()) return;
    setSearchQuery(brand);
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Brand Intelligence" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <MockupScreenTitle
          title="Brand Intelligence"
          subtitle="Search a product or brand to see who owns it"
        />

        {!unlocked && <ProUpgradeBanner featureName={getFeatureLabel('insights_pro')} />}

        <MockupSearchBar
          value={searchQuery}
          onChangeText={handleSearchChange}
          placeholder="Search product or brand (e.g. Oreo, Tide pods)"
        />

        {hasQuery && unlocked && searchResult ? (
          <BrandResultCard result={searchResult} onBrandPress={handleBrandSelect} />
        ) : null}

        {hasQuery && unlocked && !searchResult ? (
          <View style={styles.emptyState}>
            <SymbolView
              name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
              tintColor={SmartCartColors.textMuted}
              size={32}
            />
            <Text style={styles.emptyTitle}>No brand match found</Text>
            <Text style={styles.emptyBody}>
              We couldn&apos;t find ownership info for “{trimmedQuery}” in our catalog yet. Try a
              brand name or a popular product below.
            </Text>
            <Text style={styles.emptyHint}>
              Future: Open Food Facts API lookup for unknown products.
            </Text>
            <Text style={styles.sectionTitle}>Popular brands</Text>
            <PopularBrandChips brands={popularBrands} onSelect={handleBrandSelect} />
          </View>
        ) : null}

        {!hasQuery ? (
          <>
            <Text style={styles.sectionTitle}>Popular brands</Text>
            <PopularBrandChips brands={popularBrands} onSelect={handleBrandSelect} />

            <Text style={styles.sectionTitle}>Browse catalog</Text>
            {popularBrands.slice(0, 4).map((entry) => (
              <Pressable
                key={entry.brand}
                onPress={() => handleBrandSelect(entry.brand)}
                style={({ pressed }) => [pressed && styles.cardPressed]}>
                <MockupCard>
                  <View style={styles.brandHeader}>
                    <ItemEmojiAvatar emoji={brandEmoji(entry.brand)} size="lg" shape="square" />
                    <View style={styles.brandHeaderText}>
                      <Text style={styles.brandName}>{entry.brand}</Text>
                      <Text style={styles.ownerLabel}>Owned by</Text>
                      <Text style={styles.ownerName}>{entry.owner}</Text>
                      {entry.category ? (
                        <Text style={styles.categoryLabel}>{entry.category}</Text>
                      ) : null}
                    </View>
                  </View>
                  <View style={styles.subsidiaryRow}>
                    {entry.relatedBrands.slice(0, 3).map((sub) => (
                      <View key={sub} style={styles.subsidiaryChip}>
                        <Text style={styles.subsidiaryText}>{sub}</Text>
                      </View>
                    ))}
                  </View>
                </MockupCard>
              </Pressable>
            ))}
          </>
        ) : null}

        <Pressable
          style={({ pressed }) => [styles.premiumBanner, pressed && styles.premiumBannerPressed]}
          onPress={() => router.push('/paywall' as never)}>
          <View style={styles.premiumIcon}>
            <SymbolView name={{ ios: 'star.fill', android: 'star', web: 'star' }} tintColor="#fff" size={20} />
          </View>
          <View style={styles.premiumText}>
            <Text style={styles.premiumTitle}>Go Premium</Text>
            <Text style={styles.premiumSub}>Unlock full brand ownership maps & corporate insights</Text>
          </View>
          <SymbolView
            name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
            tintColor="#fff"
            size={16}
          />
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SmartCartColors.background },
  content: { padding: 16, paddingBottom: 40, gap: 4 },
  resultCard: { marginTop: 8 },
  matchBadge: {
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: SmartCartColors.border,
  },
  matchBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: SmartCartColors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  matchSubtext: { fontSize: 12, color: SmartCartColors.textSecondary, marginTop: 2 },
  brandHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 },
  brandHeaderText: { flex: 1 },
  brandName: { fontSize: 20, fontWeight: '800', color: SmartCartColors.text },
  ownerLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: SmartCartColors.textMuted,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  ownerName: { fontSize: 15, fontWeight: '700', color: SmartCartColors.primaryDark, marginTop: 2 },
  categoryLabel: { fontSize: 12, fontWeight: '600', color: SmartCartColors.textSecondary, marginTop: 4 },
  inlineSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: SmartCartColors.text,
    marginBottom: 8,
  },
  subsidiaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  subsidiaryChip: {
    backgroundColor: SmartCartColors.badge,
    borderRadius: SmartCartRadius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  subsidiaryText: { fontSize: 12, fontWeight: '600', color: SmartCartColors.primaryDark },
  chipPressed: { opacity: 0.75 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: SmartCartColors.text, marginBottom: 8, marginTop: 12 },
  sectionSubtitle: { fontSize: 13, color: SmartCartColors.textSecondary, marginBottom: 10, marginTop: -4 },
  recSection: { marginTop: 4 },
  recRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.lg,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
  },
  recRowPressed: { opacity: 0.88 },
  recRowText: { flex: 1 },
  recBrand: { fontSize: 15, fontWeight: '700', color: SmartCartColors.text },
  recOwner: { fontSize: 12, color: SmartCartColors.textSecondary, marginTop: 2 },
  logoRow: { gap: 10, paddingBottom: 8 },
  logoCard: {
    alignItems: 'center',
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.lg,
    padding: 12,
    width: 80,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    ...SmartCartShadow.cardSoft,
  },
  logoCardPressed: { opacity: 0.88 },
  logoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: SmartCartColors.textSecondary,
    marginTop: 6,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 8,
    gap: 8,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: SmartCartColors.text, marginTop: 8 },
  emptyBody: { fontSize: 14, color: SmartCartColors.textSecondary, textAlign: 'center', lineHeight: 20 },
  emptyHint: {
    fontSize: 12,
    color: SmartCartColors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  cardPressed: { opacity: 0.92 },
  premiumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: SmartCartColors.primaryDark,
    borderRadius: SmartCartRadius.lg,
    padding: 16,
    marginTop: 16,
    ...SmartCartShadow.fab,
  },
  premiumBannerPressed: { opacity: 0.92 },
  premiumIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumText: { flex: 1 },
  premiumTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  premiumSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
});
