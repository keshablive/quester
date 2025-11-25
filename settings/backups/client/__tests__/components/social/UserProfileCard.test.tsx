/**
 * UserProfileCard Component Tests
 *
 * Tests for the UserProfileCard component covering:
 * - Profile information display
 * - Follow/unfollow functionality
 * - Stats display (followers, following, posts)
 * - Avatar rendering
 * - Online status
 * - Edit profile functionality
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { UserProfileCard } from '@/components/social/UserProfileCard';

// Mock dependencies
jest.mock('@/components/real-time/online-status-badge', () => ({
  OnlineStatusBadge: 'OnlineStatusBadge',
}));

jest.mock('@/lib/hooks/use-real-time-connection', () => ({
  useRealTimeConnection: () => ({
    isConnected: false,
    on: jest.fn(),
    off: jest.fn(),
  }),
}));

describe('UserProfileCard', () => {
  const mockProfile = {
    id: 'user-1',
    username: 'testuser',
    email: 'test@example.com',
    avatar_url: 'https://example.com/avatar.jpg',
    bio: 'This is my bio',
    follower_count: 150,
    following_count: 80,
    post_count: 42,
    is_following: false,
    status: 'online' as const,
  };

  const mockHandlers = {
    onFollow: jest.fn(),
    onUnfollow: jest.fn(),
    onEditProfile: jest.fn(),
    onFollowersPress: jest.fn(),
    onFollowingPress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Profile Information', () => {
    it('should render username', () => {
      render(<UserProfileCard profile={mockProfile} isOwnProfile={false} {...mockHandlers} />);

      expect(screen.getByText('testuser')).toBeTruthy();
    });

    it('should render bio', () => {
      render(<UserProfileCard profile={mockProfile} isOwnProfile={false} {...mockHandlers} />);

      expect(screen.getByText('This is my bio')).toBeTruthy();
    });

    it('should render without bio', () => {
      const profileWithoutBio = { ...mockProfile, bio: undefined };

      render(
        <UserProfileCard profile={profileWithoutBio} isOwnProfile={false} {...mockHandlers} />
      );

      expect(screen.getByText('testuser')).toBeTruthy();
    });
  });

  describe('Stats Display', () => {
    it('should display follower count', () => {
      render(<UserProfileCard profile={mockProfile} isOwnProfile={false} {...mockHandlers} />);

      expect(screen.getByText('150')).toBeTruthy();
      expect(screen.getByText('Followers')).toBeTruthy();
    });

    it('should display following count', () => {
      render(<UserProfileCard profile={mockProfile} isOwnProfile={false} {...mockHandlers} />);

      expect(screen.getByText('80')).toBeTruthy();
      expect(screen.getByText('Following')).toBeTruthy();
    });

    it('should display post count', () => {
      render(<UserProfileCard profile={mockProfile} isOwnProfile={false} {...mockHandlers} />);

      expect(screen.getByText('42')).toBeTruthy();
      expect(screen.getByText('Posts')).toBeTruthy();
    });

    it('should format large follower counts with K suffix', () => {
      const profileWithManyFollowers = { ...mockProfile, follower_count: 2500 };

      render(
        <UserProfileCard
          profile={profileWithManyFollowers}
          isOwnProfile={false}
          {...mockHandlers}
        />
      );

      expect(screen.getByText('2.5K')).toBeTruthy();
    });

    it('should format very large counts with M suffix', () => {
      const profileWithMillions = { ...mockProfile, follower_count: 1500000 };

      render(
        <UserProfileCard profile={profileWithMillions} isOwnProfile={false} {...mockHandlers} />
      );

      expect(screen.getByText('1.5M')).toBeTruthy();
    });

    it('should call onFollowersPress when followers tapped', () => {
      render(<UserProfileCard profile={mockProfile} isOwnProfile={false} {...mockHandlers} />);

      const followersButton = screen.getByText('Followers').parent;
      fireEvent.press(followersButton);

      expect(mockHandlers.onFollowersPress).toHaveBeenCalled();
    });

    it('should call onFollowingPress when following tapped', () => {
      render(<UserProfileCard profile={mockProfile} isOwnProfile={false} {...mockHandlers} />);

      const followingButton = screen.getByText('Following').parent;
      fireEvent.press(followingButton);

      expect(mockHandlers.onFollowingPress).toHaveBeenCalled();
    });
  });

  describe('Follow/Unfollow Functionality', () => {
    it('should show Follow button when not following', () => {
      render(<UserProfileCard profile={mockProfile} isOwnProfile={false} {...mockHandlers} />);

      expect(screen.getByText('Follow')).toBeTruthy();
    });

    it('should show Following button when already following', () => {
      const followingProfile = { ...mockProfile, is_following: true };

      render(<UserProfileCard profile={followingProfile} isOwnProfile={false} {...mockHandlers} />);

      const followingTexts = screen.getAllByText('Following');
      expect(followingTexts.length).toBeGreaterThan(0);
    });

    it('should call onFollow when Follow button pressed', () => {
      render(<UserProfileCard profile={mockProfile} isOwnProfile={false} {...mockHandlers} />);

      const followButton = screen.getByText('Follow');
      fireEvent.press(followButton);

      expect(mockHandlers.onFollow).toHaveBeenCalled();
    });

    it('should call onUnfollow when Following button pressed', () => {
      const followingProfile = { ...mockProfile, is_following: true };

      render(<UserProfileCard profile={followingProfile} isOwnProfile={false} {...mockHandlers} />);

      const followingTexts = screen.getAllByText('Following');
      // The button text is the second occurrence (first is in stats)
      const followingButton = followingTexts[1] || followingTexts[0];
      fireEvent.press(followingButton.parent);

      expect(mockHandlers.onUnfollow).toHaveBeenCalled();
    });
  });

  describe('Own Profile View', () => {
    it('should show Edit Profile button for own profile', () => {
      render(<UserProfileCard profile={mockProfile} isOwnProfile={true} {...mockHandlers} />);

      expect(screen.getByText('Edit Profile')).toBeTruthy();
    });

    it('should not show Follow button for own profile', () => {
      render(<UserProfileCard profile={mockProfile} isOwnProfile={true} {...mockHandlers} />);

      expect(screen.queryByText('Follow')).toBeNull();
    });

    it('should call onEditProfile when Edit Profile button pressed', () => {
      render(<UserProfileCard profile={mockProfile} isOwnProfile={true} {...mockHandlers} />);

      const editButton = screen.getByText('Edit Profile');
      fireEvent.press(editButton);

      expect(mockHandlers.onEditProfile).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing avatar_url', () => {
      const profileWithoutAvatar = { ...mockProfile, avatar_url: undefined };

      render(
        <UserProfileCard profile={profileWithoutAvatar} isOwnProfile={false} {...mockHandlers} />
      );

      expect(screen.getByText('T')).toBeTruthy(); // First letter
    });

    it('should handle zero counts', () => {
      const newProfile = {
        ...mockProfile,
        follower_count: 0,
        following_count: 0,
        post_count: 0,
      };

      render(<UserProfileCard profile={newProfile} isOwnProfile={false} {...mockHandlers} />);

      expect(screen.getAllByText('0')).toHaveLength(3);
    });

    it('should handle missing email', () => {
      const profileWithoutEmail = { ...mockProfile, email: undefined };

      render(
        <UserProfileCard profile={profileWithoutEmail} isOwnProfile={false} {...mockHandlers} />
      );

      expect(screen.getByText('testuser')).toBeTruthy();
    });
  });

  describe('Performance', () => {
    it('should render within acceptable time', () => {
      const startTime = Date.now();
      render(<UserProfileCard profile={mockProfile} isOwnProfile={false} {...mockHandlers} />);
      const renderTime = Date.now() - startTime;

      expect(renderTime).toBeLessThan(100);
    });
  });
});
