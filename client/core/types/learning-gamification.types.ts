/**
 * Learning Gamification Types (T025)
 * 
 * TypeScript types for course gamification feature (006-course-gamification)
 * Mirrors backend DTOs from learning_gamification_service.go
 */

// ============================================================================
// XP Types
// ============================================================================

/** Learning action types that earn XP */
export type LearningActionType = 
  | 'lesson_completion'
  | 'course_completion'
  | 'streak_bonus'
  | 'challenge'
  | 'achievement'
  | 'level_up';

/** XP transaction from learning activities */
export interface LearningXPTransaction {
  id: string;
  tenant_id: string;
  user_id: string;
  action_type: LearningActionType;
  xp_amount: number;
  content_type?: string;
  content_id?: string;
  description?: string;
  multiplier: number;
  created_at: string;
}

/** Summary of user's learning XP and level */
export interface LearningXPSummary {
  total_xp: number;
  level: number;
  level_name: string;
  xp_to_next_level: number;
  progress_pct: number;
}

/** Result of an XP award operation */
export interface LearningXPAwardResult {
  xp_awarded: number;
  new_total_xp: number;
  is_duplicate?: boolean;
  leveled_up?: boolean;
  new_level?: number;
  new_level_name?: string;
  streak_updated?: boolean;
  current_streak?: number;
  streak_milestone_xp?: number;
  achievements_unlocked?: UnlockedAchievement[];
  challenges_updated?: LearningChallengeUpdate[];
}

// ============================================================================
// Level Types
// ============================================================================

/** Learning level definition */
export interface LearningLevel {
  id: string;
  tenant_id: string;
  level_number: number;
  level_name: string;
  min_xp: number;
  max_xp?: number;
  badge_id?: string;
  icon_url?: string;
  color_hex?: string;
}

/** Detailed level info for UI display */
export interface LevelInfo {
  level: number;
  level_name: string;
  current_xp: number;
  min_xp: number;
  max_xp?: number;
  xp_to_next_level: number;
  progress_pct: number;
  color_hex?: string;
  icon_url?: string;
}

// ============================================================================
// Streak Types
// ============================================================================

/** User's learning streak information */
export interface LearningStreakInfo {
  current_streak: number;
  longest_streak: number;
  last_activity_date: string;
  next_milestone_days: number;
  next_milestone_xp: number;
  days_until_next_milestone: number;
  grace_period_available: boolean;
}

/** Streak milestone definition */
export const STREAK_MILESTONES: Record<number, number> = {
  7: 50,    // 1 week
  14: 100,  // 2 weeks
  30: 250,  // 1 month
  60: 500,  // 2 months
  100: 1000, // 100 days
};

// ============================================================================
// Leaderboard Types
// ============================================================================

/** Leaderboard time periods */
export type LeaderboardTimeframe = 'daily' | 'weekly' | 'monthly' | 'all_time';

/** Entry in a learning leaderboard */
export interface LearningLeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  avatar?: string;
  total_xp: number;
  level: number;
  rank_change: number;
}

/** Leaderboard response */
export interface LearningLeaderboard {
  timeframe: LeaderboardTimeframe;
  entries: LearningLeaderboardEntry[];
  user_rank?: number;
  user_entry?: LearningLeaderboardEntry;
}

// ============================================================================
// Challenge Types
// ============================================================================

/** Types of learning challenges */
export type ChallengeType = 
  | 'lesson_count'
  | 'xp_earned'
  | 'time_spent'
  | 'quiz_score'
  | 'streak_maintain';

/** Challenge difficulty levels */
export type ChallengeDifficulty = 'easy' | 'medium' | 'hard';

/** Challenge status */
export type ChallengeStatus = 'active' | 'completed' | 'expired';

/** Daily learning challenge */
export interface DailyLearningChallenge {
  id: string;
  name: string;
  description: string;
  challenge_type: ChallengeType;
  difficulty: ChallengeDifficulty;
  target_value: number;
  current_progress: number;
  progress_pct: number;
  xp_reward: number;
  status: ChallengeStatus;
  expires_at: string;
  icon_url?: string;
}

/** Challenge progress update from XP award */
export interface LearningChallengeUpdate {
  challenge_id: string;
  challenge_name: string;
  current_progress: number;
  target_value: number;
  completed: boolean;
  xp_awarded?: number;
}

// ============================================================================
// Achievement Types
// ============================================================================

/** Unlocked achievement from XP award */
export interface UnlockedAchievement {
  badge_id: string;
  badge_name: string;
  description: string;
  xp_awarded: number;
  icon_url?: string;
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
}

/** Learning achievement for display */
export interface LearningAchievement {
  id: string;
  name: string;
  description: string;
  icon_url?: string;
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  category: 'learning';
  criteria_type: string;
  criteria_value: number;
  xp_reward: number;
  is_unlocked: boolean;
  unlocked_at?: string;
  progress?: number;
  progress_pct?: number;
}

// ============================================================================
// Course Progress Types
// ============================================================================

/** Course progress with XP data */
export interface CourseProgressWithXP {
  course_id: string;
  course_name: string;
  lessons_completed: number;
  total_lessons: number;
  xp_earned: number;
  progress_pct: number;
}

/** Learning course progress (alias for service compatibility) */
export interface LearningCourseProgress {
  course_id: string;
  course_name: string;
  lessons_completed: number;
  total_lessons: number;
  xp_earned: number;
  total_xp_available: number;
  progress_pct: number;
  is_completed: boolean;
  completed_at?: string;
}

/** Streak milestone definition */
export interface LearningStreakMilestone {
  days: number;
  xp_reward: number;
  name: string;
  icon?: string;
}

// ============================================================================
// User Stats Types
// ============================================================================

/** Aggregated learning statistics for a user */
export interface UserLearningStats {
  id: string;
  tenant_id: string;
  user_id: string;
  total_learning_xp: number;
  lessons_completed: number;
  courses_completed: number;
  quizzes_passed: number;
  perfect_scores: number;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Instructor Badge Types
// ============================================================================

/** Request to award an instructor badge */
export interface InstructorBadgeAwardRequest {
  student_id: string;
  badge_id: string;
  message?: string;
}

/** Badge with instructor attribution */
export interface InstructorBadge {
  badge_id: string;
  badge_name: string;
  description: string;
  icon_url?: string;
  awarded_by: string;
  awarded_by_name: string;
  award_message?: string;
  awarded_at: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/** Paginated response wrapper */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/** XP transactions paginated response */
export type XPTransactionsResponse = PaginatedResponse<LearningXPTransaction>;

/** Leaderboard query params */
export interface LeaderboardQueryParams {
  timeframe?: LeaderboardTimeframe;
  course_id?: string;
  limit?: number;
}

/** Challenge refresh response */
export interface ChallengeRefreshResponse {
  challenges: DailyLearningChallenge[];
  refreshed_at: string;
}
