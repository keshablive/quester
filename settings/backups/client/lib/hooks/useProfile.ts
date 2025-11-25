import { useState, useCallback } from 'react';
import { profileAPI } from '../api/profile';

export const useProfile = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Profile
  const getUserProfile = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);
    try {
      return await profileAPI.getUserProfile(userId);
    } catch (err: any) {
      setError(err.message || 'Failed to get user profile');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (data: { username?: string; bio?: string; avatar_url?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await profileAPI.updateProfile(data);
      return result.user;
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Follow Management
  const followUser = useCallback(async (userId: string) => {
    setError(null);
    try {
      await profileAPI.followUser(userId);
    } catch (err: any) {
      setError(err.message || 'Failed to follow user');
      throw err;
    }
  }, []);

  const unfollowUser = useCallback(async (userId: string) => {
    setError(null);
    try {
      await profileAPI.unfollowUser(userId);
    } catch (err: any) {
      setError(err.message || 'Failed to unfollow user');
      throw err;
    }
  }, []);

  const getFollowers = useCallback(async (userId: string, page = 1, limit = 20) => {
    setLoading(true);
    setError(null);
    try {
      return await profileAPI.getFollowers(userId, page, limit);
    } catch (err: any) {
      setError(err.message || 'Failed to get followers');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getFollowing = useCallback(async (userId: string, page = 1, limit = 20) => {
    setLoading(true);
    setError(null);
    try {
      return await profileAPI.getFollowing(userId, page, limit);
    } catch (err: any) {
      setError(err.message || 'Failed to get following');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getFollowStats = useCallback(async (userId: string) => {
    setError(null);
    try {
      return await profileAPI.getFollowStats(userId);
    } catch (err: any) {
      setError(err.message || 'Failed to get follow stats');
      throw err;
    }
  }, []);

  const checkIfFollowing = useCallback(async (userId: string) => {
    try {
      const result = await profileAPI.checkIfFollowing(userId);
      return result.is_following;
    } catch (err: any) {
      console.error('Failed to check follow status:', err);
      return false;
    }
  }, []);

  // Search
  const searchUsers = useCallback(async (query: string, page = 1, limit = 20) => {
    setLoading(true);
    setError(null);
    try {
      return await profileAPI.searchUsers(query, page, limit);
    } catch (err: any) {
      setError(err.message || 'Failed to search users');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    getUserProfile,
    updateProfile,
    followUser,
    unfollowUser,
    getFollowers,
    getFollowing,
    getFollowStats,
    checkIfFollowing,
    searchUsers,
  };
};
