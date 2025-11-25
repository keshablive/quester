import React from 'react';
import { render } from '@testing-library/react-native';
import { FeatureDiscoveryCarousel } from '@/components/navigation/feature-discovery-carousel';

describe('FeatureDiscoveryCarousel', () => {
  const mockFeatures = [
    {
      id: '1',
      type: 'quests' as const,
      title: 'Active Quest',
      description: 'Complete your daily challenge',
      icon: 'trophy',
      actionLabel: 'View Quest',
    },
    {
      id: '2',
      type: 'learning' as const,
      title: 'New Course',
      description: 'Learn React Native',
      icon: 'book',
      actionLabel: 'Start Learning',
    },
  ];

  it('renders carousel with feature cards', () => {
    const tree = render(
      <FeatureDiscoveryCarousel features={mockFeatures} onFeaturePress={() => {}} />
    );

    expect(tree.getByText('Active Quest')).toBeTruthy();
    expect(tree.getByText('New Course')).toBeTruthy();
  });

  it('renders empty state when no features provided', () => {
    const tree = render(<FeatureDiscoveryCarousel features={[]} onFeaturePress={() => {}} />);

    expect(tree.getByText('No features to discover')).toBeTruthy();
  });

  it('has proper accessibility props for carousel', () => {
    const tree = render(
      <FeatureDiscoveryCarousel features={mockFeatures} onFeaturePress={() => {}} />
    );

    const carousel = tree.getByTestId('feature-discovery-carousel');
    expect(carousel.props.accessibilityRole).toBe('list');
  });
});
