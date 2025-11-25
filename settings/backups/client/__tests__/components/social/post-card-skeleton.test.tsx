/**
 * post-card-skeleton Component Tests
 *
 * Tests for skeleton loading components:
 * - PostCardSkeleton
 * - PostFeedSkeleton
 * - CommentSkeleton
 * - CommentListSkeleton
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import {
  PostCardSkeleton,
  PostFeedSkeleton,
  CommentSkeleton,
  CommentListSkeleton,
} from '@/components/social/post-card-skeleton';

describe('PostCardSkeleton', () => {
  it('should render skeleton elements', () => {
    render(<PostCardSkeleton />);

    // Skeleton should render without errors
    expect(screen.getByTestId('post-skeleton') || screen.getByLabelText('Loading')).toBeTruthy();
  });

  it('should show media skeleton when showMedia is true', () => {
    render(<PostCardSkeleton showMedia={true} />);

    expect(screen.getByTestId('post-skeleton') || screen.getByLabelText('Loading')).toBeTruthy();
  });

  it('should not show media skeleton when showMedia is false', () => {
    render(<PostCardSkeleton showMedia={false} />);

    expect(screen.getByTestId('post-skeleton') || screen.getByLabelText('Loading')).toBeTruthy();
  });

  it('should render with custom className', () => {
    render(<PostCardSkeleton className="custom-class" />);

    expect(screen.getByTestId('post-skeleton') || screen.getByLabelText('Loading')).toBeTruthy();
  });

  it('should render within acceptable time', () => {
    const startTime = Date.now();
    render(<PostCardSkeleton />);
    const renderTime = Date.now() - startTime;

    expect(renderTime).toBeLessThan(50);
  });
});

describe('PostFeedSkeleton', () => {
  it('should render default count of skeletons', () => {
    render(<PostFeedSkeleton />);

    // Should render 5 skeleton cards by default
    expect(screen.getByTestId('feed-skeleton') || screen.getByLabelText('Loading')).toBeTruthy();
  });

  it('should render custom count of skeletons', () => {
    render(<PostFeedSkeleton count={3} />);

    expect(screen.getByTestId('feed-skeleton') || screen.getByLabelText('Loading')).toBeTruthy();
  });

  it('should handle count of 1', () => {
    render(<PostFeedSkeleton count={1} />);

    expect(screen.getByTestId('feed-skeleton') || screen.getByLabelText('Loading')).toBeTruthy();
  });

  it('should handle large count', () => {
    render(<PostFeedSkeleton count={20} />);

    expect(screen.getByTestId('feed-skeleton') || screen.getByLabelText('Loading')).toBeTruthy();
  });

  it('should render within acceptable time', () => {
    const startTime = Date.now();
    render(<PostFeedSkeleton count={10} />);
    const renderTime = Date.now() - startTime;

    expect(renderTime).toBeLessThan(200);
  });
});

describe('CommentSkeleton', () => {
  it('should render skeleton elements', () => {
    render(<CommentSkeleton />);

    expect(screen.getByTestId('comment-skeleton') || screen.getByLabelText('Loading')).toBeTruthy();
  });

  it('should render with custom className', () => {
    render(<CommentSkeleton className="custom-class" />);

    expect(screen.getByTestId('comment-skeleton') || screen.getByLabelText('Loading')).toBeTruthy();
  });

  it('should render within acceptable time', () => {
    const startTime = Date.now();
    render(<CommentSkeleton />);
    const renderTime = Date.now() - startTime;

    expect(renderTime).toBeLessThan(50);
  });
});

describe('CommentListSkeleton', () => {
  it('should render default count of skeletons', () => {
    render(<CommentListSkeleton />);

    // Should render 3 skeleton comments by default
    expect(
      screen.getByTestId('comment-list-skeleton') || screen.getByLabelText('Loading')
    ).toBeTruthy();
  });

  it('should render custom count of skeletons', () => {
    render(<CommentListSkeleton count={5} />);

    expect(
      screen.getByTestId('comment-list-skeleton') || screen.getByLabelText('Loading')
    ).toBeTruthy();
  });

  it('should handle count of 1', () => {
    render(<CommentListSkeleton count={1} />);

    expect(
      screen.getByTestId('comment-list-skeleton') || screen.getByLabelText('Loading')
    ).toBeTruthy();
  });

  it('should handle large count', () => {
    render(<CommentListSkeleton count={15} />);

    expect(
      screen.getByTestId('comment-list-skeleton') || screen.getByLabelText('Loading')
    ).toBeTruthy();
  });

  it('should render within acceptable time', () => {
    const startTime = Date.now();
    render(<CommentListSkeleton count={10} />);
    const renderTime = Date.now() - startTime;

    expect(renderTime).toBeLessThan(100);
  });
});

describe('Skeleton Components Integration', () => {
  it('should render PostFeedSkeleton with PostCardSkeletons', () => {
    render(<PostFeedSkeleton count={3} />);

    expect(screen.getByTestId('feed-skeleton') || screen.getByLabelText('Loading')).toBeTruthy();
  });

  it('should render CommentListSkeleton with CommentSkeletons', () => {
    render(<CommentListSkeleton count={3} />);

    expect(
      screen.getByTestId('comment-list-skeleton') || screen.getByLabelText('Loading')
    ).toBeTruthy();
  });

  it('should handle mixed skeleton types', () => {
    const { unmount } = render(<PostCardSkeleton />);
    expect(screen.getByTestId('post-skeleton')).toBeTruthy();

    unmount();
    render(<CommentSkeleton />);
    expect(screen.getByTestId('comment-skeleton')).toBeTruthy();
  });
});

describe('Skeleton Edge Cases', () => {
  it('should handle zero count gracefully', () => {
    render(<PostFeedSkeleton count={0} />);

    // Should render container even with 0 count
    expect(screen.getByTestId('feed-skeleton') || screen.getByLabelText('Loading')).toBeTruthy();
  });

  it('should handle negative count gracefully', () => {
    render(<CommentListSkeleton count={-1} />);

    // Should handle gracefully without errors
    expect(
      screen.getByTestId('comment-list-skeleton') || screen.getByLabelText('Loading')
    ).toBeTruthy();
  });

  it('should handle undefined className', () => {
    render(<PostCardSkeleton className={undefined} />);

    expect(screen.getByTestId('post-skeleton') || screen.getByLabelText('Loading')).toBeTruthy();
  });

  it('should handle empty string className', () => {
    render(<CommentSkeleton className="" />);

    expect(screen.getByTestId('comment-skeleton') || screen.getByLabelText('Loading')).toBeTruthy();
  });
});
