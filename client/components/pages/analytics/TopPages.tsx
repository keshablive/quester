import * as React from 'react';
import { View, Pressable } from 'react-native';
import { Text, Card, Icon, Skeleton } from '@/components/ui';
import { TrendingUp, BookOpen, RefreshCw, Star } from 'lucide-react-native';
import { useTopCourses } from '@/core/hooks/queries';
import { formatCompactNumber } from '@/core/utils/format';

/**
 * TopPages - Display top performing courses
 *
 * US2: View Top Performing Content
 * FR-003: Fetch top courses from API
 * FR-004: Display top courses with enrollment counts and completion rates
 * FR-007: Show loading skeletons during data fetch
 * FR-010: Format large numbers for readability
 */
export function TopPages() {
  const { data: courses, isLoading, error, refetch } = useTopCourses(5); // Top 5 courses

  // Loading skeleton state (FR-007)
  if (isLoading) {
    return (
      <View>
        <Text className="mb-3 text-lg font-semibold">Top Performing Courses</Text>
        <Card>
          {[1, 2, 3, 4].map((i) => (
            <View
              key={i}
              className={`flex-row items-center justify-between p-4 ${
                i < 4 ? 'border-b border-border' : ''
              }`}>
              <View className="flex-1">
                <Skeleton className="mb-1 h-5 w-40 rounded" />
                <Skeleton className="h-4 w-24 rounded" />
              </View>
              <Skeleton className="h-4 w-16 rounded" />
            </View>
          ))}
        </Card>
      </View>
    );
  }

  // Error state with retry
  if (error) {
    return (
      <View>
        <Text className="mb-3 text-lg font-semibold">Top Performing Courses</Text>
        <Card className="p-6">
          <View className="items-center">
            <Text className="mb-4 text-center text-destructive">Failed to load top courses</Text>
            <Pressable
              className="flex-row items-center gap-2 rounded-lg bg-primary px-4 py-2"
              onPress={() => refetch()}>
              <Icon as={RefreshCw} size={16} className="text-primary-foreground" />
              <Text className="font-semibold text-primary-foreground">Retry</Text>
            </Pressable>
          </View>
        </Card>
      </View>
    );
  }

  // Empty state when no courses exist
  if (!courses || courses.length === 0) {
    return (
      <View>
        <Text className="mb-3 text-lg font-semibold">Top Performing Courses</Text>
        <Card className="p-6">
          <View className="items-center">
            <Icon as={BookOpen} size={32} className="mb-2 text-muted-foreground" />
            <Text className="text-center text-muted-foreground">No courses available</Text>
            <Text className="mt-1 text-center text-sm text-muted-foreground">
              Courses will appear here once published
            </Text>
          </View>
        </Card>
      </View>
    );
  }

  return (
    <View>
      <Text className="mb-3 text-lg font-semibold">Top Performing Courses</Text>
      <Card>
        {courses.map((course, index) => (
          <View
            key={course.id}
            className={`flex-row items-center justify-between p-4 ${
              index < courses.length - 1 ? 'border-b border-border' : ''
            }`}>
            <View className="flex-1">
              <Text className="font-medium" numberOfLines={1}>
                {course.title}
              </Text>
              <View className="flex-row items-center gap-2">
                <Text className="text-sm text-muted-foreground">
                  {formatCompactNumber(course.enrollmentCount)} enrolled
                </Text>
                <Text className="text-sm text-muted-foreground">•</Text>
                <Text className="text-sm text-muted-foreground">
                  {course.completionRate.toFixed(0)}% completed
                </Text>
              </View>
            </View>
            <View className="flex-row items-center gap-1">
              <Icon as={Star} size={14} className="text-yellow-500" />
              <Text className="text-sm font-medium">{course.averageRating.toFixed(1)}</Text>
            </View>
          </View>
        ))}
      </Card>
    </View>
  );
}
