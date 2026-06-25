import React, { useRef, useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getScreenBottomPadding } from '@/src/utils/safeAreaLayout';

const { width: W } = Dimensions.get('window');

const BG = '#0F0F0F';
const PURPLE = '#7C3AED';
const GREEN = '#22C55E';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_MUTED = 'rgba(255,255,255,0.52)';
const EMOJI_BG = 'rgba(124,58,237,0.14)';

type SlideData = {
  key: string;
  emoji?: string;
  title: string;
  subtitle?: string;
  cta: string;
  showSignIn: boolean;
};

const SLIDES: SlideData[] = [
  {
    key: 's1',
    emoji: '🛒',
    title: 'Save money on\nevery shop',
    subtitle:
      'Scan receipts and see exactly where your money goes — across every store, every week.',
    cta: 'Get Started',
    showSignIn: false,
  },
  {
    key: 's2',
    emoji: '📊',
    title: 'Compare prices\nin real time',
    subtitle:
      'Find the cheapest store for your groceries using real prices from your community.',
    cta: 'Next',
    showSignIn: false,
  },
  {
    key: 's3',
    emoji: '✅',
    title: 'Build smarter\nshopping lists',
    subtitle: 'Create lists, track what you buy, and never overpay again.',
    cta: 'Create Account',
    showSignIn: true,
  },
];


export default function OnboardingCarousel() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [carouselHeight, setCarouselHeight] = useState(0);

  const currentSlide = SLIDES[activeIndex] ?? SLIDES[0];

  function scrollToIndex(i: number) {
    const clamped = Math.min(Math.max(0, i), SLIDES.length - 1);
    scrollRef.current?.scrollTo({ x: clamped * Math.max(W, 1), animated: true });
    setActiveIndex(clamped);
  }

  function handleScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const raw = W > 0 ? Math.round(e.nativeEvent.contentOffset.x / W) : 0;
    const i = Math.min(Math.max(0, raw), SLIDES.length - 1);
    if (i !== activeIndex) setActiveIndex(i);
  }

  function handleCta() {
    if (activeIndex < SLIDES.length - 1) {
      scrollToIndex(activeIndex + 1);
    } else {
      router.push('/onboarding/signup');
    }
  }

  function handleSignIn() {
    router.push('/onboarding/signin');
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />

      {/* Brand wordmark */}
      <View style={styles.brandBar}>
        <Text style={styles.brandEmoji}>🛒</Text>
        <Text style={styles.brandName}>Penny Pantry</Text>
      </View>

      {/* Carousel */}
      <View
        style={styles.carouselWrapper}
        onLayout={(e) => setCarouselHeight(e.nativeEvent.layout.height)}
      >
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onMomentumScrollEnd={handleScrollEnd}
          style={styles.scroll}
        >
          {carouselHeight > 0 &&
            SLIDES.map((slide) => (
              <View
                key={slide.key}
                style={[styles.slide, { height: carouselHeight }]}
              >
                <RegularSlide slide={slide} />
              </View>
            ))}
        </ScrollView>
      </View>

      {/* Dots */}
      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => (
          <Pressable
            key={i}
            onPress={() => scrollToIndex(i)}
            style={[styles.dot, i === activeIndex ? styles.dotActive : styles.dotInactive]}
            accessibilityRole="button"
            accessibilityLabel={`Go to slide ${i + 1}`}
          />
        ))}
      </View>

      {/* Footer CTA */}
      <View style={[styles.footer, { paddingBottom: getScreenBottomPadding(insets.bottom, 8) }]}>
        <Pressable
          style={({ pressed }) => [styles.ctaBtn, pressed && styles.ctaBtnPressed]}
          onPress={handleCta}
          accessibilityRole="button"
          accessibilityLabel={currentSlide.cta}
        >
          <Text style={styles.ctaBtnText}>{currentSlide.cta}</Text>
        </Pressable>

        {currentSlide.showSignIn && (
          <Pressable
            onPress={handleSignIn}
            style={styles.signInLinkBtn}
            accessibilityRole="button"
          >
            <Text style={styles.signInLinkText}>
              Already have an account?{' '}
              <Text style={styles.signInHighlight}>Sign in</Text>
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function RegularSlide({ slide }: { slide: SlideData }) {
  return (
    <View style={styles.slideContent}>
      <View style={styles.emojiCircle}>
        <Text style={styles.emojiGlyph}>{slide.emoji}</Text>
      </View>
      <Text style={styles.slideTitle}>{slide.title}</Text>
      {slide.subtitle ? (
        <Text style={styles.slideSubtitle}>{slide.subtitle}</Text>
      ) : null}
    </View>
  );
}


const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  brandBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 8,
  },
  brandEmoji: {
    fontSize: 20,
  },
  brandName: {
    color: PURPLE,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  carouselWrapper: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  slide: {
    width: W,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  slideContent: {
    alignItems: 'center',
    width: '100%',
  },
  emojiCircle: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: EMOJI_BG,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.22)',
  },
  emojiGlyph: {
    fontSize: 62,
  },
  slideTitle: {
    color: TEXT_PRIMARY,
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 16,
    lineHeight: 38,
  },
  slideSubtitle: {
    color: TEXT_MUTED,
    fontSize: 17,
    textAlign: 'center',
    lineHeight: 27,
    maxWidth: 320,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 20,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: GREEN,
  },
  dotInactive: {
    width: 8,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 4,
    gap: 14,
  },
  ctaBtn: {
    backgroundColor: GREEN,
    borderRadius: 999,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaBtnPressed: {
    opacity: 0.82,
  },
  ctaBtnText: {
    color: '#000',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  signInLinkBtn: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  signInLinkText: {
    color: TEXT_MUTED,
    fontSize: 14,
  },
  signInHighlight: {
    color: GREEN,
    fontWeight: '600',
  },
});
