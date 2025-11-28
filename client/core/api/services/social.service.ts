import { apiClient } from '../client';
import { API_ENDPOINTS } from '../../config/env';

export interface Post {
    id: string;
    content: string;
    authorId: string;
    likesCount: number;
    commentsCount: number;
    createdAt: string;
}

export interface Comment {
    id: string;
    content: string;
    authorId: string;
    postId: string;
    createdAt: string;
}

/**
 * XP award response returned by social actions
 * FR-001: XP values for social actions
 */
export interface XPAwardResponse {
    xpAwarded: number;
    totalXP: number;
    actionType: 'post' | 'like' | 'comment' | 'follow' | 'share';
}

/**
 * Social action response with XP info
 */
export interface SocialActionResponse<T = void> {
    data?: T;
    xp?: XPAwardResponse;
}

export const socialService = {
    /**
     * Get feed
     */
    async getFeed(page: number = 1): Promise<Post[]> {
        try {
            return await apiClient.get(`${API_ENDPOINTS.SOCIAL.FEED}?page=${page}`);
        } catch (error) {
            console.error('Failed to get feed:', error);
            throw error;
        }
    },

    /**
     * Create post
     * Returns XP awarded (10 XP per post)
     */
    async createPost(content: string): Promise<SocialActionResponse<Post>> {
        try {
            const response = await apiClient.post(API_ENDPOINTS.SOCIAL.POSTS, { content });
            return {
                data: response,
                xp: {
                    xpAwarded: 10,
                    totalXP: response?.totalXP || 0,
                    actionType: 'post',
                }
            };
        } catch (error) {
            console.error('Failed to create post:', error);
            throw error;
        }
    },

    /**
     * Get post by ID
     */
    async getPost(id: string): Promise<Post> {
        try {
            return await apiClient.get(API_ENDPOINTS.SOCIAL.POST_BY_ID(id));
        } catch (error) {
            console.error(`Failed to get post ${id}:`, error);
            throw error;
        }
    },

    /**
     * Like post
     * Returns XP awarded (2 XP per like)
     */
    async likePost(id: string): Promise<SocialActionResponse> {
        try {
            const response = await apiClient.post(API_ENDPOINTS.SOCIAL.LIKE(id));
            return {
                xp: {
                    xpAwarded: 2,
                    totalXP: response?.totalXP || 0,
                    actionType: 'like',
                }
            };
        } catch (error) {
            console.error(`Failed to like post ${id}:`, error);
            throw error;
        }
    },

    /**
     * Get comments
     */
    async getComments(postId: string): Promise<Comment[]> {
        try {
            return await apiClient.get(API_ENDPOINTS.SOCIAL.COMMENT(postId));
        } catch (error) {
            console.error(`Failed to get comments for post ${postId}:`, error);
            throw error;
        }
    },

    /**
     * Add comment
     * Returns XP awarded (5 XP per comment)
     */
    async addComment(postId: string, content: string): Promise<SocialActionResponse<Comment>> {
        try {
            const response = await apiClient.post(API_ENDPOINTS.SOCIAL.COMMENT(postId), { content });
            return {
                data: response,
                xp: {
                    xpAwarded: 5,
                    totalXP: response?.totalXP || 0,
                    actionType: 'comment',
                }
            };
        } catch (error) {
            console.error(`Failed to add comment to post ${postId}:`, error);
            throw error;
        }
    },

    /**
     * Follow user
     * Returns XP awarded (3 XP per follow)
     */
    async followUser(userId: string): Promise<SocialActionResponse> {
        try {
            const response = await apiClient.post(API_ENDPOINTS.SOCIAL.FOLLOW(userId));
            return {
                xp: {
                    xpAwarded: 3,
                    totalXP: response?.totalXP || 0,
                    actionType: 'follow',
                }
            };
        } catch (error) {
            console.error(`Failed to follow user ${userId}:`, error);
            throw error;
        }
    },

    /**
     * Get followers
     */
    async getFollowers(userId: string): Promise<any[]> {
        try {
            return await apiClient.get(API_ENDPOINTS.SOCIAL.FOLLOWERS(userId));
        } catch (error) {
            console.error(`Failed to get followers for user ${userId}:`, error);
            throw error;
        }
    },

    /**
     * Get following
     */
    async getFollowing(userId: string): Promise<any[]> {
        try {
            return await apiClient.get(API_ENDPOINTS.SOCIAL.FOLLOWING(userId));
        } catch (error) {
            console.error(`Failed to get following for user ${userId}:`, error);
            throw error;
        }
    },

    /**
     * Share post
     * Returns XP awarded (5 XP per share)
     */
    async sharePost(postId: string): Promise<SocialActionResponse> {
        try {
            const response = await apiClient.post(API_ENDPOINTS.SOCIAL.SHARE(postId));
            return {
                xp: {
                    xpAwarded: 5,
                    totalXP: response?.totalXP || 0,
                    actionType: 'share',
                }
            };
        } catch (error) {
            console.error(`Failed to share post ${postId}:`, error);
            throw error;
        }
    }
};
