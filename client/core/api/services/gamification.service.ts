import { apiClient } from '../client';
import { API_ENDPOINTS } from '../../config/env';

export interface Badge {
    id: string;
    name: string;
    description: string;
    icon: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    earned: boolean;
    earnedAt?: string;
    progress?: number;
    requirement?: string;
}

export interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    points: number;
    category: string;
    unlocked: boolean;
    unlockedAt?: string;
    progress: number;
    maxProgress: number;
    claimed: boolean;
}

export const badgesService = {
    /**
     * Get all badges
     */
    async getBadges(): Promise<Badge[]> {
        try {
            return await apiClient.get(API_ENDPOINTS.BADGES.BASE);
        } catch (error) {
            console.error('Failed to get badges:', error);
            throw error;
        }
    },

    /**
     * Get badge by ID
     */
    async getBadge(id: string): Promise<Badge> {
        try {
            return await apiClient.get(API_ENDPOINTS.BADGES.BY_ID(id));
        } catch (error) {
            console.error(`Failed to get badge ${id}:`, error);
            throw error;
        }
    },

    /**
     * Get user's earned badges
     */
    async getUserBadges(): Promise<Badge[]> {
        try {
            return await apiClient.get(API_ENDPOINTS.BADGES.USER);
        } catch (error) {
            console.error('Failed to get user badges:', error);
            throw error;
        }
    },
};

export const achievementsService = {
    /**
     * Get all achievements
     */
    async getAchievements(): Promise<Achievement[]> {
        try {
            return await apiClient.get(API_ENDPOINTS.ACHIEVEMENTS.BASE);
        } catch (error) {
            console.error('Failed to get achievements:', error);
            throw error;
        }
    },

    /**
     * Get achievement by ID
     */
    async getAchievement(id: string): Promise<Achievement> {
        return apiClient.get(API_ENDPOINTS.ACHIEVEMENTS.BY_ID(id));
    },

    /**
     * Get user's achievements
     */
    async getUserAchievements(): Promise<Achievement[]> {
        return apiClient.get(API_ENDPOINTS.ACHIEVEMENTS.USER);
    },

    /**
     * Claim achievement reward
     */
    async claimAchievement(id: string): Promise<void> {
        return apiClient.post(API_ENDPOINTS.ACHIEVEMENTS.CLAIM(id));
    },
};
