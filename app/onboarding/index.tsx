import React, { useMemo, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  FeatureSlideData,
  OnboardingFeatureSlide,
} from '@/src/components/onboarding/OnboardingFeatureSlide';
import { OnboardingSignupSlide } from '@/src/components/onboarding/OnboardingSignupSlide';
import { LanguagePicker } from '@/src/components/settings/AppearanceSettings';
import { signInWithApple, signInWithGoogle } from '@/src/services/authService';
import { OnboardingColors, OnboardingSlideAccents } from '@/src/theme/onboardingTheme';
import { getScreenBottomPadding } from '@/src/utils/safeAreaLayout';

const SLIDE_COUNT = 4;

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [carouselHeight, setCarouselHeight] = useState(0);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const featureSlides: FeatureSlideData[] = useMemo(
    () => [
      {
        key: 'save',
        icon: { ios: 'banknote.fill', android: 'savings', web: 'savings' },
        titleParts: [t('onboarding.slides.save.title1'), t('onboarding.slides.save.title2')],
        subtitle: t('onboarding.slides.save.subtitle'),
        accent: OnboardingSlideAccents.green,
      },
      {
        key: 'compare',
        icon: { ios: 'tag.fill', android: 'sell', web: 'sell' },
        titleParts: [t('onboarding.slides.compare.title1'), t('onboarding.slides.compare.title2')],
        subtitle: t('onboarding.slides.compare.subtitle'),
        accent: OnboardingSlideAccents.yellow,
      },
      {
        key: 'lists',
        icon: { ios: 'list.bullet', android: 'checklist', web: 'checklist' },
        titleParts: [t('onboarding.slides.lists.title1'), t('onboarding.slides.lists.title2')],
        subtitle: t('onboarding.slides.lists.subtitle'),
        accent: OnboardingSlideAccents.purple,
      },
    ],
    [t]
  );

  const isSignupSlide = activeIndex === SLIDE_COUNT - 1;
  const showSkip = activeIndex < SLIDE_COUNT - 1;

  function scrollToIndex(index: number) {
    const clamped = Math.min(Math.max(0, index), SLIDE_COUNT - 1);
    scrollRef.current?.scrollTo({ x: clamped * Math.max(screenWidth, 1), animated: true });
    setActiveIndex(clamped);
  }

  function handleScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const raw =
      screenWidth > 0 ? Math.round(event.nativeEvent.contentOffset.x / screenWidth) : 0;
    const index = Math.min(Math.max(0, raw), SLIDE_COUNT - 1);
    if (index !== activeIndex) setActiveIndex(index);
  }

  function handleSkip() {
    scrollToIndex(SLIDE_COUNT - 1);
  }

  function handleNext() {
    scrollToIndex(activeIndex + 1);
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
            accessibilityLabel={t('onboarding.skipA11y')}
          >
            <Text style={styles.skipText}>{t('common.skip')}</Text>
          </Pressable>
        ) : (
          <View style={styles.langSlot}>
            <LanguagePicker compact />
          </View>
        )}
      </View>

      <View
        style={styles.carouselWrapper}
        onLayout={(event) => setCarouselHeight(event.nativeEvent.layout.height)}
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
            featureSlides.map((slide) => (
              <View
                key={slide.key}
                style={[styles.slide, { width: screenWidth, height: carouselHeight }]}
              >
                <OnboardingFeatureSlide slide={slide} />
              </View>
            ))}
          {carouselHeight > 0 ? (
            <View style={[styles.slide, { width: screenWidth, height: carouselHeight }]}>
              <OnboardingSignupSlide
                loading={authLoading}
                error={authError}
                onEmailSignup={handleEmailSignup}
                onGoogle={handleGoogle}
                onApple={handleApple}
                onSignIn={handleSignIn}
              />
            </View>
          ) : null}
        </ScrollView>
      </View>

      <View
        style={[
          styles.footer,
          { paddingBottom: getScreenBottomPadding(insets.bottom, isSignupSlide ? 12 : 20) },
        ]}
      >
        {showSkip ? (
          <Pressable
            style={({ pressed }) => [styles.nextBtn, pressed && styles.nextBtnPressed]}
            onPress={handleNext}
            accessibilityRole="button"
            accessibilityLabel={t('onboarding.nextA11y')}
          >
            <Text style={styles.nextBtnText}>{t('common.next')}</Text>
          </Pressable>
        ) : null}

        <View style={styles.dotsRow}>
          {Array.from({ length: SLIDE_COUNT }, (_, index) => (
            <Pressable
              key={index}
              onPress={() => scrollToIndex(index)}
              style={[styles.dot, index === activeIndex ? styles.dotActive : styles.dotInactive]}
              accessibilityRole="button"
              accessibilityLabel={t('onboarding.goToSlide', { n: index + 1 })}
            />
          ))}
        </View>
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
    paddingHorizontal: 24,
    paddingVertical: 8,
    minHeight: 44,
  },
  topBarSpacer: {
    width: 48,
  },
  langSlot: {
    minWidth: 120,
    alignItems: 'flex-end',
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
    flex: 1,
    alignItems: 'center',
  },
  footer: {
    paddingHorizontal: 28,
    paddingTop: 8,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  nextBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: OnboardingColors.green,
    borderRadius: 999,
    paddingVertical: 16,
    marginBottom: 16,
  },
  nextBtnPressed: {
    opacity: 0.88,
  },
  nextBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
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
});
