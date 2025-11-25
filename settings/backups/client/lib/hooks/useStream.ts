import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { videosApi, StreamFilters, CreateStreamRequest } from '../api/videos';

const VIEWER_COUNT_INTERVAL = 10000; // 10 seconds
const ACTIVE_STREAMS_REFETCH = 30000; // 30 seconds

/**
 * Hook for managing a single stream
 */
export function useStream(streamId: string | null) {
  const queryClient = useQueryClient();
  const viewerReportInterval = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch stream details
  const {
    data: stream,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['stream', streamId],
    queryFn: () => videosApi.getStream(streamId!),
    enabled: !!streamId,
    refetchInterval: (query) => {
      // Auto-refetch live streams more frequently
      return query.state.data?.status === 'live' ? 10000 : false;
    },
  });

  // Fetch stream stats
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['stream-stats', streamId],
    queryFn: () => videosApi.getStreamStats(streamId!),
    enabled: !!streamId && stream?.status === 'live',
    refetchInterval: 5000, // Update stats every 5 seconds for live streams
  });

  // Report viewer presence for live streams
  useEffect(() => {
    if (!streamId || stream?.status !== 'live') {
      if (viewerReportInterval.current) {
        clearInterval(viewerReportInterval.current);
        viewerReportInterval.current = null;
      }
      return;
    }

    // Initial report
    videosApi.reportViewerCount(streamId).catch(console.error);

    // Set up interval for continued reporting
    viewerReportInterval.current = setInterval(() => {
      videosApi.reportViewerCount(streamId).catch(console.error);
    }, VIEWER_COUNT_INTERVAL);

    return () => {
      if (viewerReportInterval.current) {
        clearInterval(viewerReportInterval.current);
      }
    };
  }, [streamId, stream?.status]);

  // End stream mutation
  const endStreamMutation = useMutation({
    mutationFn: (id: string) => videosApi.endStream(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stream', streamId] });
      queryClient.invalidateQueries({ queryKey: ['streams'] });
      queryClient.invalidateQueries({ queryKey: ['active-streams'] });
    },
  });

  // Delete stream mutation
  const deleteStreamMutation = useMutation({
    mutationFn: (id: string) => videosApi.deleteStream(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['streams'] });
      queryClient.removeQueries({ queryKey: ['stream', streamId] });
    },
  });

  return {
    stream,
    stats,
    isLoading,
    error,
    refetch,
    refetchStats,
    endStream: endStreamMutation.mutateAsync,
    deleteStream: deleteStreamMutation.mutateAsync,
    isEnding: endStreamMutation.isPending,
    isDeleting: deleteStreamMutation.isPending,
  };
}

/**
 * Hook for managing stream lists
 */
export function useStreams(filters?: StreamFilters) {
  const [page, setPage] = useState(filters?.page || 1);

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['streams', { ...filters, page }],
    queryFn: () => videosApi.listStreams({ ...filters, page }),
    refetchOnWindowFocus: false,
  });

  const streams = data?.streams || [];
  const total = data?.total || 0;
  const hasMore = data?.hasMore || false;

  const loadMore = useCallback(() => {
    if (hasMore && !isLoading) {
      setPage((prev) => prev + 1);
    }
  }, [hasMore, isLoading]);

  return {
    streams,
    total,
    isLoading,
    error,
    refetch,
    loadMore,
    hasMore,
    isLoadingMore: isLoading && page > 1,
  };
}

/**
 * Hook for managing active live streams
 */
export function useActiveStreams() {
  const {
    data: streams = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['active-streams'],
    queryFn: () => videosApi.getActiveStreams(),
    refetchInterval: ACTIVE_STREAMS_REFETCH,
  });

  return {
    activeStreams: streams,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook for creating streams
 */
export function useCreateStream() {
  const _queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: CreateStreamRequest) => videosApi.createStream(data),
    onSuccess: (newStream) => {
      _queryClient.invalidateQueries({ queryKey: ['streams'] });
      _queryClient.setQueryData(['stream', newStream.id], newStream);
    },
  });

  return {
    createStream: mutation.mutateAsync,
    isCreating: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Hook for uploading videos
 */
export function useVideoUpload() {
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortController = useRef<XMLHttpRequest | null>(null);
  const queryClient = useQueryClient();

  const uploadVideo = useCallback(
    async (file: File | { uri: string; name: string; type: string }, options?: { onProgress?: (progress: number) => void }) => {
      setIsUploading(true);
      setProgress(0);
      setError(null);

      try {
        const result = await videosApi.uploadVideo(file, {
          onProgress: options?.onProgress || ((progressValue: number) => {
            setProgress(progressValue);
          })
        });

        // Invalidate streams cache after successful upload
        queryClient.invalidateQueries({ queryKey: ['streams'] });
        queryClient.invalidateQueries({ queryKey: ['stream', result.streamId] });

        setIsUploading(false);
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Upload failed';
        setError(errorMessage);
        setIsUploading(false);
        throw err;
      }
    },
    [queryClient]
  );

  const cancelUpload = useCallback(() => {
    if (abortController.current) {
      abortController.current.abort();
      setIsUploading(false);
      setProgress(0);
      setError('Upload cancelled');
    }
  }, []);

  const reset = useCallback(() => {
    setProgress(0);
    setIsUploading(false);
    setError(null);
  }, []);

  return {
    uploadVideo,
    cancelUpload,
    reset,
    progress,
    isUploading,
    error,
  };
}

/**
 * Hook for stream interactions (like, comment)
 */
export function useStreamInteractions(streamId: string) {
  const queryClient = useQueryClient();

  const likeMutation = useMutation({
    mutationFn: () => videosApi.likeStream(streamId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stream', streamId] });
    },
  });

  const unlikeMutation = useMutation({
    mutationFn: () => videosApi.unlikeStream(streamId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stream', streamId] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: (message: string) => videosApi.postComment(streamId, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stream-comments', streamId] });
    },
  });

  const { data: comments, isLoading: isLoadingComments } = useQuery({
    queryKey: ['stream-comments', streamId],
    queryFn: () => videosApi.getStreamComments(streamId),
    enabled: !!streamId,
  });

  return {
    like: likeMutation.mutateAsync,
    unlike: unlikeMutation.mutateAsync,
    postComment: commentMutation.mutateAsync,
    comments: comments?.comments || [],
    isLoadingComments,
    isLiking: likeMutation.isPending,
    isCommenting: commentMutation.isPending,
  };
}

/**
 * Hook for searching streams
 */
export function useStreamSearch(initialQuery: string = '') {
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  const {
    data: streams = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['stream-search', debouncedQuery],
    queryFn: () => videosApi.searchStreams(debouncedQuery),
    enabled: debouncedQuery.length > 0,
  });

  return {
    query,
    setQuery,
    streams,
    isSearching: isLoading,
    error,
  };
}

/**
 * Hook for recommended streams
 */
export function useRecommendedStreams(limit: number = 10) {
  const {
    data: streams = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['recommended-streams', limit],
    queryFn: () => videosApi.getRecommendedStreams(limit),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    recommendedStreams: streams,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook for user's own streams
 */
export function useMyStreams(filters?: Omit<StreamFilters, 'creatorId'>) {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['my-streams', filters],
    queryFn: () => videosApi.getMyStreams(filters),
    refetchOnWindowFocus: false,
  });

  return {
    myStreams: data?.streams || [],
    total: data?.total || 0,
    isLoading,
    error,
    refetch,
    hasMore: data?.hasMore || false,
  };
}
