import { apiClient } from './client';

export interface Interaction {
  id: string;
  tenant_id: string;
  user_id: string;
  user_name?: string;
  user_avatar?: string;
  target_type: string;
  target_id: string;
  interaction_type: 'like' | 'comment' | 'share' | 'rate';
  content?: string;
  rating?: number;
  parent_interaction_id?: string;
  depth: number;
  moderation_status: 'pending' | 'approved' | 'flagged' | 'rejected';
  children_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateInteractionRequest {
  target_type: string;
  target_id: string;
  interaction_type: 'like' | 'comment' | 'share' | 'rate';
  content?: string;
  rating?: number;
  parent_interaction_id?: string;
}

export interface InteractionFilters {
  target_type: string;
  target_id: string;
  interaction_type?: string;
  user_id?: string;
  parent_id?: string;
  limit?: number;
  page?: number;
}

export interface InteractionCounts {
  likes_count: number;
  comments_count: number;
  shares_count: number;
  ratings_count: number;
  avg_rating: number;
}

export interface UserInteractionStatus {
  has_liked: boolean;
  user_rating: number | null;
}

export interface ModerationQueueItem {
  id: string;
  tenant_id: string;
  content_id: string;
  content_type: string;
  content: Interaction;
  confidence_score: number;
  ai_categories: Record<string, number>;
  highest_category: string;
  flagged_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  reviewer?: {
    id: string;
    name: string;
  };
  review_action?: string;
  review_reason?: string;
}

export interface ModerationStats {
  total_flagged: number;
  total_reviewed: number;
  pending_review: number;
  auto_approved_count: number;
  auto_rejected_count: number;
  manual_approved_count: number;
  manual_rejected_count: number;
  approval_rate: number;
  rejection_rate: number;
  avg_review_time_minutes: number;
  flagged_by_category: Record<string, number>;
}

export interface AccuracyDrift {
  drift_detected: boolean;
  drift_percentage: number;
  threshold: number;
  ai_accuracy: number;
  total_reviewed: number;
  ai_approved: number;
  human_approved: number;
  ai_rejected: number;
  human_rejected: number;
  disagreements: number;
}

export interface ModerationConfig {
  id?: string;
  tenant_id: string;
  content_type: string;
  auto_remove_threshold: number;
  review_threshold: number;
  auto_approve: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Create a new interaction (like, comment, share, rate)
 * @param data Interaction data
 * @returns Created interaction with moderation status
 */
export async function createInteraction(
  data: CreateInteractionRequest
): Promise<Interaction> {
  return await apiClient.post('/interactions', data);
}

/**
 * Get interactions for a target entity
 * @param filters Filter parameters
 * @returns Paginated list of interactions
 */
export async function getInteractions(filters: InteractionFilters): Promise<{
  data: Interaction[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}> {
  const params = new URLSearchParams();
  params.append('target_type', filters.target_type);
  params.append('target_id', filters.target_id.toString());

  if (filters.interaction_type) params.append('interaction_type', filters.interaction_type);
  if (filters.user_id) params.append('user_id', filters.user_id.toString());
  if (filters.parent_id) params.append('parent_id', filters.parent_id.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());
  if (filters.page) params.append('page', filters.page.toString());

  return await apiClient.get(`/interactions?${params.toString()}`);
}

/**
 * Get a single interaction by ID
 * @param id Interaction ID
 * @returns Interaction details
 */
export async function getInteractionById(id: string): Promise<Interaction> {
  return await apiClient.get(`/interactions/${id}`);
}

/**
 * Get child interactions (nested comments)
 * @param parentId Parent interaction ID
 * @param limit Number of results per page
 * @param page Page number
 * @returns Paginated list of child interactions
 */
export async function getChildInteractions(
  parentId: string,
  limit = 20,
  page = 1
): Promise<{
  data: Interaction[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}> {
  return await apiClient.get(
    `/interactions/${parentId}/children?limit=${limit}&page=${page}`
  );
}

/**
 * Delete an interaction (owner only)
 * @param id Interaction ID
 */
export async function deleteInteraction(id: string): Promise<void> {
  await apiClient.delete(`/interactions/${id}`);
}

/**
 * Get aggregated interaction counts for a target
 * @param targetType Target entity type
 * @param targetId Target entity ID
 * @returns Interaction counts
 */
export async function getInteractionCounts(
  targetType: string,
  targetId: string
): Promise<InteractionCounts> {
  return await apiClient.get(
    `/interactions/counts?target_type=${targetType}&target_id=${targetId}`
  );
}

/**
 * Get user's interaction status with a target
 * @param targetType Target entity type
 * @param targetId Target entity ID
 * @returns User interaction status (has_liked, user_rating)
 */
export async function getUserInteractionStatus(
  targetType: string,
  targetId: string
): Promise<UserInteractionStatus> {
  return await apiClient.get(
    `/interactions/status?target_type=${targetType}&target_id=${targetId}`
  );
}

// ==================== MODERATION ENDPOINTS (ADMIN ONLY) ====================

/**
 * Get moderation queue (admin only)
 * @param status Filter by status (pending/reviewed)
 * @param limit Number of results per page
 * @param page Page number
 * @returns Paginated moderation queue
 */
export async function getModerationQueue(
  status: 'pending' | 'reviewed' = 'pending',
  limit = 20,
  page = 1
): Promise<{
  data: ModerationQueueItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}> {
  return await apiClient.get(
    `/moderation/queue?status=${status}&limit=${limit}&page=${page}`
  );
}

/**
 * Review flagged content (admin only)
 * @param queueId Queue item ID
 * @param action Review action (approve/remove/warn/ban)
 * @param reason Optional reason for action
 */
export async function reviewContent(
  queueId: string,
  action: 'approve' | 'remove' | 'warn' | 'ban',
  reason?: string
): Promise<void> {
  await apiClient.post(`/moderation/${queueId}/review`, { action, reason });
}

/**
 * Get moderation statistics (admin only)
 * @param days Number of days to analyze (default 30)
 * @returns Moderation statistics
 */
export async function getModerationStats(days = 30): Promise<ModerationStats> {
  return await apiClient.get(
    `/moderation/stats?days=${days}`
  );
}

/**
 * Detect accuracy drift in AI moderation (admin only)
 * @param days Number of days to analyze (default 30)
 * @param threshold Drift threshold percentage (default 5)
 * @returns Drift detection results
 */
export async function getAccuracyDrift(
  days = 30,
  threshold = 5
): Promise<AccuracyDrift> {
  return await apiClient.get(
    `/moderation/drift?days=${days}&threshold=${threshold}`
  );
}

/**
 * Get moderation configuration for content type (admin only)
 * @param contentType Content type (e.g., "comment", "post")
 * @returns Moderation config
 */
export async function getModerationConfig(
  contentType: string
): Promise<ModerationConfig> {
  return await apiClient.get(
    `/moderation/config/${contentType}`
  );
}

/**
 * Update moderation configuration (admin only)
 * @param contentType Content type
 * @param config Configuration values
 * @returns Updated config
 */
export async function updateModerationConfig(
  contentType: string,
  config: {
    auto_remove_threshold: number;
    review_threshold: number;
    auto_approve: boolean;
  }
): Promise<ModerationConfig> {
  return await apiClient.put(
    `/moderation/config/${contentType}`,
    config
  );
}
