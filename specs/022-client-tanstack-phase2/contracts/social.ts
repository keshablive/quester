/**
 * Social Hook Interfaces
 * 
 * Contract for social feed and post mutation hooks
 */

import type { 
  UseQueryResult, 
  UseMutationResult, 
  UseInfiniteQueryResult,
  InfiniteData 
} from '@tanstack/react-query';
import type { SocialPost, CreatePostInput, PaginatedResponse } from './types';

/**
 * Hook to fetch social feed with infinite scroll
 * 
 * Implements:
 * - FR-015: Cursor-based pagination (20 items per page)
 * - FR-017: Limit to 10 pages in memory (200 posts max)
 * - SC-005: 60fps scroll performance
 * 
 * @returns TanStack Infinite Query result with paginated posts
 * 
 * @example
 * ```tsx
 * const { 
 *   data, 
 *   fetchNextPage, 
 *   hasNextPage, 
 *   isFetchingNextPage 
 * } = useInfiniteSocialPosts();
 * 
 * const posts = data?.pages.flatMap(page => page.data) ?? [];
 * ```
 */
export type UseInfiniteSocialPosts = () => UseInfiniteQueryResult<
  InfiniteData<PaginatedResponse<SocialPost>>,
  Error
>;

/**
 * Hook to fetch a single post by ID
 * 
 * @param postId - The post ID to fetch
 * @returns TanStack Query result with post detail
 * 
 * @example
 * ```tsx
 * const { data: post } = useSocialPost(postId);
 * ```
 */
export type UseSocialPost = (
  postId: string
) => UseQueryResult<SocialPost, Error>;

/**
 * Optimistic update context for like mutations
 */
export interface LikePostContext {
  previousPost: SocialPost | undefined;
  previousFeed: InfiniteData<PaginatedResponse<SocialPost>> | undefined;
}

/**
 * Hook for liking a post with optimistic updates
 * 
 * Implements:
 * - FR-016: Optimistic count update
 * - FR-024: Error toast with manual retry
 * 
 * @returns TanStack Mutation result for liking posts
 * 
 * @example
 * ```tsx
 * const { mutate: likePost } = useLikePost();
 * 
 * const handleLike = () => {
 *   likePost(postId);
 * };
 * ```
 */
export type UseLikePost = () => UseMutationResult<
  SocialPost,
  Error,
  string, // postId
  LikePostContext
>;

/**
 * Hook for unliking a post with optimistic updates
 * 
 * @returns TanStack Mutation result for unliking posts
 */
export type UseUnlikePost = () => UseMutationResult<
  SocialPost,
  Error,
  string, // postId
  LikePostContext
>;

/**
 * Hook for creating a new post
 * 
 * @returns TanStack Mutation result for creating posts
 * 
 * @example
 * ```tsx
 * const { mutate: createPost, isPending } = useCreatePost();
 * 
 * const handleSubmit = (content: string) => {
 *   createPost({ content });
 * };
 * ```
 */
export type UseCreatePost = () => UseMutationResult<
  SocialPost,
  Error,
  CreatePostInput,
  unknown
>;

/**
 * Context for delete post mutation
 */
export interface DeletePostContext {
  previousFeed: InfiniteData<PaginatedResponse<SocialPost>> | undefined;
}

/**
 * Hook for deleting a post with optimistic removal
 * 
 * @returns TanStack Mutation result for deleting posts
 */
export type UseDeletePost = () => UseMutationResult<
  void,
  Error,
  string, // postId
  DeletePostContext
>;

/**
 * Configuration for social hooks
 */
export const SOCIAL_CONFIG = {
  /** Stale time for social feed in milliseconds (2 minutes) */
  feedStaleTime: 2 * 60 * 1000,
  /** Page size for infinite scroll (per clarification) */
  pageSize: 20,
  /** Maximum pages to keep in memory (per clarification) */
  maxPages: 10,
  /** Query key prefix */
  queryKeyPrefix: 'social',
} as const;
