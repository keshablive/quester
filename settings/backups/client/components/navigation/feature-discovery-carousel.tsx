import React from 'react';
import { View, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { FeatureCard, FeatureCardData } from './feature-card';

type FeatureDiscoveryCarouselProps = {
  features: FeatureCardData[];
  onFeaturePress: (feature: FeatureCardData) => void;
};

/**
 * FeatureDiscoveryCarousel Component - Optimized with React.memo (Phase 7, T111)
 *
 * Prevents unnecessary re-renders when parent components update.
 * Only re-renders when features array or onFeaturePress handler changes.
 */
export const FeatureDiscoveryCarousel = React.memo(function FeatureDiscoveryCarousel({
  features,
  onFeaturePress,
}: FeatureDiscoveryCarouselProps) {
  if (features.length === 0) {
    return (
      <View className="flex-1 items-center justify-center py-8">
        <Text variant="small" className="text-gray-400">
          No features to discover
        </Text>
      </View>
    );
  }

  return (
    <View className="py-4">
      <Text variant="h2" className="mb-3 px-4 text-white">
        Discover Features
      </Text>
      <ScrollView
        testID="feature-discovery-carousel"
        accessibilityRole="list"
        accessibilityLabel="Feature discovery carousel"
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
        {features.map((feature) => (
          <FeatureCard key={feature.id} feature={feature} onPress={onFeaturePress} />
        ))}
      </ScrollView>
    </View>
  );
});
