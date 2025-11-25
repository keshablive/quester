import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FeatureCard } from '@/components/navigation/feature-card';

describe('FeatureCard', () => {
  const mockFeature = {
    id: '1',
    type: 'quests' as const,
    title: 'Active Quest',
    description: 'Complete your daily challenge',
    icon: 'trophy',
    actionLabel: 'View Quest',
  };

  it('renders feature card with title and description', () => {
    const tree = render(<FeatureCard feature={mockFeature} onPress={() => {}} />);

    expect(tree.getByText('Active Quest')).toBeTruthy();
    expect(tree.getByText('Complete your daily challenge')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const tree = render(<FeatureCard feature={mockFeature} onPress={onPress} />);

    const card = tree.getByTestId('feature-card');
    fireEvent.press(card);

    expect(onPress).toHaveBeenCalledWith(mockFeature);
  });

  it('renders action button with correct label', () => {
    const tree = render(<FeatureCard feature={mockFeature} onPress={() => {}} />);

    expect(tree.getByText('View Quest')).toBeTruthy();
  });

  it('has proper accessibility props', () => {
    const tree = render(<FeatureCard feature={mockFeature} onPress={() => {}} />);

    const card = tree.getByTestId('feature-card');
    expect(card.props.accessibilityRole).toBe('button');
    expect(card.props.accessibilityLabel).toContain('Active Quest');
  });
});
