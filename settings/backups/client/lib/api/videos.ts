import { apiClient } from './client';

export interface StreamFilters {
  streamType?: 'live' | 'vod';
  creatorId?: string;
  status?: 'pending' | 'live' | 'ended' | 'error';
  page?: number;
  limit?: number;
}

export interface CreateStreamRequest {
  title: string;
  description?: string;
  streamType: 'live' | 'vod';
  dvrEnabled?: boolean;
  thumbnailUrl?: string;
}

export interface Stream {
  id: string;
  userId: string;
  title: string;
  description?: string;
  streamType: 'live' | 'vod';
  status: 'pending' | 'live' | 'ended' | 'error';
  dvrEnabled: boolean;
  chatEnabled?: boolean; // Added for live stream chat
  streamKey: string;
  rtmpUrl: string;
  playbackUrl: string;
  thumbnailUrl?: string;
  category?: string; // Stream category
  viewerCount: number;
  peakViewers: number;
  peakViewerCount?: number; // Alias for consistency
  totalViews: number;
  duration: number;
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StreamStats {
  streamId: string;
  currentViewers: number;
  peakViewers: number;
  totalViews: number;
  duration: number;
  bitrateKbps: number;
  resolution: string;
  fps: number;
}

export interface StreamListResponse {
  streams: Stream[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface UploadProgressCallback {
  (progress: number): void;
}

export interface UploadOptions {
  onProgress?: UploadProgressCallback;
  signal?: AbortSignal; // T565: AbortController support
  maxRetries?: number; // T568: Retry configuration
  retryDelay?: number; // T568: Initial retry delay in ms
}

export interface RFC7807Error {
  type?: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
}

/**
 * T568: Calculate exponential backoff delay
 */
function calculateRetryDelay(attempt: number, baseDelay: number = 1000): number {
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 0.1 * exponentialDelay; // Add 10% jitter
  return exponentialDelay + jitter;
}

/**
 * T567: Parse RFC 7807 error response
 */
function parseRFC7807Error(responseText: string, status: number): Error {
  try {
    const error: RFC7807Error = JSON.parse(responseText);
    const message = error.title || error.detail || `Upload failed with status ${status}`;
    return new Error(message);
  } catch {
    return new Error(`Upload failed with status ${status}`);
  }
}

/**
 * T568: Check if error is retryable
 */
function isRetryableError(status: number): boolean {
  // Retry on 5xx server errors and 429 rate limits
  return status >= 500 || status === 429;
}

/**
 * Videos API Client
 * Handles all video streaming and VOD operations
 */
export const videosApi = {
  /**
   * Create a new stream (live or VOD)
   */
  async createStream(data: CreateStreamRequest): Promise<Stream> {
    const response = await apiClient.post('/streams', data);
    return response;
  },

  /**
   * Get a single stream by ID
   */
  async getStream(streamId: string): Promise<Stream> {
    const response = await apiClient.get(`/streams/${streamId}`);
    return response;
  },

  /**
   * List streams with optional filters
   */
  async listStreams(filters?: StreamFilters): Promise<StreamListResponse> {
    const params = new URLSearchParams();
    
    if (filters?.streamType) params.append('stream_type', filters.streamType);
    if (filters?.creatorId) params.append('creator_id', filters.creatorId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const queryString = params.toString();
    const url = queryString ? `/streams?${queryString}` : '/streams';
    
    const response = await apiClient.get(url);
    return response;
  },

  /**
   * Get all active live streams
   */
  async getActiveStreams(): Promise<Stream[]> {
    const response = await apiClient.get('/streams/active');
    return response.streams;
  },

  /**
   * End a live stream
   */
  async endStream(streamId: string): Promise<Stream> {
    const response = await apiClient.post(`/streams/${streamId}/end`, {});
    return response;
  },

  /**
   * Delete a stream
   */
  async deleteStream(streamId: string): Promise<void> {
    await apiClient.delete(`/streams/${streamId}`);
  },

  /**
   * Get stream statistics
   */
  async getStreamStats(streamId: string): Promise<StreamStats> {
    const response = await apiClient.get(`/streams/${streamId}/stats`);
    return response;
  },

  /**
   * Upload a video file with progress tracking
   * T564: Authentication token support ✅
   * T565: AbortController for cancellation ✅
   * T567: RFC 7807 error parsing ✅
   * T568: Retry logic with exponential backoff ✅
   */
  async uploadVideo(
    file: File | { uri: string; name: string; type: string },
    options?: UploadOptions
  ): Promise<{ videoUrl: string; streamId: string }> {
    const maxRetries = options?.maxRetries ?? 3;
    const baseRetryDelay = options?.retryDelay ?? 1000;
    let lastError: Error | null = null;

    // T568: Retry loop with exponential backoff
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this._uploadVideoAttempt(file, options, attempt);
      } catch (error: any) {
        lastError = error;

        // T565: Don't retry if upload was cancelled
        if (error.name === 'AbortError' || error.message?.includes('cancelled')) {
          throw error;
        }

        // T568: Check if we should retry
        const isRetryable = error.status && isRetryableError(error.status);
        const hasRetriesLeft = attempt < maxRetries;

        if (!isRetryable || !hasRetriesLeft) {
          throw error;
        }

        // T568: Wait before retrying (exponential backoff)
        const delay = calculateRetryDelay(attempt, baseRetryDelay);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error('Upload failed after retries');
  },

  /**
   * Internal method for single upload attempt
   */
  async _uploadVideoAttempt(
    file: File | { uri: string; name: string; type: string },
    options?: UploadOptions,
    attempt: number = 0
  ): Promise<{ videoUrl: string; streamId: string }> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // T565: Handle abort signal
      if (options?.signal) {
        if (options.signal.aborted) {
          reject(new DOMException('Upload cancelled', 'AbortError'));
          return;
        }

        options.signal.addEventListener('abort', () => {
          xhr.abort();
          reject(new DOMException('Upload cancelled', 'AbortError'));
        });
      }

      // Progress tracking
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && options?.onProgress) {
          const progress = Math.round((event.loaded / event.total) * 100);
          options.onProgress(progress);
        }
      });

      // Success handler
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve({
              videoUrl: response.video_url || response.playbackUrl,
              streamId: response.id || response.stream_id,
            });
          } catch (err) {
            reject(new Error('Failed to parse upload response'));
          }
        } else {
          // T567: Parse RFC 7807 error response
          const error: any = parseRFC7807Error(xhr.responseText, xhr.status);
          error.status = xhr.status; // Attach status for retry logic
          reject(error);
        }
      });

      // Error handler
      xhr.addEventListener('error', () => {
        const error: any = new Error('Network error during upload');
        error.status = 0; // Network errors are retryable
        reject(error);
      });

      // Abort handler
      xhr.addEventListener('abort', () => {
        reject(new DOMException('Upload cancelled', 'AbortError'));
      });

      // Prepare form data
      const formData = new FormData();
      
      // Handle different file types (web File vs React Native asset)
      if ('uri' in file) {
        // React Native: { uri, name, type }
        formData.append('video', {
          uri: file.uri,
          name: file.name,
          type: file.type,
        } as any);
      } else {
        // Web: File object
        formData.append('video', file);
      }

      // T564: Get token from storage
      const token = apiClient.getToken();
      
      // Send request
      xhr.open('POST', `${apiClient.baseURL}/streams/upload`);
      
      // T564: Add authorization header
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      // Add retry attempt header for debugging
      if (attempt > 0) {
        xhr.setRequestHeader('X-Retry-Attempt', attempt.toString());
      }

      xhr.send(formData);
    });
  },

  /**
   * Get recommended streams for user
   */
  async getRecommendedStreams(limit: number = 10): Promise<Stream[]> {
    const response = await apiClient.get(
      `/streams/recommended?limit=${limit}`
    );
    return response.streams;
  },

  /**
   * Search streams by title or creator
   */
  async searchStreams(query: string, limit: number = 20): Promise<Stream[]> {
    const response = await apiClient.get(
      `/streams/search?q=${encodeURIComponent(query)}&limit=${limit}`
    );
    return response.streams;
  },

  /**
   * Like a stream
   */
  async likeStream(streamId: string): Promise<void> {
    await apiClient.post(`/streams/${streamId}/like`, {});
  },

  /**
   * Unlike a stream
   */
  async unlikeStream(streamId: string): Promise<void> {
    await apiClient.delete(`/streams/${streamId}/like`);
  },

  /**
   * Get user's liked streams
   */
  async getLikedStreams(page: number = 1, limit: number = 20): Promise<StreamListResponse> {
    const response = await apiClient.get(
      `/streams/liked?page=${page}&limit=${limit}`
    );
    return response;
  },

  /**
   * Report viewer count (for live streams)
   */
  async reportViewerCount(streamId: string): Promise<{ viewerCount: number }> {
    const response = await apiClient.post(
      `/streams/${streamId}/view`,
      {}
    );
    return response;
  },

  /**
   * Get stream comments
   */
  async getStreamComments(
    streamId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{
    comments: Array<{
      id: string;
      userId: string;
      userName: string;
      userAvatar?: string;
      message: string;
      createdAt: string;
    }>;
    total: number;
    hasMore: boolean;
  }> {
    const response = await apiClient.get<{
      comments: Array<{
        id: string;
        userId: string;
        userName: string;
        userAvatar?: string;
        message: string;
        createdAt: string;
      }>;
      total: number;
      hasMore: boolean;
    }>(
      `/streams/${streamId}/comments?page=${page}&limit=${limit}`
    );
    return response;
  },

  /**
   * Post a comment on a stream
   */
  async postComment(streamId: string, message: string): Promise<void> {
    await apiClient.post(`/streams/${streamId}/comments`, { message });
  },

  /**
   * Get user's streams
   */
  async getMyStreams(filters?: Omit<StreamFilters, 'creatorId'>): Promise<StreamListResponse> {
    const params = new URLSearchParams();
    
    if (filters?.streamType) params.append('stream_type', filters.streamType);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const queryString = params.toString();
    const url = queryString ? `/streams/me?${queryString}` : '/streams/me';
    
    const response = await apiClient.get(url);
    return response;
  },

  /**
   * Get master HLS playlist for ABR streaming
   * Returns the master.m3u8 playlist URL with full ABR metadata
   * 
   * @param streamKey - Stream key from stream object
   * @returns Master playlist URL
   * 
   * @example
   * ```typescript
   * const playlistUrl = videosApi.getMasterPlaylistUrl('stream-key-123');
   * // Use with video player that supports HLS
   * ```
   */
  getMasterPlaylistUrl(streamKey: string): string {
    return `${apiClient.baseURL}/streams/${streamKey}/master.m3u8`;
  },

  /**
   * Get DVR playlist for time-shifted playback
   * Allows users to seek back in time during live streams
   * 
   * @param streamKey - Stream key from stream object
   * @param seekSeconds - Optional seek position in seconds from start
   * @returns DVR playlist URL
   * 
   * @example
   * ```typescript
   * // Start from beginning
   * const dvrUrl = videosApi.getDVRPlaylistUrl('stream-key-123', 0);
   * 
   * // Seek to 5 minutes in
   * const seekUrl = videosApi.getDVRPlaylistUrl('stream-key-123', 300);
   * ```
   */
  getDVRPlaylistUrl(streamKey: string, seekSeconds?: number): string {
    const baseUrl = `${apiClient.baseURL}/streams/${streamKey}/dvr/playlist.m3u8`;
    return seekSeconds !== undefined ? `${baseUrl}?seek=${seekSeconds}` : baseUrl;
  },

  /**
   * Get recording details and playback URL
   * 
   * @param recordingId - Recording ID
   * @returns Recording object with metadata and playback URL
   * 
   * @example
   * ```typescript
   * const recording = await videosApi.getRecording('recording-uuid');
   * console.log(`Recording: ${recording.title}`);
   * console.log(`Duration: ${recording.duration}s`);
   * ```
   */
  async getRecording(recordingId: string): Promise<{
    id: string;
    streamId: string;
    title: string;
    description?: string;
    thumbnailUrl?: string;
    playbackUrl: string;
    duration: number;
    fileSize: number;
    resolution: string;
    createdAt: string;
  }> {
    const response = await apiClient.get(`/recordings/${recordingId}`);
    return response;
  },

  /**
   * Delete a recording
   * Removes recording from database and storage (S3)
   * 
   * @param recordingId - Recording ID to delete
   * 
   * @example
   * ```typescript
   * await videosApi.deleteRecording('recording-uuid');
   * console.log('Recording deleted successfully');
   * ```
   */
  async deleteRecording(recordingId: string): Promise<void> {
    await apiClient.delete(`/recordings/${recordingId}`);
  },
};
