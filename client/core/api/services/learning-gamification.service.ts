/**
 * Learning Gamification Service
 * 
 * API client for learning XP, streaks, challenges, and achievements.
 * 006-course-gamification: Course gamification features
 * 
 * @see specs/006-course-gamification/spec.md
 */
import { apiClient } from '../client';
import { API_ENDPOINTS } from '../../config/env';
import type {
  LearningXPTransaction,
  LearningXPSummary,
  LearningStreakInfo,
  LearningLevel,
  DailyLearningChallenge,
  LearningLeaderboardEntry,
  LearningCourseProgress,
  LearningAchievement,
  LearningStreakMilestone,
  PaginatedResponse,
} from '../../types/learning-gamification.types';

/**
 * Leaderboard response with user's own rank
 */
export interface LearningLeaderboardResponse {
  entries: LearningLeaderboardEntry[];
  userRank?: LearningLeaderboardEntry;
  totalUsers: number;
  page: number;
  pageSize: number;
}

/**
 * XP Transaction query parameters
 */
export interface XPTransactionParams {
  page?: number;
  limit?: number;
  actionType?: string;
  courseId?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Leaderboard query parameters
 */
export interface LeaderboardParams {
  page?: number;
  limit?: number;
  timeframe?: 'daily' | 'weekly' | 'monthly' | 'all_time';
  courseId?: string;
}

/**
 * Learning Gamification API Service
 * 
 * Provides methods for interacting with the learning gamification system:
 * - XP tracking and transactions
 * - Learning streaks
 * - Daily challenges
 * - Leaderboards
 * - Achievements
 * - Level progression
 */
export const learningGamificationService = {
  // ============================================================================
  // XP Methods
  // ============================================================================

  /**
   * Get XP summary for current user
   * 
   * Returns aggregate XP stats including total XP, level info, and activity counts.
   * 
   * @returns Promise<LearningXPSummary>
   */
  async getXPSummary(): Promise<LearningXPSummary> {
    try {
      return await apiClient.get(API_ENDPOINTS.LEARNING.XP.SUMMARY);
    } catch (error) {
      console.error('Failed to get learning XP summary:', error);
      throw error;
    }
  },

  /**
   * Get XP transaction history
   * 
   * Returns paginated list of XP transactions with optional filtering.
   * 
   * @param params - Query parameters for filtering and pagination
   * @returns Promise<PaginatedResponse<LearningXPTransaction>>
   */
  async getXPTransactions(params?: XPTransactionParams): Promise<PaginatedResponse<LearningXPTransaction>> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.set('page', params.page.toString());
      if (params?.limit) queryParams.set('limit', params.limit.toString());
      if (params?.actionType) queryParams.set('action_type', params.actionType);
      if (params?.courseId) queryParams.set('course_id', params.courseId);
      if (params?.startDate) queryParams.set('start_date', params.startDate);
      if (params?.endDate) queryParams.set('end_date', params.endDate);
      
      const queryString = queryParams.toString();
      const url = queryString 
        ? `${API_ENDPOINTS.LEARNING.XP.TRANSACTIONS}?${queryString}`
        : API_ENDPOINTS.LEARNING.XP.TRANSACTIONS;
      
      return await apiClient.get(url);
    } catch (error) {
      console.error('Failed to get learning XP transactions:', error);
      throw error;
    }
  },

  /**
   * Get course-specific progress and XP
   * 
   * Returns detailed progress for a specific course including XP earned,
   * lessons completed, and completion percentage.
   * 
   * @param courseId - The course UUID
   * @returns Promise<LearningCourseProgress>
   */
  async getCourseProgress(courseId: string): Promise<LearningCourseProgress> {
    try {
      return await apiClient.get(API_ENDPOINTS.LEARNING.XP.COURSE_PROGRESS(courseId));
    } catch (error) {
      console.error(`Failed to get course ${courseId} progress:`, error);
      throw error;
    }
  },

  // ============================================================================
  // Leaderboard Methods
  // ============================================================================

  /**
   * Get learning XP leaderboard
   * 
   * Returns ranked list of users by learning XP with optional timeframe filter.
   * Includes the current user's rank if authenticated.
   * 
   * @param params - Query parameters for filtering and pagination
   * @returns Promise<LearningLeaderboardResponse>
   */
  async getLeaderboard(params?: LeaderboardParams): Promise<LearningLeaderboardResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.set('page', params.page.toString());
      if (params?.limit) queryParams.set('limit', params.limit.toString());
      if (params?.timeframe) queryParams.set('timeframe', params.timeframe);
      if (params?.courseId) queryParams.set('course_id', params.courseId);
      
      const queryString = queryParams.toString();
      const url = queryString 
        ? `${API_ENDPOINTS.LEARNING.XP.LEADERBOARD}?${queryString}`
        : API_ENDPOINTS.LEARNING.XP.LEADERBOARD;
      
      return await apiClient.get(url);
    } catch (error) {
      console.error('Failed to get learning leaderboard:', error);
      throw error;
    }
  },

  /**
   * Get course-specific XP leaderboard (T064)
   * 
   * Returns ranked list of users by XP earned in a specific course.
   * Includes the current user's rank if authenticated.
   * 
   * @param courseId - Course ID to filter leaderboard
   * @param params - Query parameters for filtering and pagination
   * @returns Promise<LearningLeaderboardResponse>
   */
  async getCourseLeaderboard(courseId: string, params?: Omit<LeaderboardParams, 'courseId'>): Promise<LearningLeaderboardResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.set('page', params.page.toString());
      if (params?.limit) queryParams.set('limit', params.limit.toString());
      if (params?.timeframe) queryParams.set('timeframe', params.timeframe);
      
      const queryString = queryParams.toString();
      const baseUrl = `${API_ENDPOINTS.LEARNING.XP.LEADERBOARD}/course/${courseId}`;
      const url = queryString ? `${baseUrl}?${queryString}` : baseUrl;
      
      return await apiClient.get(url);
    } catch (error) {
      console.error(`Failed to get course ${courseId} leaderboard:`, error);
      throw error;
    }
  },

  // ============================================================================
  // Streak Methods
  // ============================================================================

  /**
   * Get current learning streak
   * 
   * Returns the user's current streak information including current count,
   * longest streak, and streak status for today.
   * 
   * @returns Promise<LearningStreakInfo>
   */
  async getStreak(): Promise<LearningStreakInfo> {
    try {
      return await apiClient.get(API_ENDPOINTS.LEARNING.STREAK.CURRENT);
    } catch (error) {
      console.error('Failed to get learning streak:', error);
      throw error;
    }
  },

  /**
   * Get streak milestones
   * 
   * Returns list of streak milestones with their rewards and achievement status.
   * 
   * @returns Promise<LearningStreakMilestone[]>
   */
  async getStreakMilestones(): Promise<LearningStreakMilestone[]> {
    try {
      return await apiClient.get(API_ENDPOINTS.LEARNING.STREAK.MILESTONES);
    } catch (error) {
      console.error('Failed to get streak milestones:', error);
      throw error;
    }
  },

  // ============================================================================
  // Daily Challenge Methods
  // ============================================================================

  /**
   * Get daily learning challenges
   * 
   * Returns the current set of daily challenges with progress tracking.
   * Challenges reset at midnight in the user's timezone.
   * 
   * @returns Promise<DailyLearningChallenge[]>
   */
  async getDailyChallenges(): Promise<DailyLearningChallenge[]> {
    try {
      return await apiClient.get(API_ENDPOINTS.LEARNING.CHALLENGES.DAILY);
    } catch (error) {
      console.error('Failed to get daily learning challenges:', error);
      throw error;
    }
  },

  /**
   * Get specific challenge details
   * 
   * @param challengeId - The challenge UUID
   * @returns Promise<DailyLearningChallenge>
   */
  async getChallenge(challengeId: string): Promise<DailyLearningChallenge> {
    try {
      return await apiClient.get(API_ENDPOINTS.LEARNING.CHALLENGES.BY_ID(challengeId));
    } catch (error) {
      console.error(`Failed to get challenge ${challengeId}:`, error);
      throw error;
    }
  },

  /**
   * Get challenge progress
   * 
   * @param challengeId - The challenge UUID
   * @returns Promise<DailyLearningChallenge>
   */
  async getChallengeProgress(challengeId: string): Promise<DailyLearningChallenge> {
    try {
      return await apiClient.get(API_ENDPOINTS.LEARNING.CHALLENGES.PROGRESS(challengeId));
    } catch (error) {
      console.error(`Failed to get challenge ${challengeId} progress:`, error);
      throw error;
    }
  },

  // ============================================================================
  // Achievement Methods
  // ============================================================================

  /**
   * Get learning achievements for current user
   * 
   * Returns all learning achievements with progress and completion status.
   * 
   * @returns Promise<LearningAchievement[]>
   */
  async getAchievements(): Promise<LearningAchievement[]> {
    try {
      return await apiClient.get(API_ENDPOINTS.LEARNING.ACHIEVEMENTS.MY);
    } catch (error) {
      console.error('Failed to get learning achievements:', error);
      throw error;
    }
  },

  /**
   * Get learning achievements for a specific user
   * 
   * Returns completed learning achievements for another user (public profile).
   * 
   * @param userId - The user UUID
   * @returns Promise<LearningAchievement[]>
   */
  async getUserAchievements(userId: string): Promise<LearningAchievement[]> {
    try {
      return await apiClient.get(API_ENDPOINTS.LEARNING.ACHIEVEMENTS.USER(userId));
    } catch (error) {
      console.error(`Failed to get user ${userId} learning achievements:`, error);
      throw error;
    }
  },

  // ============================================================================
  // Level Methods
  // ============================================================================

  /**
   * Get current level information
   * 
   * Returns the user's current level with XP progress to next level.
   * 
   * @returns Promise<LearningLevel>
   */
  async getCurrentLevel(): Promise<LearningLevel> {
    try {
      return await apiClient.get(API_ENDPOINTS.LEARNING.LEVELS.CURRENT);
    } catch (error) {
      console.error('Failed to get current learning level:', error);
      throw error;
    }
  },

  /**
   * Get all available levels
   * 
   * Returns the complete level progression table with XP thresholds.
   * Useful for displaying level roadmap UI.
   * 
   * @returns Promise<LearningLevel[]>
   */
  async getAllLevels(): Promise<LearningLevel[]> {
    try {
      return await apiClient.get(API_ENDPOINTS.LEARNING.LEVELS.ALL);
    } catch (error) {
      console.error('Failed to get all learning levels:', error);
      throw error;
    }
  },

  // ============================================================================
  // Instructor Badge Methods (T085)
  // ============================================================================

  /**
   * Award an instructor badge to a student
   * 
   * Allows instructors to award badges to their students with a personalized message.
   * Requires instructor role and that the student is enrolled in the instructor's course.
   * 
   * @param studentId - The student's user UUID
   * @param badgeId - The badge UUID to award
   * @param message - Optional personalized message from the instructor
   * @returns Promise<{ success: boolean; message: string }>
   */
  async awardInstructorBadge(
    studentId: string,
    badgeId: string,
    message?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      return await apiClient.post(API_ENDPOINTS.BADGES.AWARD_INSTRUCTOR, {
        student_id: studentId,
        badge_id: badgeId,
        message: message || '',
      });
    } catch (error) {
      console.error('Failed to award instructor badge:', error);
      throw error;
    }
  },
};

export default learningGamificationService;
