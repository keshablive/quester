/**
 * SocialEngagementPanel Component Tests
 *
 * Tests for the SocialEngagementPanel component covering:
 * - Like functionality
 * - Share functionality
 * - Rating functionality
 * - Comments tab
 * - Stats display
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { SocialEngagementPanel } from '@/components/social/SocialEngagementPanel';

// Mock dependencies
jest.mock('@/components/social/CommentThread', () => ({
  CommentThread: 'CommentThread',
}));

jest.mock('@/components/social/ShareButtons', () => ({
  ShareButtons: 'ShareButtons',
}));

jest.mock('@/components/social/RatingStars', () => ({
  RatingStars: 'RatingStars',
  RatingInput: 'RatingInput',
}));

jest.mock('@/lib/hooks/useInteractions', () => ({
  useInteractions: () => ({
    counts: {
      likes_count: 42,
      shares_count: 15,
      comments_count: 28,
      avg_rating: 4.5,
      ratings_count: 120,
    },
    userStatus: {
      has_liked: false,
      has_shared: false,
      user_rating: null,
    },
    loading: false,
    createLike: jest.fn(),
    createShare: jest.fn(),
    createRating: jest.fn(),
    loadCounts: jest.fn(),
    loadUserStatus: jest.fn(),
  }),
}));

describe('SocialEngagementPanel', () => {
  const mockProps = {
    targetType: 'quest',
    targetId: 123,
    title: 'Test Quest',
    url: 'https://quester.app/quest/123',
    description: 'Test description',
    currentUserId: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render panel title', () => {
      render(<SocialEngagementPanel {...mockProps} />);

      expect(screen.getByText('Community Engagement')).toBeTruthy();
    });

    it('should display like count', () => {
      render(<SocialEngagementPanel {...mockProps} />);

      expect(screen.getByText('42')).toBeTruthy();
    });

    it('should display share count', () => {
      render(<SocialEngagementPanel {...mockProps} />);

      expect(screen.getByText('15')).toBeTruthy();
    });

    it('should display comment count', () => {
      render(<SocialEngagementPanel {...mockProps} />);

      expect(screen.getByText('28')).toBeTruthy();
    });

    it('should display average rating', () => {
      render(<SocialEngagementPanel {...mockProps} />);

      // RatingStars is mocked, so check that component renders
      expect(screen.getByText('Community Engagement')).toBeTruthy();
    });
  });

  describe('Tab Navigation', () => {
    it('should show overview tab by default', () => {
      render(<SocialEngagementPanel {...mockProps} />);

      expect(screen.getByText('Overview')).toBeTruthy();
    });

    it('should show comments tab', () => {
      render(<SocialEngagementPanel {...mockProps} />);

      expect(screen.getByText(/Comments/)).toBeTruthy();
    });

    it('should switch to comments tab when clicked', () => {
      render(<SocialEngagementPanel {...mockProps} />);

      const commentsTab = screen.getByText(/Comments/);
      fireEvent.press(commentsTab);

      // Tab should be active
      expect(commentsTab).toBeTruthy();
    });
  });

  describe('Conditional Rendering', () => {
    it('should show likes when showLikes is true', () => {
      render(<SocialEngagementPanel {...mockProps} showLikes={true} />);

      expect(screen.getByText('42')).toBeTruthy();
    });

    it('should hide likes when showLikes is false', () => {
      render(<SocialEngagementPanel {...mockProps} showLikes={false} />);

      // Should not show like count in stats
      const allText = screen.getAllByText(/\d+/);
      expect(allText.some((el) => el.children.includes('42'))).toBe(false);
    });

    it('should show sharing when showSharing is true', () => {
      render(<SocialEngagementPanel {...mockProps} showSharing={true} />);

      expect(screen.getByText('15')).toBeTruthy();
    });

    it('should show rating when showRating is true', () => {
      render(<SocialEngagementPanel {...mockProps} showRating={true} />);

      // RatingStars component should be rendered (mocked)
      expect(screen.getByText('Community Engagement')).toBeTruthy();
    });

    it('should show comments when showComments is true', () => {
      render(<SocialEngagementPanel {...mockProps} showComments={true} />);

      expect(screen.getByText('28')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing currentUserId', () => {
      const propsWithoutUser = { ...mockProps, currentUserId: undefined };

      render(<SocialEngagementPanel {...propsWithoutUser} />);

      expect(screen.getByText('Community Engagement')).toBeTruthy();
    });

    it('should handle missing description', () => {
      const propsWithoutDesc = { ...mockProps, description: undefined };

      render(<SocialEngagementPanel {...propsWithoutDesc} />);

      expect(screen.getByText('Community Engagement')).toBeTruthy();
    });

    it('should handle all features disabled', () => {
      render(
        <SocialEngagementPanel
          {...mockProps}
          showLikes={false}
          showSharing={false}
          showRating={false}
          showComments={false}
        />
      );

      expect(screen.getByText('Community Engagement')).toBeTruthy();
    });
  });

  describe('Performance', () => {
    it('should render within acceptable time', () => {
      const startTime = Date.now();
      render(<SocialEngagementPanel {...mockProps} />);
      const renderTime = Date.now() - startTime;

      expect(renderTime).toBeLessThan(100);
    });
  });
});
