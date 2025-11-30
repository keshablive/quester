/**
 * Image Component Contracts
 * Feature: 019-client-image-list-performance
 * 
 * Defines TypeScript interfaces for the OptimizedImage component
 * wrapping expo-image with project-specific defaults.
 */

import { ImageStyle, StyleProp } from 'react-native';
import { ImageContentFit, ImageSource } from 'expo-image';

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
   * Enable/disable recycling (for use in lists)
   * @default true
   */
  recyclingKey?: string;
}

/**
 * Default placeholder blurhash for images without specific placeholders
 * A neutral gray-ish blur that works for most images
 */
export const DEFAULT_BLURHASH = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

/**
 * Image cache configuration constants
 */
export const IMAGE_CACHE_CONFIG = {
  /** Maximum cache size: 100MB as specified in requirements */
  MAX_SIZE_BYTES: 100 * 1024 * 1024,
  
  /** Default transition duration in ms */
  DEFAULT_TRANSITION_MS: 300,
  
  /** Default cache policy */
  DEFAULT_CACHE_POLICY: 'disk' as const,
  
  /** Default content fit */
  DEFAULT_CONTENT_FIT: 'cover' as const,
} as const;
