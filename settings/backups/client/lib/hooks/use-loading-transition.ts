/**
 * Smooth Loading Transition Hook (Phase 7, T120)
 * 
 * Provides smooth fade in/out transitions when switching between
 * skeleton loaders and actual content.
 * 
 * Usage:
 *   const { opacity, showContent } = useLoadingTransition(isLoading, 200);
 *   return showContent ? <Content style={{ opacity }} /> : <Skeleton />;
 */

import { useEffect } from 'react';
import { useSharedValue, withTiming } from 'react-native-reanimated';

export interface LoadingTransitionOptions {
  duration?: number;
  delay?: number;
  useNativeDriver?: boolean;
}

export function useLoadingTransition(
  isLoading: boolean,
  options: LoadingTransitionOptions = {}
) {
  const {
    duration = 200,
    delay = 0,
  } = options;

  const opacity = useSharedValue(isLoading ? 0 : 1);
  const showContent = !isLoading;

  useEffect(() => {
    if (isLoading) {
      // Fade out content
      opacity.value = withTiming(0, { duration });
    } else {
      // Fade in content
      if (delay > 0) {
        setTimeout(() => {
          opacity.value = withTiming(1, { duration });
        }, delay);
      } else {
        opacity.value = withTiming(1, { duration });
      }
    }
  }, [isLoading, duration, delay]);

  return {
    opacity,
    showContent,
  };
}

/**
 * Two-stage loading transition (skeleton → content)
 * 
 * Usage:
 *   const { skeletonOpacity, contentOpacity, showSkeleton, showContent } = 
 *     useTwoStageTransition(isLoading);
 */
export function useTwoStageTransition(
  isLoading: boolean,
  options: LoadingTransitionOptions = {}
) {
  const {
    duration = 200,
    delay = 0,
  } = options;

  const skeletonOpacity = useSharedValue(isLoading ? 1 : 0);
  const contentOpacity = useSharedValue(isLoading ? 0 : 1);

  useEffect(() => {
    if (isLoading) {
      // Show skeleton, hide content
      if (delay > 0) {
        setTimeout(() => {
          skeletonOpacity.value = withTiming(1, { duration });
          contentOpacity.value = withTiming(0, { duration });
        }, delay);
      } else {
        skeletonOpacity.value = withTiming(1, { duration });
        contentOpacity.value = withTiming(0, { duration });
      }
    } else {
      // Hide skeleton, show content
      if (delay > 0) {
        setTimeout(() => {
          skeletonOpacity.value = withTiming(0, { duration });
          contentOpacity.value = withTiming(1, { duration });
        }, delay);
      } else {
        skeletonOpacity.value = withTiming(0, { duration });
        contentOpacity.value = withTiming(1, { duration });
      }
    }
  }, [isLoading, duration, delay]);

  return {
    skeletonOpacity,
    contentOpacity,
    showSkeleton: isLoading,
    showContent: !isLoading,
  };
}

/**
 * Staggered list item fade-in
 * 
 * Usage:
 *   const itemOpacity = useStaggeredFadeIn(index, isLoading);
 *   return <Animated.View style={{ opacity: itemOpacity }}>...</Animated.View>;
 */
export function useStaggeredFadeIn(
  index: number,
  isVisible: boolean,
  options: LoadingTransitionOptions & { staggerDelay?: number } = {}
) {
  const {
    duration = 200,
    delay = 0,
    staggerDelay = 50,
  } = options;

  const opacity = useSharedValue(isVisible ? 1 : 0);

  useEffect(() => {
    if (isVisible) {
      const itemDelay = delay + (index * staggerDelay);
      
      setTimeout(() => {
        opacity.value = withTiming(1, { duration });
      }, itemDelay);
    } else {
      opacity.value = 0;
    }
  }, [isVisible, index, duration, delay, staggerDelay]);

  return opacity;
}
