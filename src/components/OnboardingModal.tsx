import { Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Themed';

const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 72;

const SLIDES = [
  {
    title: 'Plan your shop',
    body: 'Add items and expected prices before you go.',
    emoji: '📝',
  },
  {
    title: 'Scan what you bought',
    body: 'Snap your receipt — we structure it for you.',
    emoji: '📸',
  },
  {
    title: 'See plan vs reality',
    body: 'Know exactly where you overspent and why.',
    emoji: '📊',
  },
];

type OnboardingModalProps = {
  visible: boolean;
  onComplete: () => void;
};

function OnboardingContent({ onComplete }: { onComplete: () => void }) {
  return (
    <View style={styles.backdrop} pointerEvents="box-none">
      <View style={styles.dimmer} pointerEvents="auto" />
      <View style={styles.sheet} pointerEvents="auto">
        <ScrollView contentContainerStyle={styles.content}>
          {SLIDES.map((slide, i) => (
            <View key={slide.title} style={styles.slide}>
              <Text style={styles.emoji}>{slide.emoji}</Text>
              <Text style={styles.step}>Step {i + 1}</Text>
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.body}>{slide.body}</Text>
            </View>
          ))}
        </ScrollView>
        <Pressable style={styles.button} onPress={onComplete}>
          <Text style={styles.buttonText}>Get Started</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function OnboardingModal({ visible, onComplete }: OnboardingModalProps) {
  if (!visible) return null;

  // RN Web Modal portals can leave invisible fullscreen layers that eat clicks.
  if (Platform.OS === 'web') {
    return <OnboardingContent onComplete={onComplete} />;
  }

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onComplete}>
      <OnboardingContent onComplete={onComplete} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    ...(Platform.OS === 'web'
      ? {
          position: 'fixed' as const,
          top: 0,
          right: 0,
          left: 0,
          bottom: TAB_BAR_HEIGHT,
          zIndex: 50,
        }
      : null),
  },
  dimmer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: Platform.OS === 'web' ? '75%' : '85%',
    paddingBottom: 32,
  },
  content: { padding: 24 },
  slide: { marginBottom: 28, alignItems: 'center' },
  emoji: { fontSize: 48, marginBottom: 8 },
  step: { fontSize: 12, opacity: 0.5, textTransform: 'uppercase' },
  title: { fontSize: 22, fontWeight: '700', marginTop: 4, textAlign: 'center' },
  body: { fontSize: 16, opacity: 0.7, marginTop: 8, textAlign: 'center' },
  button: {
    backgroundColor: '#2E7D32',
    marginHorizontal: 24,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
