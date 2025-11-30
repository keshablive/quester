/**
 * OptimizedImage Types
 * Feature: 019-client-image-list-performance
 * 
 * TypeScript interfaces for the OptimizedImage component
 * wrapping expo-image with project-specific defaults.
 */

import type { ImageStyle, StyleProp } from 'react-native';
import type { ImageContentFit, ImageSource } from 'expo-image';

/**
 * Props for OptimizedImage component
 * Wraps expo-image with sensible defaults for Quester app
 */
export interface OptimizedImageProps {
  /**
   * Image source - can be:
   * - URL string: "https://example.com/image.jpg"
   * - Local require: require('./image.png')
   * - Object: { uri: "https://..." }
   */
  source: ImageSource;

  /**
   * Style applied to the image
   */
  style?: StyleProp<ImageStyle>;

  /**
   * How the image should fit within its container
   * @default "cover"
   */
  contentFit?: ImageContentFit;

  /**
   * Placeholder shown while image loads
   * Can be a blurhash string or object with blurhash/thumbhash
   */
  placeholder?: string | { blurhash: string } | { thumbhash: string };

  /**
   * Duration of fade-in transition in milliseconds
   * @default 300
   */
  transition?: number;

  /**
   * Cache policy for the image
   * - "disk": Cache to disk (default, recommended)
   * - "memory": Cache to memory only
   * - "none": No caching
   * @default "disk"
   */
  cachePolicy?: 'disk' | 'memory' | 'none';

  /**
   * Callback fired when image successfully loads
   */
  onLoad?: () => void;

  /**
   * Callback fired when image fails to load
   */
  onError?: (error: { error: string }) => void;

  /**
   * Accessibility label for screen readers
   */
  accessibilityLabel?: string;

  /**
   * Alternative image to show if primary source fails
   */
  fallbackSource?: ImageSource;

  /**
   * Priority for image loading
   * - "low": Load after higher priority images
   * - "normal": Default priority
   * - "high": Load before normal priority images
   * @default "normal"
   */
  priority?: 'low' | 'normal' | 'high';

  /**
   * Key for recycling in lists
   */
  recyclingKey?: string;

  /**
   * Test ID for e2e testing
   */
  testID?: string;
}
