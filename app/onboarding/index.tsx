import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  CompareSlideVisual,
  ListSlideVisual,
  SavingsSlideVisual,
  SignupHeroVisual,
} from '@/src/components/onboarding/OnboardingSlideVisuals';
import { PennyPantryLogo } from '@/src/components/PennyPantryLogo';
import { signInWithApple, signInWithGoogle } from '@/src/services/authService';
import { OnboardingColors } from '@/src/theme/onboardingTheme';
import { getScreenBottomPadding } from '@/src/utils/safeAreaLayout';

const { width: W } = Dimensions.get('window');

const SLIDE_COUNT = 4;
const SHOW_APPLE = Platform.OS === 'ios' || Platform.OS === 'web';

type FeatureSlide = {
  kind: 'feature';
  key: string;
  step: number;
  titleParts: [string, string];
  subtitle: string;
  Visual: React.ComponentType;
};

type SignupSlide = {
  kind: 'signup';
  key: string;
};

type SlideData = FeatureSlide | SignupSlide;

const SLIDES: SlideData[] = [
  {
    kind: 'feature',
    key: 's1',
    step: 1,
    titleParts: ['Save money', 'on every shop'],
    subtitle: 'Track your spending and save more every day.',
    Visual: SavingsSlideVisual,
  },
  {
    kind: 'feature',
    key: 's2',
    step: 2,
    titleParts: ['Compare prices', 'in real time'],
    subtitle: 'Find the best deals across stores before you buy.',
    Visual: CompareSlideVisual,
  },
  {
    kind: 'feature',
    key: 's3',
    step: 3,
    titleParts: ['Build smarter', 'shopping lists'],
    subtitle: 'Smart lists that organize, suggest and keep you on track.',
    Visual: ListSlideVisual,
  },
  {
    kind: 'signup',
    key: 's4',
  },
];

function HighlightTitle({ parts }: { parts: [string, string] }) {
  return (
    <Text style={styles.slideTitle}>
      {parts[0]}
      {'\n'}
      <Text style={styles.slideTitleAccent}>{parts[1]}</Text>
    </Text>
  );
}

function FeatureSlideContent({ slide }: { slide: FeatureSlide }) {
  const Visual = slide.Visual;
  return (
    <View style={styles.slideInner}>
      <View style={styles.stepBadge}>
        <Text style={styles.stepBadgeText}>{slide.step}</Text>
      </View>
      <HighlightTitle parts={slide.titleParts} />
      <Text style={styles.slideSubtitle}>{slide.subtitle}</Text>
      <Visual />
    </View>
  );
}

function SignupSlideContent({
  loading,
  error,
  onEmailSignup,
  onGoogle,
  onApple,
  onSignIn,
}: {
  loading: boolean;
  error: string | null;
  onEmailSignup: () => void;
  onGoogle: () => void;
  onApple: () => void;
  onSignIn: () => void;
}) {
  return (
    <ScrollView
      style={styles.signupScroll}
      contentContainerStyle={styles.signupScrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <PennyPantryLogo variant="hero" size={56} style={styles.signupLogo} />
      <SignupHeroVisual />
      <Text style={styles.signupTitle}>
        Smarter shopping.{'\n'}
        <Text style={styles.slideTitleAccent}>Better savings.</Text>
      </Text>
      <Text style={styles.signupTagline}>All in one app.</Text>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <Pressable
        style={({ pressed }) => [
          styles.primaryBtn,
          loading && styles.btnDisabled,
          pressed && styles.btnPressed,
        ]}
        onPress={onEmailSignup}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel="Sign up with Email"
      >
        <Text style={styles.primaryBtnIcon}>✉</Text>
        <Text style={styles.primaryBtnText}>Sign up with Email</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.outlineBtn,
          loading && styles.btnDisabled,
          pressed && styles.outlineBtnPressed,
        ]}
        onPress={onGoogle}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel="Continue with Google"
      >
        {loading ? (
          <ActivityIndicator color={OnboardingColors.text} />
        ) : (
          <>
            <Text style={styles.googleG}>G</Text>
            <Text style={styles.outlineBtnText}>Continue with Google</Text>
          </>
        )}
      </Pressable>

      {SHOW_APPLE ? (
        <Pressable
          style={({ pressed }) => [
            styles.outlineBtn,
            loading && styles.btnDisabled,
            pressed && styles.outlineBtnPressed,
          ]}
          onPress={onApple}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Continue with Apple"
        >
          <Text style={styles.appleGlyph}></Text>
          <Text style={styles.outlineBtnText}>Continue with Apple</Text>
        </Pressable>
      ) : null}

      <Pressable
        onPress={onSignIn}
        style={styles.loginLinkBtn}
        accessibilityRole="button"
        accessibilityLabel="Log in"
      >
        <Text style={styles.loginLinkText}>
          Already have an account? <Text style={styles.loginLinkHighlight}>Log in</Text>
        </Text>
      </Pressable>
    </ScrollView>
  );
}

export default function OnboardingCarousel() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [carouselHeight, setCarouselHeight] = useState(0);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const isSignupSlide = activeIndex === SLIDE_COUNT - 1;
  const showSkip = activeIndex < SLIDE_COUNT - 1;

  function scrollToIndex(i: number) {
    const clamped = Math.min(Math.max(0, i), SLIDE_COUNT - 1);
    scrollRef.current?.scrollTo({ x: clamped * Math.max(W, 1), animated: true });
    setActiveIndex(clamped);
  }

  function handleScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const raw = W > 0 ? Math.round(e.nativeEvent.contentOffset.x / W) : 0;
    const i = Math.min(Math.max(0, raw), SLIDE_COUNT - 1);
    if (i !== activeIndex) setActiveIndex(i);
  }

  function handleSkip() {
    scrollToIndex(SLIDE_COUNT - 1);
  }

  function handleEmailSignup() {
    router.push('/onboarding/signup');
  }

  function handleSignIn() {
    router.push('/onboarding/signin');
  }

  async function handleGoogle() {
    setAuthError(null);
    setAuthLoading(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : 'Google sign-in failed. Please try again.');
      setAuthLoading(false);
    }
  }

  async function handleApple() {
    setAuthError(null);
    setAuthLoading(true);
    try {
      await signInWithApple();
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : 'Apple sign-in failed. Please try again.');
      setAuthLoading(false);
    }
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={OnboardingColors.background} />

      <View style={styles.topBar}>
        <View style={styles.topBarSpacer} />
        {showSkip ? (
          <Pressable
            onPress={handleSkip}
            style={styles.skipBtn}
            accessibilityRole="button"
            accessibilityLabel="Skip onboarding"
          >
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        ) : (
          <View style={styles.topBarSpacer} />
        )}
      </View>

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
                {slide.kind === 'feature' ? (
                  <FeatureSlideContent slide={slide} />
                ) : (
                  <SignupSlideContent
                    loading={authLoading}
                    error={authError}
                    onEmailSignup={handleEmailSignup}
                    onGoogle={handleGoogle}
                    onApple={handleApple}
                    onSignIn={handleSignIn}
                  />
                )}
              </View>
            ))}
        </ScrollView>
      </View>

      <View
        style={[
          styles.dotsRow,
          { paddingBottom: getScreenBottomPadding(insets.bottom, isSignupSlide ? 12 : 24) },
        ]}
      >
        {SLIDES.map((slide, i) => (
          <Pressable
            key={slide.key}
            onPress={() => scrollToIndex(i)}
            style={[styles.dot, i === activeIndex ? styles.dotActive : styles.dotInactive]}
            accessibilityRole="button"
            accessibilityLabel={`Go to slide ${i + 1}`}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: OnboardingColors.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    minHeight: 44,
  },
  topBarSpacer: {
    width: 48,
  },
  skipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  skipText: {
    color: OnboardingColors.textMuted,
    fontSize: 16,
    fontWeight: '500',
  },
  carouselWrapper: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  slide: {
    width: W,
    paddingHorizontal: 24,
  },
  slideInner: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 8,
  },
  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: OnboardingColors.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  stepBadgeText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  slideTitle: {
    color: OnboardingColors.text,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 12,
    lineHeight: 36,
  },
  slideTitleAccent: {
    color: OnboardingColors.green,
  },
  slideSubtitle: {
    color: OnboardingColors.textMuted,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 320,
    marginBottom: 20,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: OnboardingColors.green,
  },
  dotInactive: {
    width: 8,
    backgroundColor: OnboardingColors.border,
  },
  signupScroll: {
    flex: 1,
  },
  signupScrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingBottom: 8,
  },
  signupLogo: {
    marginBottom: 4,
  },
  signupTitle: {
    color: OnboardingColors.text,
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 34,
    marginBottom: 8,
  },
  signupTagline: {
    color: OnboardingColors.textMuted,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  errorBox: {
    width: '100%',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    textAlign: 'center',
  },
  primaryBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: OnboardingColors.green,
    borderRadius: 999,
    paddingVertical: 16,
    marginBottom: 12,
  },
  primaryBtnIcon: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  outlineBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: OnboardingColors.card,
    borderRadius: 999,
    paddingVertical: 15,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: OnboardingColors.border,
  },
  outlineBtnPressed: {
    backgroundColor: '#F9FAFB',
  },
  outlineBtnText: {
    color: OnboardingColors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  googleG: {
    fontSize: 17,
    fontWeight: '700',
    color: '#4285F4',
  },
  appleGlyph: {
    fontSize: 20,
    color: OnboardingColors.text,
    marginTop: -2,
  },
  btnDisabled: {
    opacity: 0.55,
  },
  btnPressed: {
    opacity: 0.88,
  },
  loginLinkBtn: {
    paddingVertical: 16,
    marginTop: 4,
  },
  loginLinkText: {
    color: OnboardingColors.textMuted,
    fontSize: 14,
  },
  loginLinkHighlight: {
    color: OnboardingColors.green,
    fontWeight: '600',
  },
});
