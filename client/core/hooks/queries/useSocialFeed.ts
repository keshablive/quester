/**
 * Social Feed Query Hooks
 *
 * TanStack Query hooks for fetching social feed with infinite scroll.
 * FR-015, FR-017: Cursor-based pagination with 20 items/page, 10 pages max in memory.
 *
 * @module core/hooks/queries/useSocialFeed
 */

import {
  useInfiniteQuery,
  type UseInfiniteQueryOptions,
  type UseInfiniteQueryResult,
  type InfiniteData,
} from '@tanstack/react-query';
import { socialService } from '../../api/services/social.service';
import { queryKeys } from '../../query/keys';
import { STALE_TIMES, GC_TIME } from '../../query/constants';
import type { SocialPost, PaginatedResponse, ApiError } from '../../types/query.types';

/**
 * Page size for infinite scroll (FR-017: 20 items per page)
 */
const PAGE_SIZE = 20;

/**
 * Maximum pages to keep in memory (FR-017: 10 pages = 200 posts max)
 */
const MAX_PAGES = 10;

/**
 * Fetch social feed posts with infinite scroll
 *
 * FR-015: Cursor-based pagination with 20 items per page
 * FR-017: Maintains up to 200 posts in memory (10 pages)
 *
 * @param options - Optional TanStack Query options
 * @returns Infinite query result with pagination controls
 *
 * @example
 * ```tsx
 * function SocialFeed() {
 *   const {
 *     data,
 *     fetchNextPage,
 *     hasNextPage,
 *     isFetchingNextPage,
 *     isLoading,
 *     error,
 *     refetch,
 *   } = useInfiniteSocialPosts();
 *
 *   const posts = data?.pages.flatMap(page => page.data) ?? [];
 *
 *   if (isLoading) return <FeedSkeleton />;
 *   if (error) return <ErrorState onRetry={refetch} />;
 *
 *   return (
 *     <FlatList
 *       data={posts}
 *       renderItem={({ item }) => <PostCard post={item} />}
 *       onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
 *       onEndReachedThreshold={0.5}
 *       ListFooterComponent={
 *         isFetchingNextPage ? <LoadingMore /> :
 *         !hasNextPage ? <AllCaughtUp /> : null
 *       }
 *     />
 *   );
 * }
 * ```
 */
export function useInfiniteSocialPosts(
  options?: Omit<
    UseInfiniteQueryOptions<
      PaginatedResponse<SocialPost>,
      ApiError,
      InfiniteData<PaginatedResponse<SocialPost>>,
      readonly unknown[],
      number
    >,
    'queryKey' | 'queryFn' | 'getNextPageParam' | 'initialPageParam' | 'maxPages'
  >
): UseInfiniteQueryResult<InfiniteData<PaginatedResponse<SocialPost>>, ApiError> {
  return useInfiniteQuery({
    queryKey: queryKeys.social.feedInfinite(),
    queryFn: async ({ pageParam }) => {
      // The existing socialService.getFeed takes page number
      const posts = await socialService.getFeed(pageParam);
      
      // Transform to our PaginatedResponse format
      return {
        items: posts.map((post) => ({
          id: post.id,
          authorId: post.authorId,
          author: {
            id: post.authorId,
            username: '', // Would need to fetch from user service
            displayName: '',
            avatarUrl: undefined,
          },
          content: post.content,
          mediaUrls: undefined,
          likes: post.likesCount,
          comments: post.commentsCount,
          isLiked: false, // Would need to track this
          createdAt: post.createdAt,
        })),
        nextCursor: posts.length >= PAGE_SIZE ? String(pageParam + 1) : null,
        hasMore: posts.length >= PAGE_SIZE,
      };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      // Stop fetching if we've reached max pages or no more data
      if (allPages.length >= MAX_PAGES) return undefined;
      if (!lastPage.hasMore) return undefined;
      return allPages.length + 1;
    },
    maxPages: MAX_PAGES,
    staleTime: STALE_TIMES.SOCIAL_FEED,
    gcTime: GC_TIME,
    ...options,
  });
}

/**
 * Fetch a single post by ID
 *
 * @param postId - The post's unique identifier
 * @param options - Optional TanStack Query options
 * @returns Query result with post data
 */
export function useSocialPost(
  postId: string,
  options?: Omit<
    UseInfiniteQueryOptions<SocialPost, ApiError>,
    'queryKey' | 'queryFn'
  >
) {
  // Note: This uses the base useQuery, not useInfiniteQuery
  // Keeping in this file for organization
  const { useQuery } = require('@tanstack/react-query');
  
  return useQuery({
    queryKey: queryKeys.social.post(postId),
    queryFn: async () => {
      const post = await socialService.getPost(postId);
      return {
        id: post.id,
        authorId: post.authorId,
        author: {
          id: post.authorId,
          username: '',
          displayName: '',
          avatarUrl: undefined,
        },
        content: post.content,
        mediaUrls: undefined,
        likes: post.likesCount,
        comments: post.commentsCount,
        isLiked: false,
        createdAt: post.createdAt,
      };
    },
    staleTime: STALE_TIMES.SOCIAL_FEED,
    gcTime: GC_TIME,
    enabled: !!postId,
    ...options,
  });
}
