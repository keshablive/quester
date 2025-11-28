/**
 * Social Gamification Service
 * 
 * API client for social XP, challenges, and milestones.
 * FR-001 to FR-016: Social gamification features
 */
import { apiClient } from '../client';
import { API_ENDPOINTS } from '../../config/env';

/**
 * XP Transaction from social actions
 */
export interface SocialXPTransaction {
  id: string;
  userId: string;
  actionType: 'post' | 'like' | 'comment' | 'follow' | 'share' | 'milestone' | 'challenge';
  xpAmount: number;
  description: string;
  contentId?: string;
  contentType?: string;
  createdAt: string;
}

/**
 * XP Summary for a user
 */
export interface SocialXPSummary {
  userId: string;
  totalSocialXP: number;
  postsCreated: number;
  likesGivenCount: number;
  likesReceivedCount: number;
  commentsCount: number;
  followingCount: number;
  sharesCount: number;
  currentStreak: number;
  longestStreak: number;
  lastActivityAt: string;
  updatedAt: string;
}

/**
 * Daily Challenge data
 */
export interface DailyChallenge {
  id: string;
  templateId: string;
  name: string;
  description: string;
  actionType: string;
  targetCount: number;
  currentProgress: number;
  xpReward: number;
  isCompleted: boolean;
  completedAt?: string;
  expiresAt: string;
}

/**
 * Content Milestone data
 */
export interface ContentMilestone {
  id: string;
  milestoneType: 'posts' | 'likes_received' | 'comments_received' | 'followers';
  milestoneName: string;
  thresholdValue: number;
  xpReward: number;
  achievedAt: string;
}

/**
 * Leaderboard entry
 */
export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatarUrl?: string;
  totalSocialXP: number;
  currentStreak: number;
}

/**
 * Leaderboard response with pagination
 */
export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  userRank?: LeaderboardEntry;
  totalUsers: number;
  page: number;
  pageSize: number;
}

/**
 * Social Achievement data
 */
export interface SocialAchievement {
  id: string;
  name: string;
  description: string;
  iconUrl?: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'legendary';
  targetCount: number;
  currentCount: number;
  completed: boolean;
  xpReward: number;
  completedAt?: string;
}

/**
 * Social Achievements response
 */
export interface SocialAchievementsResponse {
  achievements: SocialAchievement[];
  total: number;
}

export const socialGamificationService = {
  /**
   * Get XP summary for current user
   */
  async getXPSummary(): Promise<SocialXPSummary> {
    try {
      return await apiClient.get(API_ENDPOINTS.SOCIAL.XP.SUMMARY);
    } catch (error) {
      console.error('Failed to get XP summary:', error);
      throw error;
    }
  },

  /**
   * Get XP transaction history
   */
  async getXPTransactions(params?: {
    page?: number;
    limit?: number;
    actionType?: string;
  }): Promise<{
    transactions: SocialXPTransaction[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.set('page', params.page.toString());
      if (params?.limit) queryParams.set('limit', params.limit.toString());
      if (params?.actionType) queryParams.set('action_type', params.actionType);
      
      const url = `${API_ENDPOINTS.SOCIAL.XP.TRANSACTIONS}?${queryParams.toString()}`;
      return await apiClient.get(url);
    } catch (error) {
      console.error('Failed to get XP transactions:', error);
      throw error;
    }
  },

  /**
   * Get social XP leaderboard
   */
  async getLeaderboard(params?: {
    page?: number;
    limit?: number;
    timeframe?: 'daily' | 'weekly' | 'monthly' | 'all-time';
  }): Promise<LeaderboardResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.set('page', params.page.toString());
      if (params?.limit) queryParams.set('limit', params.limit.toString());
      if (params?.timeframe) queryParams.set('timeframe', params.timeframe);
      
      const url = `${API_ENDPOINTS.SOCIAL.XP.LEADERBOARD}?${queryParams.toString()}`;
      return await apiClient.get(url);
    } catch (error) {
      console.error('Failed to get leaderboard:', error);
      throw error;
    }
  },

  /**
   * Get daily challenges for current user
   */
  async getDailyChallenges(): Promise<DailyChallenge[]> {
    try {
      return await apiClient.get(API_ENDPOINTS.SOCIAL.XP.CHALLENGES);
    } catch (error) {
      console.error('Failed to get daily challenges:', error);
      throw error;
    }
  },

  /**
   * Get challenge progress
   */
  async getChallengeProgress(challengeId: string): Promise<DailyChallenge> {
    try {
      return await apiClient.get(API_ENDPOINTS.SOCIAL.XP.CHALLENGE_PROGRESS(challengeId));
    } catch (error) {
      console.error(`Failed to get challenge ${challengeId} progress:`, error);
      throw error;
    }
  },

  /**
   * Get achieved milestones for current user
   */
  async getMilestones(): Promise<ContentMilestone[]> {
    try {
      return await apiClient.get(API_ENDPOINTS.SOCIAL.XP.MILESTONES);
    } catch (error) {
      console.error('Failed to get milestones:', error);
      throw error;
    }
  },

  /**
   * Get social achievements for current user
   * US3: Social achievement progress and unlocks
   */
  async getMySocialAchievements(): Promise<SocialAchievementsResponse> {
    try {
      return await apiClient.get(API_ENDPOINTS.SOCIAL.ACHIEVEMENTS.MY);
    } catch (error) {
      console.error('Failed to get social achievements:', error);
      throw error;
    }
  },

  /**
   * Get social achievements for a specific user
   * US3: View other users' earned badges
   */
  async getUserSocialAchievements(userId: string): Promise<SocialAchievementsResponse> {
    try {
      return await apiClient.get(API_ENDPOINTS.SOCIAL.ACHIEVEMENTS.USER(userId));
    } catch (error) {
      console.error(`Failed to get social achievements for user ${userId}:`, error);
      throw error;
    }
  },

  /**
   * Get social leaderboard
   * T060: Leaderboard of top social XP earners
   */
  async getSocialLeaderboard(params?: {
    period?: 'alltime' | 'monthly';
    limit?: number;
  }): Promise<{
    entries: Array<{
      rank: number;
      user_id: string;
      username: string;
      avatar_url?: string;
      social_xp: number;
    }>;
    user_position?: {
      rank: number;
      social_xp: number;
      percentile: number;
    };
    period: string;
    limit: number;
  }> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.period) queryParams.set('period', params.period);
      if (params?.limit) queryParams.set('limit', params.limit.toString());

      const url = `${API_ENDPOINTS.SOCIAL.XP.LEADERBOARD}?${queryParams.toString()}`;
      return await apiClient.get(url);
    } catch (error) {
      console.error('Failed to get social leaderboard:', error);
      throw error;
    }
  },
};

export default socialGamificationService;
