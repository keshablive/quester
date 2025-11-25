import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import CrossFeatureActions from '@/components/navigation/cross-feature-actions';

describe('CrossFeatureActions', () => {
  const mockOnActionPress = jest.fn();

  const defaultProps = {
    onActionPress: mockOnActionPress,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders cross-feature action buttons', () => {
    render(
      <CrossFeatureActions
        {...defaultProps}
        sourceFeature="quests"
        contentType="quest"
        contentId="quest-123"
      />
    );

    const container = screen.getByTestId('cross-feature-actions');
    expect(container).toBeTruthy();
  });

  it('shows context-aware actions based on source feature and content', () => {
    render(
      <CrossFeatureActions
        {...defaultProps}
        sourceFeature="quests"
        contentType="quest"
        contentId="quest-123"
      />
    );

    // Quest → Social: Share quest
    expect(screen.getByText(/share.*social/i)).toBeTruthy();
  });

  it('displays different actions for different source features', () => {
    const { rerender } = render(
      <CrossFeatureActions
        {...defaultProps}
        sourceFeature="learning"
        contentType="course"
        contentId="course-123"
      />
    );

    // Course → Quest: Link to quest
    expect(screen.getByText(/link.*quest/i)).toBeTruthy();

    rerender(
      <CrossFeatureActions
        {...defaultProps}
        sourceFeature="marketplace"
        contentType="item"
        contentId="item-123"
      />
    );

    // Item → Social: Share item
    expect(screen.getByText(/share.*social/i)).toBeTruthy();
  });

  it('calls onActionPress with correct parameters when action is tapped', () => {
    render(
      <CrossFeatureActions
        {...defaultProps}
        sourceFeature="quests"
        contentType="quest"
        contentId="quest-123"
      />
    );

    const shareButton = screen.getByText(/share.*social/i);
    fireEvent.press(shareButton);

    expect(mockOnActionPress).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceFeature: 'quests',
        targetFeature: 'social',
        action: 'share',
        contentId: 'quest-123',
      })
    );
  });

  it('shows action icons with labels', () => {
    render(
      <CrossFeatureActions
        {...defaultProps}
        sourceFeature="quests"
        contentType="quest"
        contentId="quest-123"
      />
    );

    const actionButton = screen.getByText(/share.*social/i).parent;
    expect(actionButton).toBeTruthy();
  });

  it('has proper accessibility properties', () => {
    render(
      <CrossFeatureActions
        {...defaultProps}
        sourceFeature="quests"
        contentType="quest"
        contentId="quest-123"
      />
    );

    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      expect(button.props.accessibilityLabel).toBeTruthy();
      expect(button.props.accessibilityHint).toBeTruthy();
    });
  });

  it('limits number of visible actions when maxActions is specified', () => {
    render(
      <CrossFeatureActions
        {...defaultProps}
        sourceFeature="quests"
        contentType="quest"
        contentId="quest-123"
        maxActions={2}
      />
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeLessThanOrEqual(2);
  });

  it('shows empty state when no cross-feature actions available', () => {
    render(
      <CrossFeatureActions
        {...defaultProps}
        sourceFeature="unknown"
        contentType="unknown"
        contentId="unknown-123"
      />
    );

    expect(screen.getByText(/no actions available/i)).toBeTruthy();
  });

  it('displays actions in horizontal layout by default', () => {
    render(
      <CrossFeatureActions
        {...defaultProps}
        sourceFeature="quests"
        contentType="quest"
        contentId="quest-123"
      />
    );

    const container = screen.getByTestId('cross-feature-actions');
    const styles = Array.isArray(container.props.style)
      ? container.props.style
      : [container.props.style];
    const hasHorizontalLayout = styles.some((s: any) => s?.flexDirection === 'row');
    expect(hasHorizontalLayout).toBe(true);
  });

  it('groups related actions together', () => {
    render(
      <CrossFeatureActions
        {...defaultProps}
        sourceFeature="learning"
        contentType="certificate"
        contentId="cert-123"
      />
    );

    // Certificate can be shared to social AND listed in marketplace
    expect(screen.getByText(/share.*social/i)).toBeTruthy();
    expect(screen.getByText(/list.*marketplace/i)).toBeTruthy();
  });
});
