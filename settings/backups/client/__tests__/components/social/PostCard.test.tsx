/**
 * PostCard Component Tests
 *
 * Comprehensive tests for the PostCard component covering:
 * - Header rendering (avatar, username, timestamp)
 * - Content display
 * - Media rendering (image, video)
 * - Action buttons (like, comment, share)
 * - Timestamp formatting
 * - Count formatting
 * - User interactions
 * - Edge cases
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { PostCard } from '@/components/social/PostCard';

describe('PostCard', () => {
  const mockPost = {
    id: '1',
    user: {
      id: 'user-1',
      username: 'testuser',
      avatar_url: 'https://example.com/avatar.jpg',
    },
    content: 'This is a test post content',
    media_type: 'text' as const,
    like_count: 42,
    comment_count: 15,
    share_count: 8,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    is_liked: false,
  };

  const mockHandlers = {
    onLike: jest.fn(),
    onComment: jest.fn(),
    onShare: jest.fn(),
    onUserPress: jest.fn(),
    onPostPress: jest.fn(),
    onMediaPress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // Header Rendering Tests
  // ============================================================================

  describe('Header Rendering', () => {
    it('should render username', () => {
      render(<PostCard post={mockPost} {...mockHandlers} />);

      expect(screen.getByText('testuser')).toBeTruthy();
    });

    it('should render avatar image when avatar_url provided', () => {
      render(<PostCard post={mockPost} {...mockHandlers} />);

      const avatar = screen.getByTestId('post-avatar-image');
      expect(avatar.props.source).toEqual({ uri: 'https://example.com/avatar.jpg' });
    });

    it('should render avatar placeholder when no avatar_url', () => {
      const postWithoutAvatar = {
        ...mockPost,
        user: { ...mockPost.user, avatar_url: undefined },
      };

      render(<PostCard post={postWithoutAvatar} {...mockHandlers} />);

      expect(screen.getByText('T')).toBeTruthy(); // First letter of username
    });

    it('should render timestamp', () => {
      render(<PostCard post={mockPost} {...mockHandlers} />);

      expect(screen.getByText('2h ago')).toBeTruthy();
    });

    it('should call onUserPress when header pressed', () => {
      render(<PostCard post={mockPost} {...mockHandlers} />);

      const header = screen.getByTestId('post-header');
      fireEvent.press(header);

      expect(mockHandlers.onUserPress).toHaveBeenCalledWith('user-1');
    });
  });

  // ============================================================================
  // Content Display Tests
  // ============================================================================

  describe('Content Display', () => {
    it('should render post content', () => {
      render(<PostCard post={mockPost} {...mockHandlers} />);

      expect(screen.getByText('This is a test post content')).toBeTruthy();
    });

    it('should call onPostPress when content pressed', () => {
      render(<PostCard post={mockPost} {...mockHandlers} />);

      const content = screen.getByText('This is a test post content');
      fireEvent.press(content);

      expect(mockHandlers.onPostPress).toHaveBeenCalledWith('1');
    });

    it('should render long content without truncation', () => {
      const longPost = {
        ...mockPost,
        content: 'A'.repeat(500),
      };

      render(<PostCard post={longPost} {...mockHandlers} />);

      expect(screen.getByText('A'.repeat(500))).toBeTruthy();
    });
  });

  // ============================================================================
  // Media Rendering Tests
  // ============================================================================

  describe('Media Rendering', () => {
    it('should render image media', () => {
      const postWithImage = {
        ...mockPost,
        media_type: 'image' as const,
        media_url: 'https://example.com/image.jpg',
      };

      render(<PostCard post={postWithImage} {...mockHandlers} />);

      const media = screen.getByTestId('post-media-image');
      expect(media.props.source).toEqual({ uri: 'https://example.com/image.jpg' });
    });

    it('should call onMediaPress when image pressed', () => {
      const postWithImage = {
        ...mockPost,
        media_type: 'image' as const,
        media_url: 'https://example.com/image.jpg',
      };

      render(<PostCard post={postWithImage} {...mockHandlers} />);

      const media = screen.getByTestId('post-media-image');
      fireEvent.press(media);

      expect(mockHandlers.onMediaPress).toHaveBeenCalledWith(
        'https://example.com/image.jpg',
        'image'
      );
    });

    it('should render video media with play button', () => {
      const postWithVideo = {
        ...mockPost,
        media_type: 'video' as const,
        media_url: 'https://example.com/video.mp4',
      };

      render(<PostCard post={postWithVideo} {...mockHandlers} />);

      const playButton = screen.getByTestId('video-play-button');
      expect(playButton).toBeTruthy();
    });

    it('should call onMediaPress when video pressed', () => {
      const postWithVideo = {
        ...mockPost,
        media_type: 'video' as const,
        media_url: 'https://example.com/video.mp4',
      };

      render(<PostCard post={postWithVideo} {...mockHandlers} />);

      const videoContainer = screen.getByTestId('video-container');
      fireEvent.press(videoContainer);

      expect(mockHandlers.onMediaPress).toHaveBeenCalledWith(
        'https://example.com/video.mp4',
        'video'
      );
    });

    it('should not render media for text posts', () => {
      render(<PostCard post={mockPost} {...mockHandlers} />);

      expect(screen.queryByTestId('post-media-image')).toBeNull();
      expect(screen.queryByTestId('video-container')).toBeNull();
    });
  });

  // ============================================================================
  // Action Buttons Tests
  // ============================================================================

  describe('Action Buttons', () => {
    it('should render like button', () => {
      render(<PostCard post={mockPost} {...mockHandlers} />);

      const likeButton = screen.getByTestId('like-button');
      expect(likeButton).toBeTruthy();
    });

    it('should show filled heart when post is liked', () => {
      const likedPost = { ...mockPost, is_liked: true };

      render(<PostCard post={likedPost} {...mockHandlers} />);

      const likeIcon = screen.getByTestId('like-icon');
      expect(likeIcon.props.name).toBe('heart');
      expect(likeIcon.props.color).toBe('#EF4444');
    });

    it('should show outline heart when post is not liked', () => {
      render(<PostCard post={mockPost} {...mockHandlers} />);

      const likeIcon = screen.getByTestId('like-icon');
      expect(likeIcon.props.name).toBe('heart-outline');
      expect(likeIcon.props.color).toBe('#6B7280');
    });

    it('should call onLike when like button pressed', () => {
      render(<PostCard post={mockPost} {...mockHandlers} />);

      const likeButton = screen.getByTestId('like-button');
      fireEvent.press(likeButton);

      expect(mockHandlers.onLike).toHaveBeenCalledWith('1');
    });

    it('should call onComment when comment button pressed', () => {
      render(<PostCard post={mockPost} {...mockHandlers} />);

      const commentButton = screen.getByTestId('comment-button');
      fireEvent.press(commentButton);

      expect(mockHandlers.onComment).toHaveBeenCalledWith('1');
    });

    it('should call onShare when share button pressed', () => {
      render(<PostCard post={mockPost} {...mockHandlers} />);

      const shareButton = screen.getByTestId('share-button');
      fireEvent.press(shareButton);

      expect(mockHandlers.onShare).toHaveBeenCalledWith('1');
    });
  });

  // ============================================================================
  // Count Formatting Tests
  // ============================================================================

  describe('Count Formatting', () => {
    it('should display like count', () => {
      render(<PostCard post={mockPost} {...mockHandlers} />);

      expect(screen.getByText('42')).toBeTruthy();
    });

    it('should format counts over 1000 with K suffix', () => {
      const postWithKCounts = {
        ...mockPost,
        like_count: 1500,
        comment_count: 2300,
        share_count: 3800,
      };

      render(<PostCard post={postWithKCounts} {...mockHandlers} />);

      expect(screen.getByText('1.5K')).toBeTruthy();
      expect(screen.getByText('2.3K')).toBeTruthy();
      expect(screen.getByText('3.8K')).toBeTruthy();
    });

    it('should format counts over 1 million with M suffix', () => {
      const postWithMCounts = {
        ...mockPost,
        like_count: 1500000,
      };

      render(<PostCard post={postWithMCounts} {...mockHandlers} />);

      expect(screen.getByText('1.5M')).toBeTruthy();
    });

    it('should not show count when zero', () => {
      const postWithZeroCounts = {
        ...mockPost,
        like_count: 0,
        comment_count: 0,
        share_count: 0,
      };

      render(<PostCard post={postWithZeroCounts} {...mockHandlers} />);

      expect(screen.queryByText('0')).toBeNull();
    });
  });

  // ============================================================================
  // Timestamp Formatting Tests
  // ============================================================================

  describe('Timestamp Formatting', () => {
    it('should show "Just now" for very recent posts', () => {
      const recentPost = {
        ...mockPost,
        created_at: new Date().toISOString(),
      };

      render(<PostCard post={recentPost} {...mockHandlers} />);

      expect(screen.getByText('Just now')).toBeTruthy();
    });

    it('should show minutes for posts under 1 hour old', () => {
      const post30MinAgo = {
        ...mockPost,
        created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      };

      render(<PostCard post={post30MinAgo} {...mockHandlers} />);

      expect(screen.getByText('30m ago')).toBeTruthy();
    });

    it('should show hours for posts under 24 hours old', () => {
      const post5HoursAgo = {
        ...mockPost,
        created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      };

      render(<PostCard post={post5HoursAgo} {...mockHandlers} />);

      expect(screen.getByText('5h ago')).toBeTruthy();
    });

    it('should show days for posts under 7 days old', () => {
      const post3DaysAgo = {
        ...mockPost,
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      };

      render(<PostCard post={post3DaysAgo} {...mockHandlers} />);

      expect(screen.getByText('3d ago')).toBeTruthy();
    });

    it('should show date for posts over 7 days old', () => {
      const oldPost = {
        ...mockPost,
        created_at: new Date('2025-01-01').toISOString(),
      };

      render(<PostCard post={oldPost} {...mockHandlers} />);

      expect(screen.getByText(/Jan \d+/)).toBeTruthy();
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle missing onMediaPress callback', () => {
      const postWithImage = {
        ...mockPost,
        media_type: 'image' as const,
        media_url: 'https://example.com/image.jpg',
      };

      const { onMediaPress, ...handlers } = mockHandlers;

      expect(() => render(<PostCard post={postWithImage} {...handlers} />)).not.toThrow();
    });

    it('should handle empty content', () => {
      const emptyPost = {
        ...mockPost,
        content: '',
      };

      expect(() => render(<PostCard post={emptyPost} {...mockHandlers} />)).not.toThrow();
    });

    it('should handle very large counts', () => {
      const postWithLargeCounts = {
        ...mockPost,
        like_count: 999999999,
      };

      render(<PostCard post={postWithLargeCounts} {...mockHandlers} />);

      expect(screen.getByText('1000.0M')).toBeTruthy();
    });

    it('should handle special characters in content', () => {
      const postWithSpecialChars = {
        ...mockPost,
        content: 'Test <>&"\'',
      };

      render(<PostCard post={postWithSpecialChars} {...mockHandlers} />);

      expect(screen.getByText('Test <>&"\'')).toBeTruthy();
    });
  });

  // ============================================================================
  // React.memo Tests
  // ============================================================================

  describe('React.memo Optimization', () => {
    it('should be a memoized component', () => {
      expect(PostCard.type).toBeDefined();
    });

    it('should not re-render when parent re-renders with same props', () => {
      const { rerender } = render(<PostCard post={mockPost} {...mockHandlers} />);

      const firstRender = screen.getByText('testuser');

      rerender(<PostCard post={mockPost} {...mockHandlers} />);

      const secondRender = screen.getByText('testuser');
      expect(firstRender).toBe(secondRender);
    });
  });

  // ============================================================================
  // Accessibility Tests
  // ============================================================================

  describe('Accessibility', () => {
    it('should have accessible header button', () => {
      render(<PostCard post={mockPost} {...mockHandlers} />);

      const header = screen.getByTestId('post-header');
      expect(header.props.accessible).toBe(true);
      expect(header.props.accessibilityLabel).toContain('testuser');
    });

    it('should have accessible action buttons', () => {
      render(<PostCard post={mockPost} {...mockHandlers} />);

      const likeButton = screen.getByTestId('like-button');
      const commentButton = screen.getByTestId('comment-button');
      const shareButton = screen.getByTestId('share-button');

      expect(likeButton.props.accessibilityLabel).toContain('Like');
      expect(commentButton.props.accessibilityLabel).toContain('Comment');
      expect(shareButton.props.accessibilityLabel).toContain('Share');
    });
  });

  // ============================================================================
  // Performance Tests
  // ============================================================================

  describe('Performance', () => {
    it('should render within acceptable time', () => {
      const startTime = Date.now();
      render(<PostCard post={mockPost} {...mockHandlers} />);
      const renderTime = Date.now() - startTime;

      expect(renderTime).toBeLessThan(100);
    });
  });
});
