import { apiClient } from './client';

export interface UserProfile {
  id: string;
  username: string;
  email?: string;
  avatar_url?: string;
  bio?: string;
  follower_count: number;
  following_count: number;
  post_count: number;
  is_following?: boolean;
  created_at: string;
}

export interface User {
  id: string;
  username: string;
  email?: string;
  avatar_url?: string;
  bio?: string;
}

export interface FollowStats {
  followers: number;
  following: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

class ProfileAPI {
  // User Profile
  async getUserProfile(userId: string): Promise<UserProfile> {
    return await apiClient.get(`/users/${userId}`);
  }

  async updateProfile(data: { username?: string; bio?: string; avatar_url?: string }): Promise<{ message: string; user: UserProfile }> {
    return await apiClient.put('/users/profile', data);
  }

  // Follow Management
  async followUser(userId: string): Promise<{ message: string }> {
    return await apiClient.post(`/users/${userId}/follow`);
  }

  async unfollowUser(userId: string): Promise<{ message: string }> {
    return await apiClient.delete(`/users/${userId}/follow`);
  }

  async getFollowers(userId: string, page = 1, limit = 20): Promise<PaginatedResponse<User>> {
    const response = await apiClient.get(`/users/${userId}/followers?page=${page}&limit=${limit}`);
    return {
      data: response.followers,
      total: response.total,
      page: response.page,
      limit: response.limit,
    };
  }

  async getFollowing(userId: string, page = 1, limit = 20): Promise<PaginatedResponse<User>> {
    const response = await apiClient.get(`/users/${userId}/following?page=${page}&limit=${limit}`);
    return {
      data: response.following,
      total: response.total,
      page: response.page,
      limit: response.limit,
    };
  }

  async getFollowStats(userId: string): Promise<FollowStats> {
    return await apiClient.get(`/users/${userId}/follow-stats`);
  }

  async checkIfFollowing(userId: string): Promise<{ is_following: boolean }> {
    return await apiClient.get(`/users/${userId}/is-following`);
  }

  // Search
  async searchUsers(query: string, page = 1, limit = 20): Promise<PaginatedResponse<User>> {
    const response = await apiClient.get(`/users/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`);
    return {
      data: response.users,
      total: response.total,
      page: response.page,
      limit: response.limit,
    };
  }
}

export const profileAPI = new ProfileAPI();
