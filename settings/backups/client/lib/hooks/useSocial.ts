import { useState, useCallback } from 'react';
import { socialAPI, CreatePostRequest, AddCommentRequest } from '../api/social';

export const useSocial = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Posts
  const createPost = useCallback(async (data: CreatePostRequest) => {
    setLoading(true);
    setError(null);
    try {
      const result = await socialAPI.createPost(data);
      return result.post;
    } catch (err: any) {
      setError(err.message || 'Failed to create post');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getPost = useCallback(async (postId: string) => {
    setLoading(true);
    setError(null);
    try {
      return await socialAPI.getPost(postId);
    } catch (err: any) {
      setError(err.message || 'Failed to get post');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePost = useCallback(async (postId: string, content?: string, visibility?: 'public' | 'followers' | 'private') => {
    setLoading(true);
    setError(null);
    try {
      const result = await socialAPI.updatePost(postId, { content, visibility });
      return result.post;
    } catch (err: any) {
      setError(err.message || 'Failed to update post');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deletePost = useCallback(async (postId: string) => {
    setLoading(true);
    setError(null);
    try {
      await socialAPI.deletePost(postId);
    } catch (err: any) {
      setError(err.message || 'Failed to delete post');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getUserPosts = useCallback(async (userId: string, page = 1, limit = 20) => {
    setLoading(true);
    setError(null);
    try {
      return await socialAPI.getUserPosts(userId, page, limit);
    } catch (err: any) {
      setError(err.message || 'Failed to get user posts');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getFeed = useCallback(async (type: 'following' | 'public' = 'following', page = 1, limit = 20) => {
    setLoading(true);
    setError(null);
    try {
      return await socialAPI.getFeed(type, page, limit);
    } catch (err: any) {
      setError(err.message || 'Failed to get feed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const searchPosts = useCallback(async (query: string, page = 1, limit = 20) => {
    setLoading(true);
    setError(null);
    try {
      return await socialAPI.searchPosts(query, page, limit);
    } catch (err: any) {
      setError(err.message || 'Failed to search posts');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Likes
  const likePost = useCallback(async (postId: string) => {
    setError(null);
    try {
      await socialAPI.likePost(postId);
    } catch (err: any) {
      setError(err.message || 'Failed to like post');
      throw err;
    }
  }, []);

  const unlikePost = useCallback(async (postId: string) => {
    setError(null);
    try {
      await socialAPI.unlikePost(postId);
    } catch (err: any) {
      setError(err.message || 'Failed to unlike post');
      throw err;
    }
  }, []);

  const checkIfLiked = useCallback(async (postId: string) => {
    try {
      const result = await socialAPI.checkIfLiked(postId);
      return result.is_liked;
    } catch (err: any) {
      console.error('Failed to check like status:', err);
      return false;
    }
  }, []);

  // Comments
  const addComment = useCallback(async (postId: string, data: AddCommentRequest) => {
    setLoading(true);
    setError(null);
    try {
      const result = await socialAPI.addComment(postId, data);
      return result.comment;
    } catch (err: any) {
      setError(err.message || 'Failed to add comment');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateComment = useCallback(async (commentId: string, content: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await socialAPI.updateComment(commentId, content);
      return result.comment;
    } catch (err: any) {
      setError(err.message || 'Failed to update comment');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteComment = useCallback(async (commentId: string) => {
    setLoading(true);
    setError(null);
    try {
      await socialAPI.deleteComment(commentId);
    } catch (err: any) {
      setError(err.message || 'Failed to delete comment');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getPostComments = useCallback(async (postId: string, page = 1, limit = 20) => {
    setLoading(true);
    setError(null);
    try {
      return await socialAPI.getPostComments(postId, page, limit);
    } catch (err: any) {
      setError(err.message || 'Failed to get comments');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getCommentReplies = useCallback(async (commentId: string, page = 1, limit = 20) => {
    setLoading(true);
    setError(null);
    try {
      return await socialAPI.getCommentReplies(commentId, page, limit);
    } catch (err: any) {
      setError(err.message || 'Failed to get replies');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Share
  const sharePost = useCallback(async (postId: string) => {
    setError(null);
    try {
      await socialAPI.sharePost(postId);
    } catch (err: any) {
      setError(err.message || 'Failed to share post');
      throw err;
    }
  }, []);

  return {
    loading,
    error,
    createPost,
    getPost,
    updatePost,
    deletePost,
    getUserPosts,
    getFeed,
    searchPosts,
    likePost,
    unlikePost,
    checkIfLiked,
    addComment,
    updateComment,
    deleteComment,
    getPostComments,
    getCommentReplies,
    sharePost,
  };
};
