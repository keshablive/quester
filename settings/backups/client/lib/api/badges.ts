/**
 * Badges API Client (T027)
 * 
 * Provides methods for interacting with the backend badge endpoints.
 * Handles request/response parsing, error handling, and authentication.
 * 
 * Endpoints:
 * - GET /api/v1/badges - Get all available badges
 * - GET /api/v1/users/:id/badges - Get user's earned badges
 * - POST /api/v1/users/:id/badges/:badge_id/approve - Approve badge (admin)
 * - POST /api/v1/users/:id/badges/:badge_id/reject - Reject badge (admin)
 * - POST /api/v1/users/:id/badges/:badge_id/revoke - Revoke badge (admin)
 */

import { getTokens } from '@/lib/storage/secure-storage';

// API Configuration
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';
const API_TIMEOUT = 10000; // 10 seconds

// Badge Types (matching backend)
export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'platinum';
export type BadgeCategory = 'quest' | 'social' | 'learning';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'revoked';

// Request Types
export interface GetBadgesParams {
  page?: number;
  limit?: number;
  category?: BadgeCategory;
  tier?: BadgeTier;
}

export interface GetUserBadgesParams {
  status?: ApprovalStatus;
  page?: number;
  limit?: number;
}

export interface ApproveBadgeRequest {
  notes?: string;
}

export interface RejectBadgeRequest {
  reason: string;
}

export interface RevokeBadgeRequest {
  reason: string;
}

// Response Types
export interface Badge {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  icon_url: string;
  tier: BadgeTier;
  points_threshold: number;
  auto_award: boolean;
  category: BadgeCategory;
  created_at: string;
  updated_at: string;
}

export interface UserBadge {
  id: string;
  tenant_id: string;
  user_id: string;
  badge_id: string;
  approval_status: ApprovalStatus;
  earned_at: string;
  approved_at?: string;
  approved_by?: string;
  rejected_at?: string;
  rejected_by?: string;
  revoked_at?: string;
  revoked_by?: string;
  notes?: string;
  evidence_url?: string;
  created_at: string;
  updated_at: string;
  // Populated badge data
  badge?: Badge;
}

export interface GetBadgesResponse {
  success: boolean;
  data: {
    badges: Badge[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      total_pages: number;
    };
  };
}

export interface GetUserBadgesResponse {
  success: boolean;
  data: {
    badges: UserBadge[];
    userBadges?: UserBadge[]; // Alias for compatibility
    pagination: {
      page: number;
      limit: number;
      total: number;
      total_pages: number;
    };
  };
}

export interface ApproveBadgeResponse {
  success: boolean;
  data: {
    user_badge: UserBadge;
  };
  message: string;
}

export interface RejectBadgeResponse {
  success: boolean;
  data: {
    user_badge: UserBadge;
  };
  message: string;
}

export interface RevokeBadgeResponse {
  success: boolean;
  data: {
    user_badge: UserBadge;
  };
  message: string;
}

// Error Types
export class BadgeApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'BadgeApiError';
  }
}

// Helper Functions
async function fetchWithAuth(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const tokens = await getTokens();
  
  if (!tokens || !tokens.accessToken) {
    throw new BadgeApiError('No authentication token found', 401, 'UNAUTHORIZED');
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
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new BadgeApiError('Request timeout', 408, 'TIMEOUT');
    }
    throw error;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new BadgeApiError(
      error.message || `HTTP ${response.status}`,
      response.status,
      error.code
    );
  }

  return response.json();
}

// API Methods

/**
 * Get all available badges
 * Supports pagination and filtering by category/tier
 */
export async function getBadges(params?: GetBadgesParams): Promise<GetBadgesResponse> {
  const queryParams = new URLSearchParams();
  
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.category) queryParams.append('category', params.category);
  if (params?.tier) queryParams.append('tier', params.tier);

  const query = queryParams.toString();
  const endpoint = `/api/v1/badges${query ? `?${query}` : ''}`;

  const response = await fetchWithAuth(endpoint);
  return handleResponse<GetBadgesResponse>(response);
}

/**
 * Get badges earned by a specific user
 * Supports filtering by approval status
 */
export async function getUserBadges(
  userId: string,
  params?: GetUserBadgesParams
): Promise<GetUserBadgesResponse> {
  const queryParams = new URLSearchParams();
  
  if (params?.status) queryParams.append('status', params.status);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());

  const query = queryParams.toString();
  const endpoint = `/api/v1/users/${userId}/badges${query ? `?${query}` : ''}`;

  const response = await fetchWithAuth(endpoint);
  return handleResponse<GetUserBadgesResponse>(response);
}

/**
 * Approve a pending badge (admin/moderator only)
 */
export async function approveBadge(
  userId: string,
  badgeId: string,
  request?: ApproveBadgeRequest
): Promise<ApproveBadgeResponse> {
  const endpoint = `/api/v1/users/${userId}/badges/${badgeId}/approve`;

  const response = await fetchWithAuth(endpoint, {
    method: 'POST',
    body: JSON.stringify(request || {}),
  });

  return handleResponse<ApproveBadgeResponse>(response);
}

/**
 * Reject a pending badge (admin/moderator only)
 */
export async function rejectBadge(
  userId: string,
  badgeId: string,
  request: RejectBadgeRequest
): Promise<RejectBadgeResponse> {
  const endpoint = `/api/v1/users/${userId}/badges/${badgeId}/reject`;

  const response = await fetchWithAuth(endpoint, {
    method: 'POST',
    body: JSON.stringify(request),
  });

  return handleResponse<RejectBadgeResponse>(response);
}

/**
 * Revoke an earned badge (admin only)
 */
export async function revokeBadge(
  userId: string,
  badgeId: string,
  request: RevokeBadgeRequest
): Promise<RevokeBadgeResponse> {
  const endpoint = `/api/v1/users/${userId}/badges/${badgeId}/revoke`;

  const response = await fetchWithAuth(endpoint, {
    method: 'POST',
    body: JSON.stringify(request),
  });

  return handleResponse<RevokeBadgeResponse>(response);
}
