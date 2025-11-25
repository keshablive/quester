import React, { memo } from 'react';
import { View, Pressable, Image } from 'react-native';
import { Text } from '@/components/ui/text';
import { router } from 'expo-router';

interface CourseCardProps {
  id: string | number;
  onPress?: () => void;
  title: string;
  description?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  price: number;
  thumbnailUrl?: string;
  instructorName: string;
  enrollmentCount?: number;
  published: boolean;
}

const difficultyLabels = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

/**
 * CourseCard Component - Optimized with React.memo (Phase 5, T115)
 *
 * Memoized to prevent unnecessary re-renders when parent re-renders.
 * Only re-renders when course data or callbacks change.
 */
export const CourseCard = memo(function CourseCard({
  id,
  onPress,
  title,
  description,
  difficulty,
  price,
  thumbnailUrl,
  instructorName,
  enrollmentCount,
  published,
}: CourseCardProps) {
  const handlePress = () => {
    if (typeof onPress === 'function') {
      onPress();
      return;
    }
    router.push(`/courses/${String(id)}`);
  };

  return (
    <Pressable
      onPress={handlePress}
      className="mb-4 overflow-hidden rounded-lg bg-white shadow-md active:opacity-80">
      {/* Thumbnail */}
      {thumbnailUrl ? (
        <Image source={{ uri: thumbnailUrl }} className="h-48 w-full" resizeMode="cover" />
      ) : (
        <View className="h-48 w-full items-center justify-center bg-gray-200">
          <Text className="text-4xl text-gray-400">📚</Text>
        </View>
      )}

      {/* Content */}
      <View className="p-4">
        {/* Title */}
        <Text className="mb-2 text-xl font-bold text-gray-900" numberOfLines={2}>
          {title}
        </Text>

        {/* Description */}
        {description && (
          <Text className="mb-3 text-sm text-gray-600" numberOfLines={3}>
            {description}
          </Text>
        )}

        {/* Metadata Row */}
        <View className="mb-3 flex-row items-center justify-between">
          {/* Difficulty Badge */}
          <View
            className={`rounded-full px-3 py-1 ${
              difficulty === 'beginner'
                ? 'bg-green-100'
                : difficulty === 'intermediate'
                  ? 'bg-yellow-100'
                  : 'bg-red-100'
            }`}>
            <Text
              className={`text-xs font-semibold ${
                difficulty === 'beginner'
                  ? 'text-green-800'
                  : difficulty === 'intermediate'
                    ? 'text-yellow-800'
                    : 'text-red-800'
              }`}>
              {difficultyLabels[difficulty]}
            </Text>
          </View>

          {/* Price */}
          <Text className="text-lg font-bold text-blue-600">
            {price === 0 ? 'Free' : `₹${price.toFixed(2)}`}
          </Text>
        </View>

        {/* Instructor and Stats */}
        <View className="flex-row items-center justify-between border-t border-gray-200 pt-3">
          <View className="flex-row items-center">
            <View className="mr-2 h-8 w-8 items-center justify-center rounded-full bg-blue-100">
              <Text className="text-sm font-semibold text-blue-600">
                {instructorName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text className="text-sm text-gray-700">{instructorName}</Text>
          </View>

          {/* Enrollment Count */}
          {enrollmentCount !== undefined && (
            <View className="flex-row items-center">
              <Text className="text-xs text-gray-500">👥 {enrollmentCount}</Text>
            </View>
          )}
        </View>

        {/* Published Status (for instructors) */}
        {!published && (
          <View className="mt-2 rounded border border-yellow-200 bg-yellow-50 px-2 py-1">
            <Text className="text-center text-xs text-yellow-800">📝 Draft - Not Published</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
});

// Skeleton loader for loading state
export function CourseCardSkeleton() {
  return (
    <View className="mb-4 overflow-hidden rounded-lg bg-white shadow-md">
      {/* Thumbnail Skeleton */}
      <View className="h-48 w-full animate-pulse bg-gray-200" />

      {/* Content Skeleton */}
      <View className="p-4">
        {/* Title Skeleton */}
        <View className="mb-2 h-6 animate-pulse rounded bg-gray-200" />
        <View className="mb-3 h-6 w-3/4 animate-pulse rounded bg-gray-200" />

        {/* Description Skeleton */}
        <View className="mb-2 h-4 animate-pulse rounded bg-gray-200" />
        <View className="mb-2 h-4 animate-pulse rounded bg-gray-200" />
        <View className="mb-3 h-4 w-2/3 animate-pulse rounded bg-gray-200" />

        {/* Metadata Row Skeleton */}
        <View className="mb-3 flex-row items-center justify-between">
          <View className="h-6 w-20 animate-pulse rounded-full bg-gray-200" />
          <View className="h-6 w-16 animate-pulse rounded bg-gray-200" />
        </View>

        {/* Instructor Skeleton */}
        <View className="flex-row items-center justify-between border-t border-gray-200 pt-3">
          <View className="flex-row items-center">
            <View className="mr-2 h-8 w-8 animate-pulse rounded-full bg-gray-200" />
            <View className="h-4 w-24 animate-pulse rounded bg-gray-200" />
          </View>
          <View className="h-4 w-12 animate-pulse rounded bg-gray-200" />
        </View>
      </View>
    </View>
  );
}

// Grid layout wrapper for course cards
export function CourseGrid({ children }: { children: React.ReactNode }) {
  return <View className="px-4 py-2">{children}</View>;
}
