import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';

import { Text } from '@/components/Themed';
import { useDevFamilyPreview } from '@/src/hooks/useDevFamilyPreview';
import { disableDevFamilyWorkspacePreview } from '@/src/services/devFamilyWorkspacePreview';
import { FamilyWorkspaceTheme } from '@/src/theme/familyWorkspaceTheme';
import { SmartCartRadius } from '@/src/theme/smartCart';

/** DEV-only banner shown while Household preview mode is active. */
export function DevFamilyPreviewBanner() {
  const { t } = useTranslation();
  const router = useRouter();
  const { active, refresh } = useDevFamilyPreview();
  const family = FamilyWorkspaceTheme;

  if (!__DEV__ || !active) return null;

  const handleDisable = () => {
    void disableDevFamilyWorkspacePreview().then(() => {
      void refresh();
      router.replace('/(tabs)' as never);
    });
  };

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View
        style={[
          styles.banner,
          { backgroundColor: family.bannerBg, borderColor: family.bannerBorder },
        ]}>
        <SymbolView
          name={{ ios: 'person.3.fill', android: 'groups', web: 'groups' }}
          tintColor={family.accent}
          size={16}
        />
        <View style={styles.textBlock}>
          <Text style={[styles.title, { color: family.accent }]}>{t('devFamilyPreview.activeBannerTitle')}</Text>
          <Text style={styles.body}>{t('devFamilyPreview.activeBannerBody')}</Text>
        </View>
        <Pressable style={styles.exitBtn} onPress={handleDisable} accessibilityRole="button">
          <Text style={styles.exitBtnText}>{t('devFamilyPreview.exitPreview')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 12,
    paddingTop: 6,
    zIndex: 20,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: SmartCartRadius.md,
    borderWidth: 1,
  },
  textBlock: { flex: 1, gap: 2 },
  title: { fontSize: 13, fontWeight: '800' },
  body: { fontSize: 12, lineHeight: 16, color: 'rgba(255, 251, 235, 0.78)' },
  exitBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: SmartCartRadius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  exitBtnText: { fontSize: 11, fontWeight: '700', color: '#FFF' },
});
