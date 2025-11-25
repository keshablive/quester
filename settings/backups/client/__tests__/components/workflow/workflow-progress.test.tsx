import React from 'react';
import { render, screen } from '@testing-library/react-native';
import WorkflowProgress from '@/components/workflow/workflow-progress';
import { AccessibilityWrapper } from '@/__tests__/utils/test-wrappers';

const renderWithProviders = (component: React.ReactElement) => {
  return render(<AccessibilityWrapper>{component}</AccessibilityWrapper>);
};

const mockSteps = [
  { id: '1', label: 'Complete Quest', featureType: 'quests', status: 'completed' },
  { id: '2', label: 'Watch Course', featureType: 'learning', status: 'current' },
  { id: '3', label: 'Buy Item', featureType: 'marketplace', status: 'upcoming' },
];

describe('WorkflowProgress', () => {
  it('renders all workflow steps', () => {
    renderWithProviders(<WorkflowProgress steps={mockSteps} />);

    expect(screen.getByText('Complete Quest')).toBeTruthy();
    expect(screen.getByText('Watch Course')).toBeTruthy();
    expect(screen.getByText('Buy Item')).toBeTruthy();
  });

  it('displays step numbers or icons', () => {
    renderWithProviders(<WorkflowProgress steps={mockSteps} />);

    const stepIndicators = screen.getAllByTestId(/^step-indicator-/);
    expect(stepIndicators).toHaveLength(3);
  });

  it('highlights current step', () => {
    renderWithProviders(<WorkflowProgress steps={mockSteps} />);

    const currentStep = screen.getByTestId('step-indicator-2');
    expect(currentStep.props.accessibilityState?.selected).toBe(true);
  });

  it('shows completed steps with checkmark', () => {
    renderWithProviders(<WorkflowProgress steps={mockSteps} />);

    const completedStep = screen.getByTestId('step-indicator-1');
    expect(completedStep.props.accessibilityLabel).toContain('Completed');
  });

  it('renders progress bar showing completion percentage', () => {
    renderWithProviders(<WorkflowProgress steps={mockSteps} showProgressBar />);

    const progressBar = screen.getByTestId('workflow-progress-bar');
    expect(progressBar).toBeTruthy();
  });

  it('displays overall completion percentage text', () => {
    renderWithProviders(<WorkflowProgress steps={mockSteps} showPercentage />);

    // 1 completed + 1 current (partial) out of 3 = 33%
    expect(screen.getByText(/33%/)).toBeTruthy();
  });

  it('supports horizontal and vertical layouts', () => {
    const { rerender } = renderWithProviders(
      <WorkflowProgress steps={mockSteps} layout="horizontal" />
    );

    let container = screen.getByTestId('workflow-steps-container');
    expect(container.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ flexDirection: 'row' })])
    );

    rerender(
      <AccessibilityWrapper>
        <WorkflowProgress steps={mockSteps} layout="vertical" />
      </AccessibilityWrapper>
    );
    container = screen.getByTestId('workflow-steps-container');
    expect(container.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ flexDirection: 'column' })])
    );
  });

  it('shows feature icons for each step', () => {
    renderWithProviders(<WorkflowProgress steps={mockSteps} showFeatureIcons />);

    const questStep = screen.getByTestId('step-indicator-1');
    const learningStep = screen.getByTestId('step-indicator-2');
    const marketplaceStep = screen.getByTestId('step-indicator-3');

    expect(questStep).toBeTruthy();
    expect(learningStep).toBeTruthy();
    expect(marketplaceStep).toBeTruthy();
  });

  it('displays connecting lines between steps', () => {
    renderWithProviders(<WorkflowProgress steps={mockSteps} showConnectors />);

    const connectors = screen.getAllByTestId(/^step-connector-/);
    expect(connectors).toHaveLength(2); // n-1 connectors for n steps
  });

  it('supports compact mode with minimal labels', () => {
    renderWithProviders(<WorkflowProgress steps={mockSteps} variant="compact" />);

    const container = screen.getByTestId('workflow-progress-container');
    expect(container).toBeTruthy();
  });

  it('has proper accessibility properties', () => {
    renderWithProviders(<WorkflowProgress steps={mockSteps} />);

    const container = screen.getByTestId('workflow-progress-container');
    expect(container.props.accessibilityRole).toBe('progressbar');
    expect(container.props.accessibilityLabel).toContain('steps completed');
  });

  it('handles empty steps array gracefully', () => {
    renderWithProviders(<WorkflowProgress steps={[]} />);

    expect(screen.getByText(/No workflow steps/i)).toBeTruthy();
  });
});
