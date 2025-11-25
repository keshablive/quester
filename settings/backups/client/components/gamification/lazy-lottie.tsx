/**
 * Lazy-Loaded Lottie Animation Component (Phase 7, T122)
 *
 * Dynamically imports lottie-react-native to reduce initial bundle size.
 * Reduces main bundle by ~200KB by splitting Lottie into a separate chunk.
 *
 * Usage:
 *   <LazyLottie source={require('@/assets/animations/confetti.json')} autoPlay />
 */

import React, { Suspense, lazy } from 'react';
import { View, ActivityIndicator, type ViewStyle } from 'react-native';

// Lazy load the Lottie component
const LottieViewLazy = lazy(() =>
  import('lottie-react-native').then((module) => ({
    default: module.default,
  }))
);

interface LazyLottieProps {
  source: any;
  autoPlay?: boolean;
  loop?: boolean;
  style?: ViewStyle;
  testID?: string;
  onAnimationFinish?: () => void;
}

/**
 * Fallback component shown while Lottie is loading
 */
function LottieFallback({ style }: { style?: ViewStyle }) {
  return (
    <View style={[style, { justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator size="large" color="#6366F1" />
    </View>
  );
}

/**
 * Lazy-loaded Lottie animation with fallback
 */
export function LazyLottie({
  source,
  autoPlay = true,
  loop = false,
  style,
  testID,
  onAnimationFinish,
}: LazyLottieProps) {
  return (
    <Suspense fallback={<LottieFallback style={style} />}>
      <LottieViewLazy
        source={source}
        autoPlay={autoPlay}
        loop={loop}
        style={style}
        testID={testID}
        onAnimationFinish={onAnimationFinish}
      />
    </Suspense>
  );
}

/**
 * Preload Lottie for faster subsequent renders
 * Call this when you know the user will need Lottie soon (e.g., on app start)
 */
export function preloadLottie() {
  // Trigger dynamic import without rendering
  import('lottie-react-native').then(() => {
    console.log('[LazyLottie] Preloaded lottie-react-native');
  });
}
