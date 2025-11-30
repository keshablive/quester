/**
 * List Component Contracts
 * Feature: 019-client-image-list-performance
 * 
 * Defines TypeScript interfaces for the OptimizedList component
 * wrapping @shopify/flash-list with project-specific defaults.
 */

import { ReactElement, ComponentType } from 'react';
import { ViewStyle, StyleProp, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';

/**
 * Props for OptimizedList component
 * Wraps FlashList with sensible defaults for Quester app
 */
export interface OptimizedListProps<T> {
  /**
   * Array of data items to render
   */
  data: ReadonlyArray<T>;

  /**
   * Function that renders each item
   */
  renderItem: (info: ListRenderItemInfo<T>) => ReactElement | null;

  /**
   * Estimated size (height for vertical, width for horizontal) of items
   * Required for FlashList optimization - set as close to actual size as possible
   */
  estimatedItemSize: number;

  /**
   * Function to extract unique key for each item
   * @default Uses index if not provided
   */
  keyExtractor?: (item: T, index: number) => string;

  /**
   * Function to determine item type for heterogeneous lists
   * Important for lists with different item layouts (headers, items, etc.)
   */
  getItemType?: (item: T, index: number) => string | number;

  /**
   * Override item layout for precise sizing
   * Improves performance when exact sizes are known
   */
  overrideItemLayout?: (
    layout: { size?: number; span?: number },
    item: T,
    index: number,
    maxColumns: number,
  ) => void;

  /**
   * Style for the list container
   */
  style?: StyleProp<ViewStyle>;

  /**
   * Style for the scrollable content container
   */
  contentContainerStyle?: StyleProp<ViewStyle>;

  /**
   * Number of columns for grid layout
   * @default 1
   */
  numColumns?: number;

  /**
   * Enable masonry layout (Pinterest-style)
   * Requires numColumns > 1
   * @default false
   */
  masonry?: boolean;

  /**
   * Component rendered at the top of the list
   */
  ListHeaderComponent?: ComponentType | ReactElement | null;

  /**
   * Component rendered at the bottom of the list
   */
  ListFooterComponent?: ComponentType | ReactElement | null;

  /**
   * Component rendered when the list is empty
   */
  ListEmptyComponent?: ComponentType | ReactElement | null;

  /**
   * Component rendered between items
   */
  ItemSeparatorComponent?: ComponentType<{ leadingItem: T }> | null;

  /**
   * Whether the list is currently refreshing (for pull-to-refresh)
   */
  refreshing?: boolean;

  /**
   * Callback when pull-to-refresh is triggered
   */
  onRefresh?: () => void;

  /**
   * Callback when the end of the list is reached
   * Use for infinite scroll/pagination
   */
  onEndReached?: () => void;

  /**
   * How far from the end (0-1) to trigger onEndReached
   * @default 0.5
   */
  onEndReachedThreshold?: number;

  /**
   * Enable horizontal scrolling
   * @default false
   */
  horizontal?: boolean;

  /**
   * Show vertical scroll indicator
   * @default true
   */
  showsVerticalScrollIndicator?: boolean;

  /**
   * Show horizontal scroll indicator
   * @default false
   */
  showsHorizontalScrollIndicator?: boolean;

  /**
   * Indices of items that should stick to the top when scrolled past
   */
  stickyHeaderIndices?: number[];

  /**
   * Callback when scroll position changes
   */
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;

  /**
   * How many pixels ahead of the visible area to render
   * Higher values = smoother scrolling but more memory usage
   * @default 250
   */
  drawDistance?: number;

  /**
   * Unique key for maintaining scroll position across data changes
   */
  extraData?: unknown;

  /**
   * Invert the scroll direction (useful for chat lists)
   * Note: In FlashList v2, use maintainVisibleContentPosition instead
   */
  inverted?: boolean;

  /**
   * Test ID for e2e testing
   */
  testID?: string;
}

/**
 * Info passed to renderItem function
 */
export interface ListRenderItemInfo<T> {
  item: T;
  index: number;
  target: 'Cell' | 'StickyHeader';
}

/**
 * State for list loading operations
 */
export interface ListLoadingState {
  /** Initial load in progress */
  isLoading: boolean;
  
  /** Pull-to-refresh in progress */
  isRefreshing: boolean;
  
  /** Loading more items (pagination) in progress */
  isLoadingMore: boolean;
  
  /** Error message if load failed */
  error: string | null;
}

/**
 * List configuration constants
 */
export const LIST_CONFIG = {
  /** Default estimated item size in pixels */
  DEFAULT_ESTIMATED_ITEM_SIZE: 80,
  
  /** Default draw distance in pixels */
  DEFAULT_DRAW_DISTANCE: 250,
  
  /** Default end reached threshold (0-1) */
  DEFAULT_END_REACHED_THRESHOLD: 0.5,
  
  /** Default number of columns */
  DEFAULT_NUM_COLUMNS: 1,
} as const;

/**
 * Type guard to check if list has items
 */
export function isNonEmptyList<T>(data: ReadonlyArray<T> | null | undefined): data is ReadonlyArray<T> {
  return Array.isArray(data) && data.length > 0;
}
