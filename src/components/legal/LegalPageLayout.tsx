import React, { type ReactNode } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BG = '#0F0F0F';
const PURPLE = '#7C3AED';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_MUTED = 'rgba(255,255,255,0.52)';

type Props = {
  title: string;
  lastUpdated: string;
  children: ReactNode;
};

export function LegalPageLayout({ title, lastUpdated, children }: Props) {
  const insets = useSafeAreaInsets();

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
        <View style={styles.logoRow}>
          <Text style={styles.logoEmoji}>🛒</Text>
          <Text style={styles.logoName}>Penny Pantry</Text>
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.updated}>Last updated: {lastUpdated}</Text>
        {children}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  logoEmoji: {
    fontSize: 24,
  },
  logoName: {
    color: PURPLE,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.3,
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
});
