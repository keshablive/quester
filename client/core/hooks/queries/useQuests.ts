/**
 * Quest Query Hooks
 *
 * TanStack Query hooks for fetching quest data with caching.
 * Quests have a 2-minute stale time due to frequent progress changes.
 *
 * @module core/hooks/queries/useQuests
 */

import {
  useQuery,
  useInfiniteQuery,
  type UseQueryOptions,
  type UseQueryResult,
  type UseInfiniteQueryOptions,
  type UseInfiniteQueryResult,
  type InfiniteData,
} from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { queryKeys } from '../../query/keys';
import { STALE_TIMES } from '../../query/constants';
import type {
  Quest,
  QuestProgress,
  QuestFilters,
  PaginatedResponse,
  ApiError,
} from '../../types/query.types';

/**
 * Fetch quests with infinite scroll
 *
 * @param filters - Optional filters (status, type, difficulty)
 * @param options - Optional TanStack Query options
 * @returns Infinite query result with paginated quests
 *
 * @example
 * ```tsx
 * function QuestList() {
 *   const { data, fetchNextPage, hasNextPage } = useQuests({
 *     status: 'available',
 *   });
 *
 *   const quests = data?.pages.flatMap(page => page.items) ?? [];
 *
 *   return (
 *     <FlatList
 *       data={quests}
 *       renderItem={({ item }) => <QuestCard quest={item} />}
 *       onEndReached={() => hasNextPage && fetchNextPage()}
 *     />
 *   );
 * }
 * ```
 */
export function useQuests(
  filters?: QuestFilters,
  options?: Omit<
    UseInfiniteQueryOptions<
      PaginatedResponse<Quest>,
      ApiError,
      InfiniteData<PaginatedResponse<Quest>>,
      readonly unknown[],
      string
    >,
    'queryKey' | 'queryFn' | 'getNextPageParam' | 'initialPageParam'
  >
): UseInfiniteQueryResult<
  InfiniteData<PaginatedResponse<Quest>>,
  ApiError
> {
  return useInfiniteQuery({
    queryKey: queryKeys.quests.infinite(filters),
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      if (pageParam) params.set('cursor', pageParam);
      params.set('limit', '20');
      if (filters?.status) params.set('status', filters.status);
      if (filters?.type) params.set('type', filters.type);
      if (filters?.difficulty) params.set('difficulty', filters.difficulty);

      return apiClient.get<PaginatedResponse<Quest>>(
        `/quests?${params.toString()}`
      );
    },
    initialPageParam: '',
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: STALE_TIMES.QUESTS,
    ...options,
  });
}

/**
 * Fetch a single quest by ID
 *
 * @param questId - The quest's unique identifier
 * @param options - Optional TanStack Query options
 * @returns Query result with quest data
 *
 * @example
 * ```tsx
 * function QuestDetail({ questId }) {
 *   const { data: quest, isLoading, error } = useQuest(questId);
 *
 *   if (isLoading) return <QuestSkeleton />;
 *   if (error) return <ErrorMessage error={error} />;
 *
 *   return (
 *     <View>
 *       <Text>{quest.title}</Text>
 *       <Text>XP Reward: {quest.xpReward}</Text>
 *       {quest.steps.map(step => (
 *         <QuestStep key={step.id} step={step} />
 *       ))}
 *     </View>
 *   );
 * }
 * ```
 */
export function useQuest(
  questId: string,
  options?: Omit<
    UseQueryOptions<Quest, ApiError>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<Quest, ApiError> {
  return useQuery({
    queryKey: queryKeys.quests.detail(questId),
    queryFn: () => apiClient.get<Quest>(`/quests/${questId}`),
    staleTime: STALE_TIMES.QUESTS,
    enabled: !!questId,
    ...options,
  });
}

/**
 * Fetch daily quests
 *
 * Daily quests refresh frequently (2-minute stale time)
 * to show updated progress and new daily challenges.
 *
 * @param options - Optional TanStack Query options
 * @returns Query result with daily quests
 *
 * @example
 * ```tsx
 * function DailyQuests() {
 *   const { data: quests, isLoading } = useDailyQuests();
 *
 *   if (isLoading) return <DailyQuestsSkeleton />;
 *
 *   return (
 *     <View>
 *       <Text>Daily Challenges</Text>
 *       {quests?.map(quest => (
 *         <DailyQuestCard key={quest.id} quest={quest} />
 *       ))}
 *     </View>
 *   );
 * }
 * ```
 */
export function useDailyQuests(
  options?: Omit<
    UseQueryOptions<Quest[], ApiError>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<Quest[], ApiError> {
  return useQuery({
    queryKey: queryKeys.quests.daily(),
    queryFn: () => apiClient.get<Quest[]>('/quests/daily'),
    staleTime: STALE_TIMES.QUESTS,
    // Daily quests are important - refetch more aggressively
    refetchOnWindowFocus: true,
    ...options,
  });
}

/**
 * Fetch quest progress for current user
 *
 * @param questId - The quest's unique identifier
 * @param options - Optional TanStack Query options
 * @returns Query result with quest progress
 */
export function useQuestProgress(
  questId: string,
  options?: Omit<
    UseQueryOptions<QuestProgress, ApiError>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<QuestProgress, ApiError> {
  return useQuery({
    queryKey: queryKeys.quests.progress(questId),
    queryFn: () =>
      apiClient.get<QuestProgress>(`/quests/${questId}/progress`),
    staleTime: STALE_TIMES.QUESTS,
    enabled: !!questId,
    ...options,
  });
}

/**
 * Fetch active quests for current user
 *
 * @param options - Optional TanStack Query options
 * @returns Query result with active quests
 */
export function useActiveQuests(
  options?: Omit<
    UseQueryOptions<Quest[], ApiError>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<Quest[], ApiError> {
  return useQuery({
    queryKey: queryKeys.quests.list({ status: 'active' }),
    queryFn: () => apiClient.get<Quest[]>('/quests?status=active'),
    staleTime: STALE_TIMES.QUESTS,
    ...options,
  });
}

/**
 * Fetch completed quests for current user
 *
 * @param options - Optional TanStack Query options
 * @returns Query result with completed quests
 */
export function useCompletedQuests(
  options?: Omit<
    UseQueryOptions<Quest[], ApiError>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<Quest[], ApiError> {
  return useQuery({
    queryKey: queryKeys.quests.list({ status: 'completed' }),
    queryFn: () => apiClient.get<Quest[]>('/quests?status=completed'),
    staleTime: STALE_TIMES.QUESTS,
    ...options,
  });
}
