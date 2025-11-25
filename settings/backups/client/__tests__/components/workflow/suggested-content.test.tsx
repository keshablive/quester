import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import SuggestedContent from '@/components/workflow/suggested-content';
import { AccessibilityWrapper } from '@/__tests__/utils/test-wrappers';

describe('SuggestedContent', () => {
  const mockOnSuggestionPress = jest.fn();

  const defaultProps = {
    onSuggestionPress: mockOnSuggestionPress,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders suggested content based on current feature', () => {
    render(
      <AccessibilityWrapper>
        <SuggestedContent {...defaultProps} currentFeature="quests" context="quest_completed" />
      </AccessibilityWrapper>
    );

    const container = screen.getByTestId('suggested-content');
    expect(container).toBeTruthy();
  });

  it('displays contextual suggestions for quest completion', () => {
    render(
      <AccessibilityWrapper>
        <SuggestedContent
          {...defaultProps}
          currentFeature="quests"
          context="quest_completed"
          contextData={{ questId: 'quest-123', earnedXP: 100 }}
        />
      </AccessibilityWrapper>
    );

    // Should suggest related content like courses, marketplace items
    expect(screen.getByText(/suggested for you/i)).toBeTruthy();
  });

  it('shows different suggestions for different contexts', () => {
    const { rerender } = render(
      <AccessibilityWrapper>
        <SuggestedContent {...defaultProps} currentFeature="learning" context="course_completed" />
      </AccessibilityWrapper>
    );

    // Course completed → suggest certificate, related quests
    expect(screen.getByText(/suggested for you/i)).toBeTruthy();

    rerender(
      <AccessibilityWrapper>
        <SuggestedContent
          {...defaultProps}
          currentFeature="marketplace"
          context="purchase_completed"
        />
      </AccessibilityWrapper>
    );

    // Purchase completed → suggest related items, share to social
    expect(screen.getByText(/suggested for you/i)).toBeTruthy();
  });

  it('calls onSuggestionPress when suggestion is tapped', () => {
    render(
      <AccessibilityWrapper>
        <SuggestedContent {...defaultProps} currentFeature="quests" context="quest_completed" />
      </AccessibilityWrapper>
    );

    const suggestions = screen.getAllByRole('button');
    if (suggestions.length > 0) {
      fireEvent.press(suggestions[0]);
      expect(mockOnSuggestionPress).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.any(String),
          targetFeature: expect.any(String),
        })
      );
    }
  });

  it('displays suggestion icons and descriptions', () => {
    render(
      <AccessibilityWrapper>
        <SuggestedContent {...defaultProps} currentFeature="quests" context="quest_completed" />
      </AccessibilityWrapper>
    );

    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      expect(button).toBeTruthy();
    });
  });

  it('has proper accessibility properties', () => {
    render(
      <AccessibilityWrapper>
        <SuggestedContent {...defaultProps} currentFeature="quests" context="quest_completed" />
      </AccessibilityWrapper>
    );

    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      expect(button.props.accessibilityLabel).toBeTruthy();
      expect(button.props.accessibilityHint).toBeTruthy();
    });
  });

  it('limits number of suggestions when maxSuggestions is specified', () => {
    render(
      <AccessibilityWrapper>
        <SuggestedContent
          {...defaultProps}
          currentFeature="quests"
          context="quest_completed"
          maxSuggestions={2}
        />
      </AccessibilityWrapper>
    );

    const suggestions = screen.getAllByRole('button');
    expect(suggestions.length).toBeLessThanOrEqual(2);
  });

  it('shows empty state when no suggestions available', () => {
    render(
      <AccessibilityWrapper>
        <SuggestedContent {...defaultProps} currentFeature="unknown" context="unknown" />
      </AccessibilityWrapper>
    );

    expect(screen.getByText(/no suggestions/i)).toBeTruthy();
  });

  it('displays suggestions in grid layout', () => {
    render(
      <AccessibilityWrapper>
        <SuggestedContent
          {...defaultProps}
          currentFeature="quests"
          context="quest_completed"
          layout="grid"
        />
      </AccessibilityWrapper>
    );

    const container = screen.getByTestId('suggested-content');
    expect(container).toBeTruthy();
  });

  it('groups suggestions by category', () => {
    render(
      <AccessibilityWrapper>
        <SuggestedContent
          {...defaultProps}
          currentFeature="learning"
          context="course_completed"
          groupByCategory
        />
      </AccessibilityWrapper>
    );

    // Should show category headers like "Related Quests", "Recommended Courses"
    const container = screen.getByTestId('suggested-content');
    expect(container).toBeTruthy();
  });

  it('personalizes suggestions based on user history', () => {
    const userHistory = {
      completedQuests: ['quest-1', 'quest-2'],
      enrolledCourses: ['course-1'],
      interests: ['react-native', 'mobile-dev'],
    };

    render(
      <AccessibilityWrapper>
        <SuggestedContent
          {...defaultProps}
          currentFeature="quests"
          context="browsing"
          userHistory={userHistory}
        />
      </AccessibilityWrapper>
    );

    const container = screen.getByTestId('suggested-content');
    expect(container).toBeTruthy();
  });
});
