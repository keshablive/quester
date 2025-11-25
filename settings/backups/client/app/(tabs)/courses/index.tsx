/**
 * Courses Screen - P1 Screen Migration (Phase 4)
 *
 * React Native Reusables compliance:
 * - FR-001: Button with Text wrapping pattern
 * - FR-006 to FR-010: Accessibility props (roles, labels, hints, state)
 * - FR-016: ScrollView/FlatList optimization (removeClippedSubviews)
 * - FR-025: Performance monitoring (useScreenPerformanceMetrics)
 * - FR-028 to FR-030: Error boundary via ScreenWrapper
 *
 * WCAG 2.1 Level AA compliance:
 * - 4.1.2 Name, Role, Value: All interactive elements have roles
 * - 3.3.2 Labels or Instructions: All form inputs have labels
 * - 2.4.6 Headings and Labels: Section headers properly labeled
 */

import React, { useState, useCallback, useMemo } from 'react';
import { View, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { ScreenWrapper } from '@/components/screen-wrapper';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Icon } from '@/components/ui/icon';
import { X } from 'lucide-react-native';
import { useScreenPerformanceMetrics } from '@/lib/hooks/use-performance-metrics';
import { useEnhancedPerformanceMonitor } from '@/lib/hooks/use-performance-monitor';
import { useCourses } from '@/lib/api/courses';
import { CourseCard, CourseGrid } from '@/components/lms/course-card';
import SuggestedContent from '@/components/workflow/suggested-content';
import { GamificationHeader } from '@/components/gamification/gamification-header';

type DifficultyFilter = 'all' | 'beginner' | 'intermediate' | 'advanced';

export default function CoursesScreen() {
  // Performance monitoring (FR-025, T124-T130)
  useScreenPerformanceMetrics('CoursesScreen');
  const { metrics: _fpsMetrics } = useEnhancedPerformanceMonitor('CoursesScreen');

  const [search, setSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>('all');
  const [showFreeOnly, setShowFreeOnly] = useState(false);

  // Fetch courses with filters
  const {
    data: courses,
    isLoading,
    error,
    refetch,
  } = useCourses({
    published: true,
    difficulty: difficultyFilter === 'all' ? undefined : difficultyFilter,
    search: search || undefined,
    limit: 50,
  });

  // Filter courses by price (client-side since API doesn't support price filter)
  // Use useMemo to avoid recomputing on every render
  const filteredCourses = useMemo(
    () => courses?.filter((course) => !showFreeOnly || course.price === 0) || [],
    [courses, showFreeOnly]
  );

  const handleCoursePress = useCallback((courseId: string) => {
    router.push(`/courses/${courseId}`);
  }, []);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  return (
    <ScreenWrapper screenName="CoursesScreen">
      <View className="flex-1 bg-background">
        {/* Gamification Header */}
        <View style={suggestedStyles.gamificationHeaderContainer}>
          <GamificationHeader compact />
        </View>

        {/* Header */}
        <View
          className="border-b border-border bg-card px-6 pb-4 pt-12"
          accessibilityRole="header"
          accessibilityLabel="Explore Courses - Discover new skills and earn certificates">
          <Text variant="h1" className="mb-2">
            Explore Courses
          </Text>
          <Text variant="muted">Discover new skills and earn certificates</Text>
        </View>

        <ScrollView
          className="flex-1"
          removeClippedSubviews
          accessibilityRole="scrollbar"
          accessibilityLabel="Course listing content">
          {/* Search Bar */}
          <View className="border-b border-border bg-card p-6">
            <Label htmlFor="course-search" nativeID="course-search-label">
              Search courses
            </Label>
            <View className="flex-row items-center gap-2">
              <Input
                id="course-search"
                placeholder="Search courses..."
                value={search}
                onChangeText={setSearch}
                className="flex-1"
                accessibilityLabel="Search courses"
                accessibilityHint="Enter course name or keyword to filter"
                aria-labelledby="course-search-label"
              />
              {search.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onPress={() => setSearch('')}
                  accessibilityRole="button"
                  accessibilityLabel="Clear search">
                  <Icon as={X} size={20} />
                </Button>
              )}
            </View>
          </View>

          {/* Filters */}
          <View className="border-b border-border bg-card px-6 py-4">
            {/* Difficulty Filter */}
            <Label nativeID="difficulty-filter-label">Difficulty Level</Label>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-4 mt-3"
              accessibilityRole="radiogroup"
              accessibilityLabel="Filter courses by difficulty level"
              aria-labelledby="difficulty-filter-label">
              <View className="flex-row gap-2">
                <Button
                  variant={difficultyFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onPress={() => setDifficultyFilter('all')}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: difficultyFilter === 'all' }}
                  accessibilityLabel="All difficulty levels">
                  <Text>All</Text>
                </Button>
                <Button
                  variant={difficultyFilter === 'beginner' ? 'default' : 'outline'}
                  size="sm"
                  onPress={() => setDifficultyFilter('beginner')}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: difficultyFilter === 'beginner' }}
                  accessibilityLabel="Beginner level courses">
                  <Text>Beginner</Text>
                </Button>
                <Button
                  variant={difficultyFilter === 'intermediate' ? 'default' : 'outline'}
                  size="sm"
                  onPress={() => setDifficultyFilter('intermediate')}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: difficultyFilter === 'intermediate' }}
                  accessibilityLabel="Intermediate level courses">
                  <Text>Intermediate</Text>
                </Button>
                <Button
                  variant={difficultyFilter === 'advanced' ? 'default' : 'outline'}
                  size="sm"
                  onPress={() => setDifficultyFilter('advanced')}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: difficultyFilter === 'advanced' }}
                  accessibilityLabel="Advanced level courses">
                  <Text>Advanced</Text>
                </Button>
              </View>
            </ScrollView>

            {/* Price Filter */}
            <View className="flex-row items-center gap-3 py-2">
              <Checkbox
                checked={showFreeOnly}
                onCheckedChange={(checked) => setShowFreeOnly(checked === true)}
                accessibilityLabel="Show free courses only"
                aria-describedby="free-courses-label"
              />
              <Label htmlFor="free-courses-checkbox" nativeID="free-courses-label">
                Show free courses only
              </Label>
            </View>
          </View>

          {/* Course List */}
          <View className="p-6">
            {/* Loading State */}
            {isLoading && (
              <View
                className="py-12"
                accessibilityRole="progressbar"
                accessibilityLabel="Loading courses"
                accessibilityLiveRegion="polite">
                <ActivityIndicator size="large" />
                <Text variant="muted" className="mt-2 text-center">
                  Loading courses...
                </Text>
              </View>
            )}

            {/* Error State */}
            {error && (
              <View className="items-center px-6 py-12">
                <Text className="mb-4 text-center text-destructive">Failed to load courses</Text>
                <Button
                  onPress={handleRefresh}
                  variant="default"
                  accessibilityRole="button"
                  accessibilityLabel="Try again"
                  accessibilityHint="Retry loading courses">
                  <Text>Try Again</Text>
                </Button>
              </View>
            )}

            {/* Empty State */}
            {!isLoading && !error && filteredCourses.length === 0 && (
              <View
                className="py-12"
                accessibilityRole="text"
                accessibilityLabel="No courses found. Try adjusting your search or filters">
                <Text className="mb-4 text-center text-6xl" accessibilityLabel="Books icon">
                  📚
                </Text>
                <Text variant="h3" className="mb-2 text-center">
                  No courses found
                </Text>
                <Text variant="muted" className="text-center">
                  {search
                    ? 'Try adjusting your search or filters'
                    : 'Check back later for new courses'}
                </Text>
              </View>
            )}

            {/* Courses Grid */}
            {!isLoading && !error && filteredCourses.length > 0 && (
              <>
                <Text variant="h2" className="mb-4">
                  {filteredCourses.length} {filteredCourses.length === 1 ? 'Course' : 'Courses'}{' '}
                  Available
                </Text>
                <CourseGrid>
                  {filteredCourses.map((course) => (
                    <CourseCard
                      key={course.id}
                      id={course.id}
                      title={course.title}
                      description={course.description}
                      difficulty={course.difficulty}
                      price={course.price}
                      thumbnailUrl={course.thumbnailUrl}
                      instructorName={course.instructorName}
                      enrollmentCount={course.enrollmentCount}
                      published={course.published}
                      onPress={() => handleCoursePress(course.id)}
                    />
                  ))}
                </CourseGrid>
              </>
            )}

            {/* T085.1: Suggested Content for Course Browsing */}
            {!isLoading && !error && filteredCourses.length > 0 && (
              <View style={suggestedStyles.section}>
                <Text className="mb-3 text-lg font-semibold text-foreground">
                  You Might Also Like
                </Text>
                <SuggestedContent
                  currentFeature="learning"
                  context="browsing"
                  contextData={{
                    currentSearch: search,
                    difficulty: difficultyFilter,
                    freeOnly: showFreeOnly,
                  }}
                  onSuggestionPress={(suggestion: any) => {
                    if (suggestion.route) router.push(suggestion.route);
                  }}
                  layout="grid"
                  maxSuggestions={4}
                />
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </ScreenWrapper>
  );
}

const suggestedStyles = StyleSheet.create({
  gamificationHeaderContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: '#fff',
  },
  section: {
    marginTop: 24,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#2d3748',
    borderRadius: 8,
  },
});
