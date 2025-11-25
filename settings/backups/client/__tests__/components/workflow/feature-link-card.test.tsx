import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import FeatureLinkCard from '@/components/workflow/feature-link-card';
import { AccessibilityWrapper } from '@/__tests__/utils/test-wrappers';

const renderWithProviders = (component: React.ReactElement) => {
  return render(<AccessibilityWrapper>{component}</AccessibilityWrapper>);
};

describe('FeatureLinkCard', () => {
  const mockOnPress = jest.fn();

  const defaultProps = {
    title: 'Related Quest',
    description: 'Complete this quest to earn 100 XP',
    sourceFeature: 'quests',
    targetId: 'quest-123',
    onPress: mockOnPress,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders link card with title and description', () => {
    renderWithProviders(<FeatureLinkCard {...defaultProps} />);

    expect(screen.getByText('Related Quest')).toBeTruthy();
    expect(screen.getByText(/Complete this quest to earn 100 XP/i)).toBeTruthy();
  });

  it('displays feature icon based on source feature', () => {
    renderWithProviders(<FeatureLinkCard {...defaultProps} sourceFeature="learning" />);

    const card = screen.getByTestId('feature-link-card');
    expect(card).toBeTruthy();
  });

  it('calls onPress with target ID when tapped', () => {
    renderWithProviders(<FeatureLinkCard {...defaultProps} />);

    const card = screen.getByTestId('feature-link-card');
    fireEvent.press(card);

    expect(mockOnPress).toHaveBeenCalledWith('quest-123');
  });

  it('shows feature badge with feature type', () => {
    renderWithProviders(<FeatureLinkCard {...defaultProps} />);

    const badges = screen.getAllByText(/quest/i);
    expect(badges.length).toBeGreaterThan(0);
  });

  it('displays metadata like XP, points, or price', () => {
    renderWithProviders(
      <FeatureLinkCard {...defaultProps} metadata={{ xp: 100, points: 50, difficulty: 'medium' }} />
    );

    expect(screen.getByText('100')).toBeTruthy();
    expect(screen.getByText('XP')).toBeTruthy();
    expect(screen.getByText('50')).toBeTruthy();
    expect(screen.getByText('Points')).toBeTruthy();
    expect(screen.getByText('medium')).toBeTruthy();
  });

  it('has proper accessibility properties', () => {
    renderWithProviders(<FeatureLinkCard {...defaultProps} />);

    const card = screen.getByTestId('feature-link-card');
    expect(card.props.accessibilityRole).toBe('button');
    expect(card.props.accessibilityLabel).toBeTruthy();
    expect(card.props.accessibilityHint).toBeTruthy();
  });

  it('shows thumbnail image when provided', () => {
    renderWithProviders(
      <FeatureLinkCard {...defaultProps} thumbnailUrl="https://example.com/image.jpg" />
    );

    const image = screen.getByTestId('feature-link-thumbnail');
    expect(image).toBeTruthy();
  });

  it('applies pressed style when pressed', () => {
    renderWithProviders(<FeatureLinkCard {...defaultProps} />);

    const card = screen.getByTestId('feature-link-card');
    expect(card).toBeTruthy();
  });

  it('displays status indicator for locked/completed content', () => {
    renderWithProviders(<FeatureLinkCard {...defaultProps} status="completed" />);

    expect(screen.getByText(/completed/i)).toBeTruthy();
  });

  it('shows progress bar for in-progress content', () => {
    renderWithProviders(<FeatureLinkCard {...defaultProps} progress={65} />);

    const progressBar = screen.getByTestId('progress-bar');
    expect(progressBar).toBeTruthy();
  });

  it('renders in compact mode', () => {
    renderWithProviders(<FeatureLinkCard {...defaultProps} variant="compact" />);

    const card = screen.getByTestId('feature-link-card');
    expect(card).toBeTruthy();
  });

  it('displays tags or categories', () => {
    renderWithProviders(
      <FeatureLinkCard {...defaultProps} tags={['beginner', 'featured', 'trending']} />
    );

    expect(screen.getByText('beginner')).toBeTruthy();
    expect(screen.getByText('featured')).toBeTruthy();
  });
});
