import React from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { FeatureType } from '@/lib/hooks/use-navigation';

export type FeatureCardData = {
  id: string;
  type: FeatureType;
  title: string;
  description: string;
  icon: string;
  actionLabel: string;
  metadata?: {
    count?: number;
    status?: string;
    progress?: number;
  };
};

type FeatureCardProps = {
  feature: FeatureCardData;
  onPress: (feature: FeatureCardData) => void;
};

/**
 * FeatureCard Component - Optimized with React.memo (Phase 7, T112)
 *
 * Prevents unnecessary re-renders in feature discovery carousel.
 * Only re-renders when feature data or onPress handler changes.
 */
export const FeatureCard = React.memo(({ feature, onPress }: FeatureCardProps) => {
  return (
    <Pressable
      testID="feature-card"
      accessibilityRole="button"
      accessibilityLabel={`${feature.title}. ${feature.description}. ${feature.actionLabel}`}
      accessibilityHint="Double tap to view details"
      className="mx-2 w-[280px] rounded-xl bg-white p-4 shadow-md active:scale-[0.98] active:opacity-80"
      onPress={() => onPress(feature)}>
      <View className="mb-3 flex-row">
        <View className="mr-3 h-12 w-12 items-center justify-center rounded-full bg-gray-100">
          <Text className="text-2xl">{getIconEmoji(feature.icon)}</Text>
        </View>

        <View className="flex-1">
          <Text variant="h4" className="mb-1 text-gray-900">
            {feature.title}
          </Text>
          <Text variant="small" className="leading-5 text-gray-600" numberOfLines={2}>
            {feature.description}
          </Text>
        </View>
      </View>

      <View className="border-t border-gray-200 pt-3">
        <Text variant="small" className="font-medium text-blue-500">
          {feature.actionLabel}
        </Text>
      </View>
    </Pressable>
  );
});

function getIconEmoji(icon: string): string {
  const iconMap: Record<string, string> = {
    trophy: '🏆',
    book: '📚',
    cart: '🛒',
    heart: '❤️',
    message: '💬',
    video: '🎥',
    property: '🏠',
    certificate: '📜',
  };
  return iconMap[icon] || '⭐';
}
