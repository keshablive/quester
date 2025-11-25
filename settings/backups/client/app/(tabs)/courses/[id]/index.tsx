import React, { useState, useEffect } from 'react';
import { View, ScrollView, Alert, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useCourseWithProgress } from '@/lib/hooks/useCourse';
import { useEnrollInCourse } from '@/lib/api/courses';
import { LessonList, LessonProgressBar } from '@/components/lms/lesson-list';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ScreenWrapper } from '@/components/screen-wrapper';
import QuickActionsMenu from '@/components/navigation/quick-actions-menu';
import SuggestedContent from '@/components/workflow/suggested-content';
import { useWorkflowAnalytics } from '@/lib/utils/workflow-analytics';

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [enrolling, setEnrolling] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const analytics = useWorkflowAnalytics();

  // Fetch course with all related data
  const {
    course,
    isEnrolled,
    enrollment,
    lessons,
    progress,
    nextLesson,
    averageGrade,
    isCertificateEligible,
    isLoading,
    courseError,
  } = useCourseWithProgress({ courseId: id });

  // Enroll mutation
  const enrollMutation = useEnrollInCourse();

  // Track course completion workflow (T082)
  useEffect(() => {
    if (isCertificateEligible && !showQuickActions) {
      setShowQuickActions(true);
      const workflowId = `course_complete_${id}_${Date.now()}`;
      analytics.startWorkflow(workflowId, 'learning', id || 'course-unknown');
    }

    return () => {
      if (isCertificateEligible) {
        analytics.completeWorkflow(`course_complete_${id}`);
      }
    };
  }, [isCertificateEligible, id]);

  const handleEnroll = async () => {
    if (!course) return;

    // If course is paid, show payment dialog
    if (course.price > 0) {
      Alert.alert(
        'Payment Required',
        `This course costs ₹${course.price}. Payment integration will be implemented soon.`,
        [{ text: 'OK' }]
      );
      return;
    }

    setEnrolling(true);
    try {
      await enrollMutation.mutateAsync({
        courseId: id,
      });
      Alert.alert('Success', 'You have been enrolled in this course!');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to enroll');
    } finally {
      setEnrolling(false);
    }
  };

  const handleStartCourse = () => {
    if (nextLesson) {
      router.push(`/courses/${id}/player?lessonId=${nextLesson.id}`);
    }
  };

  const handleViewCertificate = () => {
    router.push(`/courses/${id}/certificate`);
  };

  // Loading state
  if (isLoading) {
    return (
      <ScreenWrapper screenName="CourseDetail">
        <View className="flex-1 items-center justify-center bg-gray-50">
          <Text className="text-gray-600">Loading course...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  // Error state
  if (courseError || !course) {
    return (
      <ScreenWrapper screenName="CourseDetail">
        <View className="flex-1 items-center justify-center bg-gray-50 px-6">
          <Text className="mb-4 text-center text-red-600">Failed to load course</Text>
          <Button onPress={() => router.back()} className="rounded-lg bg-blue-500 px-6 py-3">
            <Text className="font-semibold text-white">Go Back</Text>
          </Button>
        </View>
      </ScreenWrapper>
    );
  }

  const difficultyColors = {
    beginner: 'bg-green-100 text-green-700',
    intermediate: 'bg-yellow-100 text-yellow-700',
    advanced: 'bg-red-100 text-red-700',
  };

  return (
    <ScreenWrapper screenName="CourseDetail">
      <View className="flex-1 bg-gray-50">
        <ScrollView>
          {/* Course Header */}
          <View className="border-b border-gray-200 bg-white p-6">
            <Button variant="ghost" onPress={() => router.back()} className="mb-4">
              <Text className="text-base text-blue-500">← Back</Text>
            </Button>

            <Text className="mb-3 text-3xl font-bold text-gray-900">{course.title}</Text>

            <View className="mb-3 flex-row items-center gap-2">
              <View className={`rounded-full px-3 py-1 ${difficultyColors[course.difficulty]}`}>
                <Text className="text-xs font-semibold">{course.difficulty.toUpperCase()}</Text>
              </View>
              {course.price === 0 ? (
                <View className="rounded-full bg-blue-100 px-3 py-1">
                  <Text className="text-xs font-semibold text-blue-700">FREE</Text>
                </View>
              ) : (
                <View className="rounded-full bg-purple-100 px-3 py-1">
                  <Text className="text-xs font-semibold text-purple-700">₹{course.price}</Text>
                </View>
              )}
            </View>

            <Text className="mb-4 text-base text-gray-700">{course.description}</Text>

            <View className="flex-row items-center gap-4">
              <View className="flex-row items-center">
                <Text className="mr-2 text-2xl">👤</Text>
                <Text className="text-sm text-gray-600">{course.instructorName}</Text>
              </View>
              <View className="flex-row items-center">
                <Text className="mr-2 text-2xl">👥</Text>
                <Text className="text-sm text-gray-600">{course.enrollmentCount} enrolled</Text>
              </View>
            </View>
          </View>

          {/* Enrollment Status / Progress */}
          {isEnrolled ? (
            <>
              {/* Progress Section */}
              <View className="mb-2 bg-white p-6">
                <Text className="mb-4 text-lg font-bold text-gray-900">Your Progress</Text>

                {progress && (
                  <LessonProgressBar
                    completedLessons={progress.completedCount}
                    totalLessons={progress.totalCount}
                  />
                )}

                <View className="mt-4 flex-row justify-between">
                  <View>
                    <Text className="mb-1 text-sm text-gray-600">Average Grade</Text>
                    <Text className="text-2xl font-bold text-blue-600">
                      {averageGrade !== null ? `${averageGrade}%` : 'N/A'}
                    </Text>
                  </View>
                  <View>
                    <Text className="mb-1 text-sm text-gray-600">Status</Text>
                    <Text
                      className={`text-sm font-semibold ${
                        enrollment?.status === 'completed' ? 'text-green-600' : 'text-blue-600'
                      }`}>
                      {enrollment?.status?.toUpperCase() || 'ACTIVE'}
                    </Text>
                  </View>
                </View>

                {isCertificateEligible && (
                  <>
                    <Button
                      onPress={handleViewCertificate}
                      className="mt-4 flex-row items-center justify-center rounded-lg bg-green-500 px-6 py-3">
                      <Text className="mr-2 text-lg">🏆</Text>
                      <Text className="font-bold text-white">View Certificate</Text>
                    </Button>

                    {/* T082: Quick Actions for Course Completion */}
                    {showQuickActions && (
                      <View style={workflowStyles.section}>
                        <View style={workflowStyles.sectionHeader}>
                          <Text className="text-lg font-semibold">What's Next?</Text>
                          <Button variant="ghost" onPress={() => setShowQuickActions(false)}>
                            <Text className="text-sm text-primary">Dismiss</Text>
                          </Button>
                        </View>
                        <QuickActionsMenu
                          currentFeature="learning"
                          onActionPress={(action) => {
                            analytics.trackQuickAction(
                              'learning',
                              action.feature as any,
                              id || 'course-unknown',
                              action.id
                            );
                            // Action-based navigation
                            if (action.id === 'browse-courses')
                              router.push('/(tabs)/courses' as any);
                            else if (action.id === 'my-certificates')
                              router.push('/certificates' as any);
                          }}
                          layout="horizontal"
                          maxActions={3}
                        />
                      </View>
                    )}

                    {/* T082: Suggested Content for Course Completion */}
                    <View style={workflowStyles.section}>
                      <Text className="mb-3 text-lg font-semibold text-foreground">
                        Recommended for You
                      </Text>
                      <SuggestedContent
                        currentFeature="learning"
                        context="course_completed"
                        contextData={{
                          courseId: id,
                          certificateEarned: true,
                        }}
                        onSuggestionPress={(suggestion: any) => {
                          analytics.trackSuggestionClick(
                            'learning',
                            suggestion.targetFeature,
                            id || 'course-unknown',
                            suggestion.targetId,
                            suggestion.type
                          );
                          if (suggestion.route) router.push(suggestion.route);
                        }}
                        layout="list"
                        maxSuggestions={3}
                      />
                    </View>
                  </>
                )}

                {nextLesson && !isCertificateEligible && (
                  <Button
                    onPress={handleStartCourse}
                    className="mt-4 rounded-lg bg-blue-500 px-6 py-3">
                    <Text className="text-center font-bold text-white">
                      {progress?.completedCount === 0 ? 'Start Course' : 'Continue Learning'}
                    </Text>
                  </Button>
                )}
              </View>

              {/* Lessons List */}
              <View className="bg-white p-6">
                <Text className="mb-4 text-lg font-bold text-gray-900">Course Content</Text>
                {lessons && lessons.length > 0 && (
                  <LessonList
                    lessons={lessons.map((lesson, index) => ({
                      id: index + 1, // Use array index as numeric ID
                      title: lesson.title,
                      contentType: lesson.contentType,
                      orderIndex: lesson.orderIndex,
                      xpReward: lesson.xpReward,
                      isLocked: lesson.isLocked,
                      isCompleted: lesson.isCompleted,
                      grade: lesson.grade,
                    }))}
                    onLessonPress={(numericId) => {
                      // Map numeric ID back to actual lesson
                      const actualLesson = lessons[numericId - 1];
                      if (actualLesson) {
                        router.push(`/courses/${id}/player?lessonId=${actualLesson.id}`);
                      }
                    }}
                  />
                )}
              </View>
            </>
          ) : (
            <>
              {/* Course Info for Non-Enrolled */}
              <View className="mb-2 bg-white p-6">
                <Text className="mb-4 text-lg font-bold text-gray-900">What You'll Learn</Text>
                <View className="gap-3">
                  <InfoItem icon="📚" text={`${lessons?.length || 0} comprehensive lessons`} />
                  <InfoItem icon="⭐" text="Earn XP for completing lessons" />
                  <InfoItem icon="🏆" text="Get certificate upon completion" />
                  <InfoItem icon="📱" text="Learn at your own pace" />
                </View>
              </View>

              {/* Enroll Button */}
              <View className="p-6">
                <Button
                  onPress={handleEnroll}
                  disabled={enrolling}
                  className={`rounded-lg px-6 py-4 ${enrolling ? 'bg-gray-400' : 'bg-blue-500'}`}>
                  <Text className="text-center text-lg font-bold text-white">
                    {enrolling
                      ? 'Enrolling...'
                      : course.price === 0
                        ? 'Enroll for Free'
                        : `Enroll for ₹${course.price}`}
                  </Text>
                </Button>
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </ScreenWrapper>
  );
}

function InfoItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View className="flex-row items-center">
      <Text className="mr-3 text-2xl">{icon}</Text>
      <Text className="flex-1 text-base text-gray-700">{text}</Text>
    </View>
  );
}

const workflowStyles = StyleSheet.create({
  section: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#2d3748',
    borderRadius: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
});
