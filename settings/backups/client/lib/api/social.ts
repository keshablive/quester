import { apiClient } from './client';

export interface Post {
  id: string;
  user: {
    id: string;
    username: string;
    avatar_url?: string;
  };
  content: string;
  media_type: 'text' | 'image' | 'video';
  media_url?: string;
  visibility: 'public' | 'followers' | 'private';
  like_count: number;
  comment_count: number;
  share_count: number;
  created_at: string;
  updated_at: string;
  is_liked?: boolean;
}

export interface Comment {
  id: string;
  post_id: string;
  user: {
    id: string;
    username: string;
    avatar_url?: string;
  };
  content: string;
  parent_id?: string;
  created_at: string;
  updated_at?: string;
  replies?: Comment[];
}

export interface CreatePostRequest {
  content: string;
  media_type?: 'text' | 'image' | 'video';
  media_url?: string;
  visibility?: 'public' | 'followers' | 'private';
}

export interface UpdatePostRequest {
  content?: string;
  visibility?: 'public' | 'followers' | 'private';
}

export interface AddCommentRequest {
  content: string;
  parent_id?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

class SocialAPI {
  // Posts
  async createPost(data: CreatePostRequest): Promise<{ message: string; post: Post }> {
    return await apiClient.post('/posts', data);
  }

  async getPost(postId: string): Promise<Post> {
    return await apiClient.get(`/posts/${postId}`);
  }

  async updatePost(postId: string, data: UpdatePostRequest): Promise<{ message: string; post: Post }> {
    return await apiClient.put(`/posts/${postId}`, data);
  }

  async deletePost(postId: string): Promise<{ message: string }> {
    return await apiClient.delete(`/posts/${postId}`);
  }

  async getUserPosts(userId: string, page = 1, limit = 20): Promise<PaginatedResponse<Post>> {
    const response = await apiClient.get(`/users/${userId}/posts?page=${page}&limit=${limit}`);
    return {
      data: response.posts,
      total: response.total,
      page: response.page,
      limit: response.limit,
    };
  }

  async getFeed(type: 'following' | 'public' = 'following', page = 1, limit = 20): Promise<PaginatedResponse<Post>> {
    const response = await apiClient.get(`/feed?type=${type}&page=${page}&limit=${limit}`);
    return {
      data: response.posts,
      total: response.total,
      page: response.page,
      limit: response.limit,
    };
  }

  async searchPosts(query: string, page = 1, limit = 20): Promise<PaginatedResponse<Post>> {
    const response = await apiClient.get(`/posts/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`);
    return {
      data: response.posts,
      total: response.total,
      page: response.page,
      limit: response.limit,
    };
  }

  // Likes
  async likePost(postId: string): Promise<{ message: string }> {
    return await apiClient.post(`/posts/${postId}/like`);
  }

  async unlikePost(postId: string): Promise<{ message: string }> {
    return await apiClient.delete(`/posts/${postId}/like`);
  }

  async getPostLikes(postId: string, page = 1, limit = 20): Promise<PaginatedResponse<any>> {
    const response = await apiClient.get(`/posts/${postId}/likes?page=${page}&limit=${limit}`);
    return {
      data: response.likers,
      total: response.total,
      page: response.page,
      limit: response.limit,
    };
  }

  async checkIfLiked(postId: string): Promise<{ is_liked: boolean }> {
    return await apiClient.get(`/posts/${postId}/is-liked`);
  }

  // Comments
  async addComment(postId: string, data: AddCommentRequest): Promise<{ message: string; comment: Comment }> {
    return await apiClient.post(`/posts/${postId}/comments`, data);
  }

  async updateComment(commentId: string, content: string): Promise<{ message: string; comment: Comment }> {
    return await apiClient.put(`/comments/${commentId}`, { content });
  }

  async deleteComment(commentId: string): Promise<{ message: string }> {
    return await apiClient.delete(`/comments/${commentId}`);
  }

  async getPostComments(postId: string, page = 1, limit = 20): Promise<PaginatedResponse<Comment>> {
    const response = await apiClient.get(`/posts/${postId}/comments?page=${page}&limit=${limit}`);
    return {
      data: response.comments,
      total: response.total,
      page: response.page,
      limit: response.limit,
    };
  }

  async getCommentReplies(commentId: string, page = 1, limit = 20): Promise<PaginatedResponse<Comment>> {
    const response = await apiClient.get(`/comments/${commentId}/replies?page=${page}&limit=${limit}`);
    return {
      data: response.replies,
      total: response.total,
      page: response.page,
      limit: response.limit,
    };
  }

  // Share
  async sharePost(postId: string): Promise<{ message: string }> {
    return await apiClient.post(`/posts/${postId}/share`);
  }
}

export const socialAPI = new SocialAPI();
