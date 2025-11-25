import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Interaction,
  createInteraction,
  getInteractions,
  deleteInteraction,
  getChildInteractions,
  getInteractionCounts,
  getUserInteractionStatus,
  InteractionCounts,
  UserInteractionStatus,
  CreateInteractionRequest,
} from '../api/interactions';
import { useWebSocket } from './useWebSocket';

interface UseInteractionsOptions {
  targetType: string;
  targetId: string;
  interactionType?: 'like' | 'comment' | 'share' | 'rate';
  autoLoad?: boolean;
  pageSize?: number;
  enableRealtime?: boolean;
}

interface UseInteractionsReturn {
  // Data
  comments: Interaction[];
  counts: InteractionCounts | null;
  userStatus: UserInteractionStatus | null;
  
  // State
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  
  // Actions
  createComment: (data: Omit<CreateInteractionRequest, 'target_type' | 'target_id' | 'interaction_type'>) => Promise<Interaction>;
  createLike: () => Promise<Interaction>;
  createShare: () => Promise<Interaction>;
  createRating: (rating: number) => Promise<Interaction>;
  deleteComment: (id: string) => Promise<void>;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  loadChildComments: (parentId: string) => Promise<void>;
  loadCounts: () => Promise<void>;
  loadUserStatus: () => Promise<void>;
}

export function useInteractions(options: UseInteractionsOptions): UseInteractionsReturn {
  const {
    targetType,
    targetId,
    interactionType,
    autoLoad = true,
    pageSize = 20,
    enableRealtime = true,
  } = options;

  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [counts, setCounts] = useState<InteractionCounts | null>(null);
  const [userStatus, setUserStatus] = useState<UserInteractionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadingRef = useRef(false);

  // WebSocket for real-time updates (optional, configured per environment)
  const wsUrl = process.env.EXPO_PUBLIC_WS_URL || '';
  const hasWebSocket = enableRealtime && wsUrl;
  
  // Only initialize WebSocket if enabled and URL is available
  const ws = hasWebSocket
    ? useWebSocket({ url: wsUrl })
    : { subscribe: () => () => {} }; // Mock for when WebSocket is disabled

  // Load interactions
  const loadInteractions = useCallback(
    async (pageNum: number, append = false) => {
      if (loadingRef.current) return;

      loadingRef.current = true;
      setLoading(true);
      setError(null);

      try {
        const response = await getInteractions({
          target_type: targetType,
          target_id: targetId,
          interaction_type: interactionType,
          limit: pageSize,
          page: pageNum,
        });

        setInteractions((prev) =>
          append ? [...prev, ...response.data] : response.data
        );

        setHasMore(response.meta.page < response.meta.pages);
      } catch (err: any) {
        setError(err.message || 'Failed to load interactions');
      } finally {
        setLoading(false);
        loadingRef.current = false;
      }
    },
    [targetType, targetId, interactionType, pageSize]
  );

  // Load counts
  const loadCounts = useCallback(async () => {
    try {
      const countsData = await getInteractionCounts(targetType, targetId);
      setCounts(countsData);
    } catch (err: any) {
      console.error('Failed to load counts:', err);
    }
  }, [targetType, targetId]);

  // Load user status
  const loadUserStatus = useCallback(async () => {
    try {
      const statusData = await getUserInteractionStatus(targetType, targetId);
      setUserStatus(statusData);
    } catch (err: any) {
      console.error('Failed to load user status:', err);
    }
  }, [targetType, targetId]);

  // Create comment
  const createComment = useCallback(
    async (data: Omit<CreateInteractionRequest, 'target_type' | 'target_id' | 'interaction_type'>) => {
      const result = await createInteraction({
        ...data,
        target_type: targetType,
        target_id: targetId,
        interaction_type: 'comment',
      });

      // Add to list if approved
      if (result.moderation_status === 'approved') {
        setInteractions((prev) => [result, ...prev]);
      }

      // Refresh counts
      await loadCounts();

      return result;
    },
    [targetType, targetId, loadCounts]
  );

  // Create like
  const createLike = useCallback(async () => {
    const result = await createInteraction({
      target_type: targetType,
      target_id: targetId,
      interaction_type: 'like',
    });

    // Refresh counts and user status
    await Promise.all([loadCounts(), loadUserStatus()]);

    return result;
  }, [targetType, targetId, loadCounts, loadUserStatus]);

  // Create share
  const createShare = useCallback(async () => {
    const result = await createInteraction({
      target_type: targetType,
      target_id: targetId,
      interaction_type: 'share',
    });

    // Refresh counts
    await loadCounts();

    return result;
  }, [targetType, targetId, loadCounts]);

  // Create rating
  const createRating = useCallback(
    async (rating: number) => {
      const result = await createInteraction({
        target_type: targetType,
        target_id: targetId,
        interaction_type: 'rate',
        rating,
      });

      // Refresh counts and user status
      await Promise.all([loadCounts(), loadUserStatus()]);

      return result;
    },
    [targetType, targetId, loadCounts, loadUserStatus]
  );

  // Delete interaction
  const deleteInteractionHandler = useCallback(
    async (id: string) => {
      await deleteInteraction(id);

      // Remove from list
      setInteractions((prev) => prev.filter((i) => i.id !== id));

      // Refresh counts
      await loadCounts();
    },
    [loadCounts]
  );

  // Load more
  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    await loadInteractions(nextPage, true);
  }, [hasMore, loading, page, loadInteractions]);

  // Refresh
  const refresh = useCallback(async () => {
    setPage(1);
    setHasMore(true);
    await Promise.all([
      loadInteractions(1, false),
      loadCounts(),
      loadUserStatus(),
    ]);
  }, [loadInteractions, loadCounts, loadUserStatus]);

  // Load child comments
  const loadChildComments = useCallback(
    async (parentId: string) => {
      try {
        const response = await getChildInteractions(parentId);

        // Insert child comments after parent
        setInteractions((prev) => {
          const parentIndex = prev.findIndex((i) => i.id === parentId);
          if (parentIndex === -1) return prev;

          const before = prev.slice(0, parentIndex + 1);
          const after = prev.slice(parentIndex + 1);

          // Filter out existing children to avoid duplicates
          const existingChildIds = new Set(prev.map((i) => i.id));
          const newChildren = response.data.filter(
            (child) => !existingChildIds.has(child.id)
          );

          return [...before, ...newChildren, ...after];
        });
      } catch (err: any) {
        console.error('Failed to load child comments:', err);
      }
    },
    []
  );

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad) {
      refresh();
    }
  }, [targetType, targetId, interactionType]); // eslint-disable-line react-hooks/exhaustive-deps

  // Real-time updates via WebSocket
  useEffect(() => {
    if (!hasWebSocket) return;

    const handleNewInteraction = (payload: Interaction) => {
      if (payload.moderation_status === 'approved') {
        setInteractions((prev) => {
          // Avoid duplicates
          if (prev.some((i) => i.id === payload.id)) return prev;
          return [payload, ...prev];
        });
      }

      // Refresh counts
      loadCounts();
    };

    const handleDeletedInteraction = (payload: { id: string | number }) => {
      setInteractions((prev) => prev.filter((i) => String(i.id) !== String(payload.id)));
      loadCounts();
    };

    // Subscribe to events and get unsubscribe functions
    const unsubscribeNew = ws.subscribe('new_interaction', handleNewInteraction);
    const unsubscribeDeleted = ws.subscribe('deleted_interaction', handleDeletedInteraction);

    return () => {
      unsubscribeNew();
      unsubscribeDeleted();
    };
  }, [hasWebSocket, ws, loadCounts]);

  return {
    comments: interactions,
    counts,
    userStatus,
    loading,
    error,
    hasMore,
    createComment,
    createLike,
    createShare,
    createRating,
    deleteComment: deleteInteractionHandler,
    loadMore,
    refresh,
    loadChildComments,
    loadCounts,
    loadUserStatus,
  };
}
