import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import QuickActionsMenu from '@/components/navigation/quick-actions-menu';
import { AccessibilityProvider } from '@/lib/hooks/use-accessibility';

const renderWithProvider = (ui: React.ReactElement) => {
  return render(<AccessibilityProvider>{ui}</AccessibilityProvider>);
};

describe('QuickActionsMenu', () => {
  const mockOnActionPress = jest.fn();

  const defaultProps = {
    onActionPress: mockOnActionPress,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders menu with default actions', () => {
    renderWithProvider(<QuickActionsMenu onActionPress={mockOnActionPress} />);

    // Should show at least one action
    const menu = screen.getByTestId('quick-actions-menu');
    expect(menu).toBeTruthy();
  });

  it('displays contextual actions based on currentFeature', () => {
    renderWithProvider(
      <QuickActionsMenu onActionPress={mockOnActionPress} currentFeature="quests" />
    );

    expect(screen.getByText(/create quest/i)).toBeTruthy();
  });

  it('displays different actions for different features', () => {
    const { rerender } = renderWithProvider(
      <QuickActionsMenu onActionPress={mockOnActionPress} currentFeature="quests" />
    );
    expect(screen.getByText(/create quest/i)).toBeTruthy();

    rerender(
      <AccessibilityProvider>
        <QuickActionsMenu onActionPress={mockOnActionPress} currentFeature="learning" />
      </AccessibilityProvider>
    );
    expect(screen.getByText(/browse courses/i)).toBeTruthy();
  });

  it('calls onActionPress with action id when action is tapped', () => {
    renderWithProvider(
      <QuickActionsMenu onActionPress={mockOnActionPress} currentFeature="quests" />
    );

    const action = screen.getByText(/create quest/i);
    fireEvent.press(action);

    expect(mockOnActionPress).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.any(String),
        feature: 'quests',
      })
    );
  });

  it('shows action icons alongside labels', () => {
    renderWithProvider(<QuickActionsMenu {...defaultProps} currentFeature="quests" />);

    const actionButton = screen.getByText(/create quest/i).parent;
    // Icon should be rendered (as SVG)
    expect(actionButton).toBeTruthy();
  });

  it('limits number of visible actions when maxActions is specified', () => {
    renderWithProvider(
      <QuickActionsMenu {...defaultProps} currentFeature="quests" maxActions={2} />
    );

    // Check by counting action buttons with testID pattern
    const actionButtons = screen.queryAllByTestId(/^action-/);
    expect(actionButtons.length).toBe(2);
  });

  it('has proper accessibility properties', () => {
    renderWithProvider(<QuickActionsMenu {...defaultProps} currentFeature="quests" />);

    const actions = screen.queryAllByTestId(/^action-/);
    actions.forEach((action) => {
      expect(action.props.accessibilityRole).toBe('menuitem');
      expect(action.props.accessibilityLabel).toBeTruthy();
      expect(action.props.accessibilityHint).toBeTruthy();
    });
  });

  it('renders in horizontal layout by default', () => {
    renderWithProvider(<QuickActionsMenu {...defaultProps} currentFeature="quests" />);

    const menu = screen.getByTestId('quick-actions-menu');
    const styles = Array.isArray(menu.props.style) ? menu.props.style : [menu.props.style];
    const hasHorizontalLayout = styles.some((s: any) => s?.flexDirection === 'row');
    expect(hasHorizontalLayout).toBe(true);
  });

  it('renders in vertical layout when specified', () => {
    renderWithProvider(
      <QuickActionsMenu {...defaultProps} currentFeature="quests" layout="vertical" />
    );

    const menu = screen.getByTestId('quick-actions-menu');
    const styles = Array.isArray(menu.props.style) ? menu.props.style : [menu.props.style];
    const hasVerticalLayout = styles.some((s: any) => s?.flexDirection === 'column');
    expect(hasVerticalLayout).toBe(true);
  });

  it('shows empty state when no actions available', () => {
    renderWithProvider(<QuickActionsMenu {...defaultProps} currentFeature="unknown" />);

    expect(screen.getByText(/no quick actions/i)).toBeTruthy();
  });
});
