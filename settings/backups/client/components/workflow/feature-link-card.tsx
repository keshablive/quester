import React from 'react';
import { View, Pressable, Image } from 'react-native';
import { Text } from '@/components/ui/text';
import { Trophy, BookOpen, ShoppingBag, Users, CheckCircle, Lock } from 'lucide-react-native';
import { useAccessibility, useScaledSize } from '@/lib/hooks/use-accessibility';

interface FeatureLinkCardProps {
  title: string;
  description: string;
  sourceFeature: 'quests' | 'learning' | 'marketplace' | 'social' | 'certificates';
  targetId: string;
  onPress: (targetId: string) => void;
  metadata?: {
    xp?: number;
    points?: number;
    price?: number;
    difficulty?: 'easy' | 'medium' | 'hard';
  };
  thumbnailUrl?: string;
  status?: 'available' | 'locked' | 'completed' | 'in-progress';
  progress?: number;
  variant?: 'default' | 'compact';
  tags?: string[];
}

const FEATURE_ICONS = {
  quests: Trophy,
  learning: BookOpen,
  marketplace: ShoppingBag,
  social: Users,
  certificates: CheckCircle,
};

const FEATURE_COLORS = {
  quests: '#f59e0b',
  learning: '#3b82f6',
  marketplace: '#10b981',
  social: '#8b5cf6',
  certificates: '#ec4899',
};

export default function FeatureLinkCard({
  title,
  description,
  sourceFeature,
  targetId,
  onPress,
  metadata,
  thumbnailUrl,
  status = 'available',
  progress,
  variant = 'default',
  tags = [],
}: FeatureLinkCardProps) {
  // Accessibility hooks
  const minTouchTarget = useScaledSize(44);
  const { announceForAccessibility } = useAccessibility();

  const IconComponent = FEATURE_ICONS[sourceFeature];
  const featureColor = FEATURE_COLORS[sourceFeature];
  const isLocked = status === 'locked';
  const isCompleted = status === 'completed';

  return (
    <Pressable
      className={`overflow-hidden rounded-xl border border-gray-600 bg-gray-700 ${
        variant === 'compact' ? 'flex-row items-center' : ''
      } active:border-blue-500 active:bg-gray-600 ${isLocked ? 'opacity-60' : ''}`}
      style={{ minHeight: minTouchTarget }}
      onPress={() => {
        if (!isLocked) {
          onPress(targetId);
          announceForAccessibility(`Opening ${title}`);
        }
      }}
      disabled={isLocked}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${sourceFeature}`}
      accessibilityHint={description}
      accessibilityState={{
        disabled: isLocked,
        selected: isCompleted,
      }}
      testID="feature-link-card">
      {/* Thumbnail */}
      {thumbnailUrl && variant === 'default' && (
        <Image
          source={{ uri: thumbnailUrl }}
          className="h-[120px] w-full bg-gray-900"
          testID="feature-link-thumbnail"
        />
      )}

      {/* Content */}
      <View className="p-4">
        {/* Header */}
        <View className="mb-2 flex-row items-center gap-2">
          <View
            className="h-7 w-7 items-center justify-center rounded-md"
            style={{ backgroundColor: featureColor }}>
            <IconComponent size={16} color="#ffffff" />
          </View>
          <View className="rounded-md px-2 py-1" style={{ backgroundColor: featureColor + '20' }}>
            <Text className="text-[11px] font-semibold capitalize" style={{ color: featureColor }}>
              {sourceFeature}
            </Text>
          </View>
          {isCompleted && (
            <View className="ml-auto flex-row items-center gap-1">
              <CheckCircle size={14} color="#10b981" />
              <Text className="text-[11px] font-medium text-green-500">Completed</Text>
            </View>
          )}
          {isLocked && (
            <View className="ml-auto flex-row items-center gap-1">
              <Lock size={14} color="#718096" />
            </View>
          )}
        </View>

        {/* Title & Description */}
        <Text
          variant="h4"
          className="mb-1.5 text-white"
          numberOfLines={variant === 'compact' ? 1 : 2}>
          {title}
        </Text>
        {variant === 'default' && (
          <Text variant="small" className="mb-3 text-gray-400" numberOfLines={2}>
            {description}
          </Text>
        )}

        {/* Metadata */}
        {metadata && (
          <View className="mt-2 flex-row items-center gap-4">
            {metadata.xp !== undefined && (
              <View className="flex-row items-baseline gap-1">
                <Text variant="small" className="font-semibold text-blue-400">
                  {metadata.xp}
                </Text>
                <Text variant="small" className="text-gray-500">
                  XP
                </Text>
              </View>
            )}
            {metadata.points !== undefined && (
              <View className="flex-row items-baseline gap-1">
                <Text variant="small" className="font-semibold text-blue-400">
                  {metadata.points}
                </Text>
                <Text variant="small" className="text-gray-500">
                  Points
                </Text>
              </View>
            )}
            {metadata.price !== undefined && (
              <View className="flex-row items-baseline gap-1">
                <Text variant="small" className="font-semibold text-blue-400">
                  ${metadata.price}
                </Text>
              </View>
            )}
            {metadata.difficulty && (
              <View className="ml-auto rounded-md bg-gray-600 px-2 py-1">
                <Text className="text-[11px] font-medium capitalize text-white">
                  {metadata.difficulty}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Progress Bar */}
        {progress !== undefined && progress > 0 && (
          <View className="mt-3 flex-row items-center gap-2" testID="progress-bar">
            <View className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-600">
              <View className="h-full bg-blue-400" style={{ width: `${progress}%` }} />
            </View>
            <Text variant="small" className="font-medium text-gray-400">
              {progress}%
            </Text>
          </View>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <View className="mt-3 flex-row flex-wrap gap-1.5">
            {tags.slice(0, 3).map((tag, index) => (
              <View key={index} className="rounded-md border border-gray-600 bg-gray-900 px-2 py-1">
                <Text className="text-[11px] text-gray-400">{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </Pressable>
  );
}
