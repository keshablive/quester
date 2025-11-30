/**
 * Marketplace Query Hooks
 *
 * TanStack Query hooks for marketplace data fetching (properties and classifieds)
 * with caching, offline support, and instant display.
 *
 * US2: Marketplace Listings with Caching
 *
 * @module core/hooks/queries/useMarketplace
 */

import {
  useQuery,
  useInfiniteQuery,
  type UseQueryOptions,
  type UseQueryResult,
  type UseInfiniteQueryOptions,
  type UseInfiniteQueryResult,
} from '@tanstack/react-query';
import { propertiesService } from '../../api/services/properties.service';
import { classifiedsService } from '../../api/services/classifieds.service';
import { queryKeys } from '../../query/keys';
import { STALE_TIMES, GC_TIME } from '../../query/constants';
import type {
  Property,
  PropertyFilters,
  ClassifiedAd,
  ClassifiedFilters,
  PaginatedResponse,
  ApiError,
} from '../../types/query.types';

// ═══════════════════════════════════════════════════════════════
// Properties Hooks
// ═══════════════════════════════════════════════════════════════

/**
 * Fetch paginated properties list
 *
 * @param filters - Optional filters for properties
 * @param options - Optional TanStack Query options
 * @returns Query result with properties data
 *
 * @example
 * ```tsx
 * const { data, isLoading, error, refetch } = useMarketplaceProperties({ type: 'apartment' });
 * ```
 */
export function useMarketplaceProperties(
  filters?: PropertyFilters,
  options?: Omit<
    UseQueryOptions<Property[], ApiError>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<Property[], ApiError> {
  return useQuery({
    queryKey: queryKeys.marketplace.properties.list(filters),
    queryFn: async () => {
      const response = await propertiesService.search(filters ?? {});
      return response.data;
    },
    staleTime: STALE_TIMES.MARKETPLACE,
    gcTime: GC_TIME,
    ...options,
  });
}

/**
 * Fetch a single property by ID
 *
 * @param propertyId - The property's unique identifier
 * @param options - Optional TanStack Query options
 * @returns Query result with property data
 *
 * @example
 * ```tsx
 * const { data: property, isLoading } = useMarketplaceProperty(propertyId);
 * ```
 */
export function useMarketplaceProperty(
  propertyId: string,
  options?: Omit<
    UseQueryOptions<Property, ApiError>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<Property, ApiError> {
  return useQuery({
    queryKey: queryKeys.marketplace.properties.detail(propertyId),
    queryFn: () => propertiesService.get(propertyId),
    staleTime: STALE_TIMES.MARKETPLACE,
    gcTime: GC_TIME,
    enabled: !!propertyId,
    ...options,
  });
}

/**
 * Fetch properties with infinite scroll pagination
 *
 * Supports cursor-based pagination to prevent duplicate/missing items.
 *
 * @param filters - Optional filters for properties (excluding page)
 * @param options - Optional TanStack Query infinite options
 * @returns Infinite query result with pagination controls
 *
 * @example
 * ```tsx
 * const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteMarketplaceProperties();
 * const properties = data?.pages.flatMap(p => p.items) ?? [];
 * ```
 */
export function useInfiniteMarketplaceProperties(
  filters?: Omit<PropertyFilters, 'page'>,
  options?: Omit<
    UseInfiniteQueryOptions<
      PaginatedResponse<Property>,
      ApiError,
      { pages: PaginatedResponse<Property>[]; pageParams: (string | undefined)[] }
    >,
    'queryKey' | 'queryFn' | 'initialPageParam' | 'getNextPageParam'
  >
): UseInfiniteQueryResult<
  { pages: PaginatedResponse<Property>[]; pageParams: (string | undefined)[] },
  ApiError
> {
  return useInfiniteQuery({
    queryKey: queryKeys.marketplace.properties.infinite(filters),
    queryFn: async ({ pageParam }) => {
      // Fetch with pagination via search service
      const pageSize = filters?.limit ?? 20;
      const page = pageParam ? parseInt(pageParam, 10) : 1;
      
      const response = await propertiesService.search({
        ...filters,
        page,
        limit: pageSize,
      });

      const hasMore = response.data.length === pageSize;
      
      return {
        items: response.data,
        total: response.total,
        nextCursor: hasMore ? String(page + 1) : undefined,
        hasMore,
      };
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: STALE_TIMES.MARKETPLACE,
    gcTime: GC_TIME,
    ...options,
  });
}

// ═══════════════════════════════════════════════════════════════
// Classifieds Hooks
// ═══════════════════════════════════════════════════════════════

/**
 * Fetch paginated classifieds list
 *
 * @param filters - Optional filters for classifieds
 * @param options - Optional TanStack Query options
 * @returns Query result with classifieds data
 *
 * @example
 * ```tsx
 * const { data, isLoading, error, refetch } = useMarketplaceClassifieds({ category: 'electronics' });
 * ```
 */
export function useMarketplaceClassifieds(
  filters?: ClassifiedFilters,
  options?: Omit<
    UseQueryOptions<ClassifiedAd[], ApiError>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<ClassifiedAd[], ApiError> {
  return useQuery({
    queryKey: queryKeys.marketplace.classifieds.list(filters),
    queryFn: async () => {
      const response = await classifiedsService.search(filters ?? {});
      return response.data;
    },
    staleTime: STALE_TIMES.MARKETPLACE,
    gcTime: GC_TIME,
    ...options,
  });
}

/**
 * Fetch a single classified ad by ID
 *
 * @param classifiedId - The classified ad's unique identifier
 * @param options - Optional TanStack Query options
 * @returns Query result with classified ad data
 *
 * @example
 * ```tsx
 * const { data: classified, isLoading } = useMarketplaceClassified(classifiedId);
 * ```
 */
export function useMarketplaceClassified(
  classifiedId: string,
  options?: Omit<
    UseQueryOptions<ClassifiedAd, ApiError>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<ClassifiedAd, ApiError> {
  return useQuery({
    queryKey: queryKeys.marketplace.classifieds.detail(classifiedId),
    queryFn: () => classifiedsService.get(classifiedId),
    staleTime: STALE_TIMES.MARKETPLACE,
    gcTime: GC_TIME,
    enabled: !!classifiedId,
    ...options,
  });
}

/**
 * Fetch classifieds with infinite scroll pagination
 *
 * Supports cursor-based pagination to prevent duplicate/missing items.
 *
 * @param filters - Optional filters for classifieds (excluding page)
 * @param options - Optional TanStack Query infinite options
 * @returns Infinite query result with pagination controls
 *
 * @example
 * ```tsx
 * const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteMarketplaceClassifieds();
 * const classifieds = data?.pages.flatMap(p => p.items) ?? [];
 * ```
 */
export function useInfiniteMarketplaceClassifieds(
  filters?: Omit<ClassifiedFilters, 'page'>,
  options?: Omit<
    UseInfiniteQueryOptions<
      PaginatedResponse<ClassifiedAd>,
      ApiError,
      { pages: PaginatedResponse<ClassifiedAd>[]; pageParams: (string | undefined)[] }
    >,
    'queryKey' | 'queryFn' | 'initialPageParam' | 'getNextPageParam'
  >
): UseInfiniteQueryResult<
  { pages: PaginatedResponse<ClassifiedAd>[]; pageParams: (string | undefined)[] },
  ApiError
> {
  return useInfiniteQuery({
    queryKey: queryKeys.marketplace.classifieds.infinite(filters),
    queryFn: async ({ pageParam }) => {
      // Fetch with pagination via search service
      const pageSize = filters?.limit ?? 20;
      const page = pageParam ? parseInt(pageParam, 10) : 1;
      
      const response = await classifiedsService.search({
        ...filters,
        page,
        limit: pageSize,
      });

      const hasMore = response.data.length === pageSize;
      
      return {
        items: response.data,
        total: response.total,
        nextCursor: hasMore ? String(page + 1) : undefined,
        hasMore,
      };
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: STALE_TIMES.MARKETPLACE,
    gcTime: GC_TIME,
    ...options,
  });
}
