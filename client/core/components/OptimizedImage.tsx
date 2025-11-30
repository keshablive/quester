/**
 * OptimizedImage Component
 * Feature: 019-client-image-list-performance
 *
 * A wrapper around expo-image that provides:
 * - Automatic disk caching (100MB limit, LRU eviction)
 * - BlurHash placeholder support
 * - Smooth fade-in transitions
 * - Fallback image support
 * - Performance optimizations for lists
 *
 * @example
 * ```tsx
 * <OptimizedImage
 *   source={course.imageUrl}
 *   style={{ width: 200, height: 150 }}
 *   contentFit="cover"
 *   placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
 * />
 * ```
 */

import React, { useState, useCallback, memo } from 'react';
import { Image, ImageErrorEventData } from 'expo-image';
import { IMAGE_CACHE } from '../constants/performance';
import type { OptimizedImageProps } from './OptimizedImage.types';

/**
 * OptimizedImage - High-performance image component with caching
 *
 * Uses expo-image under the hood for:
 * - Automatic disk caching (persists across app restarts)
 * - Memory-efficient image loading
 * - Native blur placeholder transitions
 * - Multiple format support (JPEG, PNG, WebP, GIF, AVIF)
 */
export const OptimizedImage = memo(function OptimizedImage({
  source,
  style,
  contentFit = 'cover',
  placeholder,
  transition = IMAGE_CACHE.DEFAULT_TRANSITION_MS,
  cachePolicy = 'disk',
  onLoad,
  onError,
  accessibilityLabel,
  fallbackSource,
  priority = 'normal',
  recyclingKey,
  testID,
}: OptimizedImageProps) {
  const [hasError, setHasError] = useState(false);
  const [currentSource, setCurrentSource] = useState(source);

  // Handle image load success
  const handleLoad = useCallback(() => {
    setHasError(false);
    onLoad?.();
  }, [onLoad]);

  // Handle image load error with fallback support
  const handleError = useCallback(
    (event: ImageErrorEventData) => {
      setHasError(true);

      // If we have a fallback and haven't already tried it
      if (fallbackSource && currentSource !== fallbackSource) {
        setCurrentSource(fallbackSource);
        setHasError(false);
      }

      onError?.({ error: event.error || 'Image failed to load' });
    },
    [fallbackSource, currentSource, onError]
  );

  // Determine placeholder to use
  const resolvedPlaceholder = placeholder ?? { blurhash: IMAGE_CACHE.DEFAULT_PLACEHOLDER_BLURHASH };

  return (
    <Image
      source={hasError && fallbackSource ? fallbackSource : currentSource}
      style={style}
      contentFit={contentFit}
      placeholder={resolvedPlaceholder}
      transition={transition}
      cachePolicy={cachePolicy}
      onLoad={handleLoad}
      onError={handleError}
      accessibilityLabel={accessibilityLabel}
      priority={priority}
      recyclingKey={recyclingKey}
      testID={testID}
    />
  );
});

// Re-export types for convenience
export type { OptimizedImageProps } from './OptimizedImage.types';
