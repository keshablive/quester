/**
 * Leaderboards API Client (T049)
 * 
 * Provides methods for interacting with the backend leaderboard endpoints.
 * Handles request/response parsing, error handling, and authentication.
 * 
 * Endpoints:
 * - GET /api/v1/leaderboards/:type - Get leaderboard by type
 * - GET /api/v1/users/:id/leaderboard-position - Get user's position
 */

import { getTokens } from '@/lib/storage/secure-storage';

// API Configuration
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';
const API_TIMEOUT = 10000; // 10 seconds

// Leaderboard Types (matching backend)
export type LeaderboardType = 'global' | 'category';
export type LeaderboardPeriod = 'alltime' | 'monthly';

// Request Types
export interface GetLeaderboardParams {
  type: LeaderboardType;
  period?: LeaderboardPeriod; // Default: alltime
  category?: string; // Required if type=category
  page?: number; // Default: 1
  limit?: number; // Default: 20, max: 100
}

export interface GetUserPositionParams {
  userId: string;
  type?: LeaderboardType; // Default: global
  period?: LeaderboardPeriod; // Default: alltime
  category?: string; // Required if type=category
}

// Response Types
export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatar?: string;
  avatarUrl?: string; // Alias for consistency
  xpPoints: number; // Renamed from metric_value for clarity
  questsCompleted?: number;
  rankChange?: number; // For trending indicators
}

export interface GetLeaderboardResponse {
  success: boolean;
  data: {
    leaderboard_type: LeaderboardType;
    period: LeaderboardPeriod;
    category?: string;
    entries: LeaderboardEntry[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      total_pages: number;
    };
  };
}

export interface UserLeaderboardPosition {
  userId: string;
  leaderboardType: LeaderboardType;
  period: LeaderboardPeriod;
  category?: string;
  rank: number; // 0 if unranked
  xpPoints: number; // Renamed from metric_value
  questsCompleted?: number;
  totalEntries: number; // Renamed from total_users
  percentile: number; // 0-100, higher is better
  rankChange?: number; // For trending indicators
}

export interface GetUserPositionResponse {
  success: boolean;
  data: UserLeaderboardPosition;
}

// Error Types
export class LeaderboardApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'LeaderboardApiError';
  }
}

// Helper Functions
async function fetchWithAuth(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const tokens = await getTokens();
  
  if (!tokens || !tokens.accessToken) {
    throw new LeaderboardApiError('No authentication token found', 401, 'UNAUTHORIZED');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokens.accessToken}`,
        ...options.headers,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new LeaderboardApiError('Request timeout', 408, 'TIMEOUT');
    }
    throw error;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    let errorCode = response.statusText.toUpperCase().replace(/\s+/g, '_');

    try {
      const errorData = await response.json();
      if (errorData.message) {
        errorMessage = errorData.message;
      }
      if (errorData.error) {
        errorCode = errorData.error;
      }
    } catch {
      // Unable to parse error response, use default message
    }

    throw new LeaderboardApiError(errorMessage, response.status, errorCode);
  }

  try {
    return await response.json();
  } catch (error) {
    throw new LeaderboardApiError('Invalid JSON response from server', 500, 'INVALID_RESPONSE');
  }
}

// Transform backend snake_case to frontend camelCase
function transformLeaderboardEntry(entry: any): LeaderboardEntry {
  return {
    rank: entry.rank,
    userId: entry.user_id || entry.userId,
    username: entry.username,
    avatar: entry.avatar || entry.avatar_url || entry.avatarUrl,
    avatarUrl: entry.avatar_url || entry.avatarUrl || entry.avatar,
    xpPoints: entry.metric_value || entry.xp_points || entry.xpPoints || 0,
    questsCompleted: entry.quests_completed || entry.questsCompleted,
    rankChange: entry.rank_change || entry.rankChange,
  };
}

function transformUserPosition(data: any): UserLeaderboardPosition {
  return {
    userId: data.user_id || data.userId,
    leaderboardType: data.leaderboard_type || data.leaderboardType || 'global',
    period: data.period || 'alltime',
    category: data.category,
    rank: data.rank || 0,
    xpPoints: data.metric_value || data.xp_points || data.xpPoints || 0,
    questsCompleted: data.quests_completed || data.questsCompleted,
    totalEntries: data.total_users || data.total_entries || data.totalEntries || 0,
    percentile: data.percentile || 0,
    rankChange: data.rank_change || data.rankChange,
  };
}

// API Client Methods

/**
 * Get leaderboard entries
 * 
 * @param params - Query parameters for filtering and pagination
 * @returns Paginated leaderboard entries with rankings
 * 
 * @example
 * ```typescript
 * // Get global all-time leaderboard
 * const response = await getLeaderboard({ type: 'global' });
 * 
 * // Get monthly quest leaderboard
 * const response = await getLeaderboard({
 *   type: 'category',
 *   period: 'monthly',
 *   category: 'quests',
 *   limit: 50
 * });
 * ```
 */
export async function getLeaderboard(
  params: GetLeaderboardParams
): Promise<GetLeaderboardResponse> {
  const {
    type,
    period = 'alltime',
    category,
    page = 1,
    limit = 20,
  } = params;

  // Validate required parameters
  if (type === 'category' && !category) {
    throw new LeaderboardApiError(
      'Category parameter is required for category leaderboards',
      400,
      'CATEGORY_REQUIRED'
    );
  }

  // Build query string
  const queryParams = new URLSearchParams({
    period,
    page: page.toString(),
    limit: limit.toString(),
  });

  if (category) {
    queryParams.append('category', category);
  }

  const endpoint = `/api/v1/leaderboards/${type}?${queryParams.toString()}`;

  try {
    const response = await fetchWithAuth(endpoint, {
      method: 'GET',
    });

    const rawResponse = await handleResponse<any>(response);
    
    // Transform response to camelCase
    return {
      success: rawResponse.success,
      data: {
        leaderboard_type: rawResponse.data?.leaderboard_type || type,
        period: rawResponse.data?.period || period,
        category: rawResponse.data?.category,
        entries: (rawResponse.data?.entries || []).map(transformLeaderboardEntry),
        pagination: rawResponse.data?.pagination || {
          page: page,
          limit: limit,
          total: 0,
          total_pages: 0,
        },
      },
    };
  } catch (error) {
    if (error instanceof LeaderboardApiError) {
      throw error;
    }
    throw new LeaderboardApiError(
      `Failed to fetch leaderboard: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500,
      'FETCH_FAILED'
    );
  }
}

/**
 * Get user's position in a leaderboard
 * 
 * @param params - User ID and leaderboard filters
 * @returns User's rank, percentile, and surrounding context
 * 
 * @example
 * ```typescript
 * // Get current user's global position
 * const response = await getUserPosition({ userId: currentUser.id });
 * 
 * // Get user's monthly quest position
 * const response = await getUserPosition({
 *   userId: 123,
 *   type: 'category',
 *   period: 'monthly',
 *   category: 'quests'
 * });
 * ```
 */
export async function getUserPosition(
  params: GetUserPositionParams
): Promise<GetUserPositionResponse> {
  const {
    userId,
    type = 'global',
    period = 'alltime',
    category,
  } = params;

  // Validate required parameters
  if (type === 'category' && !category) {
    throw new LeaderboardApiError(
      'Category parameter is required for category leaderboards',
      400,
      'CATEGORY_REQUIRED'
    );
  }

  // Build query string
  const queryParams = new URLSearchParams({
    type,
    period,
  });

  if (category) {
    queryParams.append('category', category);
  }

  const endpoint = `/api/v1/users/${userId}/leaderboard-position?${queryParams.toString()}`;

  try {
    const response = await fetchWithAuth(endpoint, {
      method: 'GET',
    });

    const rawResponse = await handleResponse<any>(response);
    
    // Transform response to camelCase
    return {
      success: rawResponse.success,
      data: transformUserPosition(rawResponse.data || {}),
    };
  } catch (error) {
    if (error instanceof LeaderboardApiError) {
      throw error;
    }
    throw new LeaderboardApiError(
      `Failed to fetch user position: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500,
      'FETCH_FAILED'
    );
  }
}

/**
 * Get multiple leaderboard positions for a user
 * Useful for displaying all user's rankings at once
 * 
 * @param userId - User ID
 * @returns Array of user positions across different leaderboards
 * 
 * @example
 * ```typescript
 * const positions = await getUserPositions(currentUser.id);
 * // Returns: [globalAlltime, globalMonthly, questsAlltime, questsMonthly]
 * ```
 */
export async function getUserPositions(
  userId: string
): Promise<UserLeaderboardPosition[]> {
  const leaderboards = [
    { type: 'global' as const, period: 'alltime' as const },
    { type: 'global' as const, period: 'monthly' as const },
    { type: 'category' as const, period: 'alltime' as const, category: 'quests' },
    { type: 'category' as const, period: 'monthly' as const, category: 'quests' },
  ];

  try {
    const responses = await Promise.all(
      leaderboards.map((lb) =>
        getUserPosition({
          userId,
          type: lb.type,
          period: lb.period,
          category: lb.category,
        })
      )
    );

    return responses.map((r) => r.data);
  } catch (error) {
    if (error instanceof LeaderboardApiError) {
      throw error;
    }
    throw new LeaderboardApiError(
      `Failed to fetch user positions: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500,
      'FETCH_FAILED'
    );
  }
}

/**
 * Check if user is ranked in a leaderboard
 * 
 * @param userId - User ID
 * @param type - Leaderboard type
 * @param period - Time period
 * @param category - Category (required for category leaderboards)
 * @returns True if user has rank > 0
 */
export async function isUserRanked(
  userId: string,
  type: LeaderboardType = 'global',
  period: LeaderboardPeriod = 'alltime',
  category?: string
): Promise<boolean> {
  try {
    const response = await getUserPosition({
      userId,
      type,
      period,
      category,
    });

    return response.data.rank > 0;
  } catch (error) {
    // If API call fails, assume not ranked
    return false;
  }
}

/**
 * Export all API methods
 */
export const leaderboardsApi = {
  getLeaderboard,
  getUserPosition,
  getUserPositions,
  isUserRanked,
};

export default leaderboardsApi;
