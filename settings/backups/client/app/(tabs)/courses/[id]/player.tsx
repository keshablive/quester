import React, { useState } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useLesson, useCompleteLesson } from '@/lib/api/lessons';
import { useCourseLessonsWithProgress } from '@/lib/hooks/useCourse';
import { CoursePlayer } from '@/components/lms/course-player';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ScreenWrapper } from '@/components/screen-wrapper';
import { useGamificationFeedback } from '@/lib/hooks/use-gamification-feedback';
import { XPGainAnimation } from '@/components/gamification/xp-gain-animation';
import LevelUpModal from '@/components/gamification/level-up-modal';

export default function CoursePlayerScreen() {
  const { id, lessonId } = useLocalSearchParams<{ id: string; lessonId: string }>();
  const [completing, setCompleting] = useState(false);

  // Gamification feedback hook
  const {
    awardXP,
    dismissXPAnimation,
    dismissLevelUpModal,
    activeXPAnimation,
    showLevelUpModal,
    levelUpInfo,
  } = useGamificationFeedback();

  // Fetch current lesson
  const { data: lesson, isLoading: lessonLoading } = useLesson(lessonId);

  // Fetch all course lessons for navigation
  const { lessons } = useCourseLessonsWithProgress(id);

  // Complete lesson mutation
  const completeMutation = useCompleteLesson();

  // Find next lesson after current one
  const currentLessonIndex = lessons.findIndex((l) => l.id === lessonId);
  const hasNextLesson = currentLessonIndex >= 0 && currentLessonIndex < lessons.length - 1;
  const nextLessonInSequence = hasNextLesson ? lessons[currentLessonIndex + 1] : null;

  const handleComplete = async (grade?: number) => {
    if (!lesson || completing) return;

    setCompleting(true);
    try {
      const result = await completeMutation.mutateAsync({
        lessonId: lesson.id,
        grade,
        timeSpent: 0, // TODO: Track actual time spent
      });

      // Award XP with gamification feedback
      awardXP(result.xpAwarded || 150, 'course_completion');

      // Show success message
      let message = `Lesson completed! +${result.xpAwarded} XP`;
      if (result.certificateIssued) {
        message += '\n\n🏆 Congratulations! You earned a certificate!';
      }

      Alert.alert('Success', message, [
        {
          text: 'Continue',
          onPress: () => {
            // Navigate to next lesson or back to course
            if (nextLessonInSequence && !nextLessonInSequence.isLocked) {
              router.replace(`/courses/${id}/player?lessonId=${nextLessonInSequence.id}`);
            } else {
              router.back();
            }
          },
        },
      ]);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to complete lesson');
    } finally {
      setCompleting(false);
    }
  };

  const handleNavigatePrevious = () => {
    if (currentLessonIndex > 0) {
      const previousLesson = lessons[currentLessonIndex - 1];
      router.replace(`/courses/${id}/player?lessonId=${previousLesson.id}`);
    }
  };

  const handleNavigateNext = () => {
    if (nextLessonInSequence) {
      if (nextLessonInSequence.isLocked) {
        Alert.alert('Locked', 'Complete the current lesson to unlock the next one');
      } else {
        router.replace(`/courses/${id}/player?lessonId=${nextLessonInSequence.id}`);
      }
    }
  };

  // Loading state
  if (lessonLoading || !lesson) {
    return (
      <ScreenWrapper screenName="CoursePlayer">
        <View className="flex-1 items-center justify-center bg-gray-50">
          <Text className="text-gray-600">Loading lesson...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper screenName="CoursePlayer">
      <View className="flex-1 bg-white">
        {/* XP Gain Animation */}
        {activeXPAnimation && (
          <XPGainAnimation
            amount={activeXPAnimation.amount}
            source={activeXPAnimation.source}
            visible={true}
            onComplete={dismissXPAnimation}
          />
        )}

        {/* Level Up Modal */}
        {showLevelUpModal && levelUpInfo && (
          <LevelUpModal
            visible
            level={levelUpInfo.level}
            unlockedFeatures={levelUpInfo.unlockedFeatures}
            onClose={dismissLevelUpModal}
          />
        )}

        {/* Header */}
        <View className="border-b border-gray-200 bg-white px-6 pb-4 pt-12">
          <Button variant="ghost" onPress={() => router.back()} className="mb-3">
            <Text className="text-base text-blue-500">← Back to Course</Text>
          </Button>

          <Text className="mb-1 text-2xl font-bold text-gray-900">{lesson.title}</Text>

          {lesson.description && (
            <Text className="mb-2 text-sm text-gray-600">{lesson.description}</Text>
          )}

          <View className="flex-row items-center gap-3">
            <View className="flex-row items-center">
              <Text className="mr-1 text-lg">
                {lesson.contentType === 'video'
                  ? '🎥'
                  : lesson.contentType === 'text'
                    ? '📝'
                    : '📋'}
              </Text>
              <Text className="text-sm text-gray-600">
                {lesson.contentType === 'video'
                  ? 'Video'
                  : lesson.contentType === 'text'
                    ? 'Reading'
                    : 'Quiz'}
              </Text>
            </View>

            <View className="flex-row items-center">
              <Text className="mr-1 text-lg">⭐</Text>
              <Text className="text-sm text-gray-600">{lesson.xpReward} XP</Text>
            </View>

            {lesson.isCompleted && (
              <View className="rounded-full bg-green-100 px-3 py-1">
                <Text className="text-xs font-semibold text-green-700">✓ COMPLETED</Text>
              </View>
            )}
          </View>
        </View>

        {/* Lesson Content */}
        <ScrollView className="flex-1">
          <CoursePlayer
            contentType={lesson.contentType}
            content={{
              video: lesson.contentUrl
                ? { url: lesson.contentUrl, duration: lesson.duration || 0 }
                : undefined,
              text: lesson.textContent ? { markdown: lesson.textContent } : undefined,
              quiz: lesson.quizData ? { questions: lesson.quizData.questions } : undefined,
            }}
            isCompleted={lesson.isCompleted}
            onComplete={handleComplete}
          />
        </ScrollView>

        {/* Navigation Footer */}
        <View className="border-t border-gray-200 bg-white p-4">
          <View className="flex-row justify-between">
            <Button
              onPress={handleNavigatePrevious}
              disabled={currentLessonIndex === 0}
              className={`rounded-lg px-6 py-3 ${
                currentLessonIndex === 0 ? 'bg-gray-300' : 'bg-gray-600 active:opacity-80'
              }`}>
              <Text className="font-semibold text-white">← Previous</Text>
            </Button>

            <Button
              onPress={handleNavigateNext}
              disabled={!nextLessonInSequence}
              className={`rounded-lg px-6 py-3 ${
                !nextLessonInSequence ? 'bg-gray-300' : 'bg-blue-500 active:opacity-80'
              }`}>
              <Text className="font-semibold text-white">Next →</Text>
            </Button>
          </View>

          {nextLessonInSequence && nextLessonInSequence.isLocked && (
            <Text className="mt-2 text-center text-xs text-orange-600">
              ⚠️ Complete this lesson to unlock the next one
            </Text>
          )}
        </View>
      </View>
    </ScreenWrapper>
  );
}
