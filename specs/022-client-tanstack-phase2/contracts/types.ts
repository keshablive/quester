/**
 * Type definitions for Phase 2 TanStack Query Migration
 * 
 * These types should be added to client/core/types/query.types.ts
 */

// ============================================================================
// Achievement Types
// ============================================================================

export type AchievementCategory = 
  | 'learning' 
  | 'social' 
  | 'quest' 
  | 'engagement' 
  | 'special';

export interface AchievementCriteria {
  type: 'count' | 'streak' | 'milestone' | 'manual';
  target?: number;
  current?: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  points: number;
  isEarned: boolean;
  earnedAt?: string;
  progress?: number;
  criteria: AchievementCriteria;
}

export interface AchievementFilters {
  category?: AchievementCategory;
  earned?: boolean;
  page?: number;
  limit?: number;
}

// ============================================================================
// Badge Types
// ============================================================================

export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface Badge {
  id: string;
  name: string;
  description: string;
  tier: BadgeTier;
  imageUrl: string;
  criteria: string;
  isEarned: boolean;
  earnedAt?: string;
  earnedCount?: number;
}

// ============================================================================
// Quest Types
// ============================================================================

export type QuestType = 'daily' | 'weekly' | 'challenge' | 'storyline';
export type QuestStatus = 'available' | 'in_progress' | 'completed' | 'expired';

export interface QuestStep {
  id: string;
  description: string;
  isCompleted: boolean;
  completedAt?: string;
  order: number;
}

export interface QuestReward {
  type: 'xp' | 'badge' | 'points' | 'item';
  value: number | string;
  claimed: boolean;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  type: QuestType;
  status: QuestStatus;
  steps: QuestStep[];
  rewards: QuestReward[];
  progress: number;
  startedAt?: string;
  completedAt?: string;
  expiresAt?: string;
}

export interface QuestProgress {
  questId: string;
  progress: number;
  completedSteps: string[];
  currentStep?: string;
  updatedAt: string;
}

export interface CompleteQuestStepInput {
  questId: string;
  stepId: string;
}

// ============================================================================
// Admin Types
// ============================================================================

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalQuests: number;
  completedQuests: number;
  totalRevenue: number;
  revenueThisMonth: number;
  newUsersToday: number;
  newUsersThisWeek: number;
}

export interface AdminUserFilters {
  search?: string;
  role?: string;
  status?: 'active' | 'suspended' | 'pending';
  page?: number;
  limit?: number;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  actorId: string;
  actorEmail: string;
  targetType: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface AuditLogFilters {
  action?: string;
  actorId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// ============================================================================
// Analytics Types
// ============================================================================

export type TimeRange = '7d' | '30d' | '90d' | '1y';

export interface UserAnalytics {
  userId: string;
  totalXP: number;
  level: number;
  questsCompleted: number;
  achievementsEarned: number;
  badgesEarned: number;
  streakDays: number;
  lastActiveAt: string;
  joinedAt: string;
}

export interface EngagementDataPoint {
  date: string;
  activeUsers: number;
  questsStarted: number;
  questsCompleted: number;
  postsCreated: number;
}

export interface EngagementSummary {
  totalActiveUsers: number;
  avgDailyActive: number;
  engagementRate: number;
  peakDay: string;
}

export interface EngagementData {
  timeRange: TimeRange;
  dataPoints: EngagementDataPoint[];
  summary: EngagementSummary;
}

// ============================================================================
// Social Types
// ============================================================================

export interface PostAuthor {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
}

export interface SocialPost {
  id: string;
  authorId: string;
  author: PostAuthor;
  content: string;
  mediaUrls?: string[];
  likes: number;
  comments: number;
  isLiked: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CreatePostInput {
  content: string;
  mediaUrls?: string[];
}

// ============================================================================
// Group Types
// ============================================================================

export interface GroupMember {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  memberCount: number;
  isJoined: boolean;
  isPublic: boolean;
  createdAt: string;
  createdBy: string;
  members?: GroupMember[];
}

export interface GroupFilters {
  search?: string;
  joined?: boolean;
  page?: number;
  limit?: number;
}

export interface CreateGroupInput {
  name: string;
  description: string;
  imageUrl?: string;
  isPublic: boolean;
}

// ============================================================================
// Shared Types
// ============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  nextCursor?: string;
  hasMore: boolean;
  total?: number;
}

// ============================================================================
// Hook Return Type Helpers
// ============================================================================

export interface QueryMeta {
  dataUpdatedAt: number;
  isFetching: boolean;
  isStale: boolean;
}
