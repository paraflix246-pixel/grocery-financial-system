import { useRouter } from 'expo-router';
import React, { type ReactNode } from 'react';
import { Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PennyPantryLogo } from '@/src/components/PennyPantryLogo';

const BG = '#0F0F0F';
const PURPLE = '#7C3AED';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_MUTED = 'rgba(255,255,255,0.52)';

export type LegalHref = '/privacy' | '/terms' | '/copyright' | '/privacy-request';

type RelatedPage = {
  label: string;
  href: LegalHref;
};

type FooterLink = {
  label: string;
  href: LegalHref;
};

type Props = {
  title: string;
  lastUpdated: string;
  relatedPage?: RelatedPage;
  footerLinks?: FooterLink[];
  children: ReactNode;
};

export function LegalPageLayout({ title, lastUpdated, relatedPage, footerLinks, children }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <PennyPantryLogo variant="inline" size={24} nameColor={PURPLE} style={styles.logoRow} />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.updated}>Last updated: {lastUpdated}</Text>
        {children}
        {relatedPage || footerLinks?.length ? (
          <View style={styles.footerLinks}>
            {relatedPage ? (
              <View style={styles.relatedRow}>
                <Text style={styles.relatedText}>See also: </Text>
                <Pressable
                  onPress={() => router.push(relatedPage.href)}
                  accessibilityRole="link"
                  accessibilityLabel={relatedPage.label}
                >
                  <Text style={styles.relatedLink}>{relatedPage.label}</Text>
                </Pressable>
              </View>
            ) : null}
            {footerLinks?.map((link) => (
              <Pressable
                key={link.href}
                onPress={() => router.push(link.href)}
                accessibilityRole="link"
                accessibilityLabel={link.label}
                style={styles.footerLinkRow}
              >
                <Text style={styles.relatedLink}>{link.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

export function LegalSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>{heading}</Text>
      <Text style={styles.body}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  scrollContent: {
    paddingHorizontal: 24,
    flexGrow: 1,
  },
  logoRow: {
    marginBottom: 24,
  },
  title: {
    color: TEXT_PRIMARY,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  updated: {
    color: TEXT_MUTED,
    fontSize: 13,
    marginBottom: 28,
  },
  section: {
    marginBottom: 22,
    gap: 8,
  },
  heading: {
    color: TEXT_PRIMARY,
    fontSize: 17,
    fontWeight: '700',
  },
  body: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 15,
    lineHeight: 24,
  },
  footerLinks: {
    marginTop: 8,
    paddingTop: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.12)',
    gap: 10,
  },
  relatedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  footerLinkRow: {
    alignSelf: 'flex-start',
  },
  relatedText: {
    color: TEXT_MUTED,
    fontSize: 14,
  },
  relatedLink: {
    color: PURPLE,
    fontSize: 14,
    fontWeight: '600',
  },
});
