import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, FlatList, ActivityIndicator, RefreshControl, Pressable } from 'react-native';
import { Text } from '@/components/ui';
import { BookOpen } from 'lucide-react-native';
import { useCourses } from '@/core/hooks/queries';
import { useEnrollCourse } from '@/core/hooks/mutations';
import { MutationErrorToast } from '@/components/shared';
import { CourseCard } from './CourseCard';
import { CourseListProps } from './course.types';
import { useRouter } from 'expo-router';

/**
 * CourseList Component
 *
 * Displays courses with infinite scroll using TanStack Query.
 * US5: Paginated Data with Infinite Scroll
 * US2: Optimistic enrollment updates
 */
export function CourseList({ onCoursePress }: CourseListProps) {
  const router = useRouter();
  const [enrollError, setEnrollError] = useState<string | null>(null);

  // TanStack Query infinite query for courses
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching,
  } = useCourses();

  // Enrollment mutation with optimistic updates
  const enrollMutation = useEnrollCourse();

  // Watch for enrollment errors
  useEffect(() => {
    if (enrollMutation.error) {
      setEnrollError(enrollMutation.error.message || 'Failed to enroll in course');
    }
  }, [enrollMutation.error]);

  // Flatten pages into single array
  const courses = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.items ?? []);
  }, [data?.pages]);

  const handleEnroll = useCallback(
    (courseId: string) => {
      setEnrollError(null);
      enrollMutation.mutate(courseId);
    },
    [enrollMutation]
  );

  const handleCoursePress = useCallback(
    (id: string) => {
      if (onCoursePress) {
        onCoursePress(id);
      } else {
        // Note: Dynamic routes need to be typed in expo-router config
        router.push(`/learning` as const);
      }
    },
    [onCoursePress, router]
  );

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderEmpty = () => (
    <View className="flex-1 items-center justify-center py-12">
      <BookOpen size={64} className="mb-4 text-muted-foreground/30" />
      <Text className="mb-2 text-lg font-semibold text-foreground">No courses available</Text>
      <Text className="text-sm text-muted-foreground">Check back later for new courses</Text>
    </View>
  );

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    return (
      <View className="items-center py-4">
        <ActivityIndicator size="small" className="text-primary" />
      </View>
    );
  };

  // Initial loading state
  if (isLoading && courses.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" className="text-primary" />
        <Text className="mt-3 text-base text-muted-foreground">Loading courses...</Text>
      </View>
    );
  }

  // Error state
  if (error && courses.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-6">
        <Text className="mb-4 text-center text-base text-destructive">
          {error.message || 'Failed to load courses'}
        </Text>
        <Pressable className="rounded-lg bg-primary px-6 py-3" onPress={() => refetch()}>
          <Text className="text-base font-semibold text-primary-foreground">Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <>
      <FlatList
        data={courses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CourseCard
            course={{
              id: item.id,
              title: item.title,
              description: item.description,
              instructor: item.instructorId, // Will need to fetch instructor name later
              duration: item.duration,
              level: item.difficulty,
              thumbnail: item.thumbnailUrl,
              enrolled: false, // Will integrate with enrollment status later
              progress: undefined,
            }}
            onPress={handleCoursePress}
            onEnroll={handleEnroll}
          />
        )}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        contentContainerClassName="p-4"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && !isFetchingNextPage}
            onRefresh={() => refetch()}
          />
        }
      />
      <MutationErrorToast
        message={enrollError ?? ''}
        visible={!!enrollError}
        onDismiss={() => setEnrollError(null)}
      />
    </>
  );
}
