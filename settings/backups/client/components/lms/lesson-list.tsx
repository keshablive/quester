import React from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';

interface Lesson {
  id: number;
  title: string;
  contentType: 'video' | 'text' | 'quiz';
  orderIndex: number;
  xpReward: number;
  isLocked: boolean;
  isCompleted: boolean;
  grade?: number;
}

interface LessonListProps {
  lessons: Lesson[];
  onLessonPress: (lessonId: number) => void;
}

const contentTypeIcons = {
  video: '🎥',
  text: '📝',
  quiz: '📋',
};

const contentTypeLabels = {
  video: 'Video',
  text: 'Reading',
  quiz: 'Quiz',
};

export function LessonList({ lessons, onLessonPress }: LessonListProps) {
  return (
    <ScrollView className="flex-1">
      {lessons.map((lesson, index) => (
        <LessonItem
          key={lesson.id}
          lesson={lesson}
          index={index}
          onPress={() => onLessonPress(lesson.id)}
        />
      ))}
    </ScrollView>
  );
}

interface LessonItemProps {
  lesson: Lesson;
  index: number;
  onPress: () => void;
}

function LessonItem({ lesson, index, onPress }: LessonItemProps) {
  const isDisabled = lesson.isLocked;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={`mb-3 overflow-hidden rounded-lg ${
        isDisabled ? 'opacity-50' : 'active:opacity-80'
      }`}>
      <View
        className={`flex-row items-center p-4 ${
          lesson.isCompleted
            ? 'border-2 border-green-200 bg-green-50'
            : lesson.isLocked
              ? 'border-2 border-gray-300 bg-gray-100'
              : 'border-2 border-blue-200 bg-white'
        }`}>
        {/* Order Number Circle */}
        <View
          className={`mr-3 h-10 w-10 items-center justify-center rounded-full ${
            lesson.isCompleted ? 'bg-green-500' : lesson.isLocked ? 'bg-gray-400' : 'bg-blue-500'
          }`}>
          <Text className="text-sm font-bold text-white">{index + 1}</Text>
        </View>

        {/* Content */}
        <View className="flex-1">
          {/* Title Row */}
          <View className="mb-1 flex-row items-center">
            <Text className="flex-1 text-base font-semibold text-gray-900">{lesson.title}</Text>
            {lesson.isLocked && <Text className="ml-2 text-lg">🔒</Text>}
            {lesson.isCompleted && <Text className="ml-2 text-lg">✅</Text>}
          </View>

          {/* Metadata Row */}
          <View className="flex-row items-center">
            {/* Content Type Badge */}
            <View className="mr-2 flex-row items-center rounded bg-gray-100 px-2 py-1">
              <Text className="mr-1 text-xs">{contentTypeIcons[lesson.contentType]}</Text>
              <Text className="text-xs text-gray-600">{contentTypeLabels[lesson.contentType]}</Text>
            </View>

            {/* XP Reward */}
            <View className="mr-2 flex-row items-center rounded bg-yellow-50 px-2 py-1">
              <Text className="text-xs text-yellow-700">⭐ {lesson.xpReward} XP</Text>
            </View>

            {/* Grade (if completed) */}
            {lesson.isCompleted && lesson.grade !== undefined && (
              <View
                className={`flex-row items-center rounded px-2 py-1 ${
                  lesson.grade >= 70
                    ? 'bg-green-100'
                    : lesson.grade >= 50
                      ? 'bg-yellow-100'
                      : 'bg-red-100'
                }`}>
                <Text
                  className={`text-xs font-semibold ${
                    lesson.grade >= 70
                      ? 'text-green-700'
                      : lesson.grade >= 50
                        ? 'text-yellow-700'
                        : 'text-red-700'
                  }`}>
                  {lesson.grade.toFixed(0)}%
                </Text>
              </View>
            )}
          </View>

          {/* Locked Message */}
          {lesson.isLocked && (
            <Text className="mt-1 text-xs text-gray-500">Complete previous lessons to unlock</Text>
          )}
        </View>

        {/* Chevron */}
        {!lesson.isLocked && <Text className="ml-2 text-xl text-gray-400">›</Text>}
      </View>
    </Pressable>
  );
}

// Skeleton loader for loading state
export function LessonListSkeleton() {
  return (
    <View className="flex-1 px-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <View key={i} className="mb-3 overflow-hidden rounded-lg bg-white p-4">
          <View className="flex-row items-center">
            <View className="mr-3 h-10 w-10 animate-pulse rounded-full bg-gray-200" />
            <View className="flex-1">
              <View className="mb-2 h-5 animate-pulse rounded bg-gray-200" />
              <View className="flex-row">
                <View className="mr-2 h-6 w-20 animate-pulse rounded bg-gray-200" />
                <View className="h-6 w-16 animate-pulse rounded bg-gray-200" />
              </View>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

// Empty state for no lessons
export function LessonListEmpty() {
  return (
    <View className="flex-1 items-center justify-center p-8">
      <Text className="mb-4 text-6xl">📚</Text>
      <Text className="mb-2 text-center text-xl font-bold text-gray-900">No Lessons Yet</Text>
      <Text className="text-center text-sm text-gray-600">
        This course doesn't have any lessons yet. Check back later!
      </Text>
    </View>
  );
}

// Progress indicator for the lesson list
export function LessonProgressBar({
  completedLessons,
  totalLessons,
}: {
  completedLessons: number;
  totalLessons: number;
}) {
  const percentage = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

  return (
    <View className="mb-2 bg-white p-4">
      <View className="mb-2 flex-row justify-between">
        <Text className="text-sm font-semibold text-gray-700">Course Progress</Text>
        <Text className="text-sm font-semibold text-blue-600">
          {completedLessons}/{totalLessons} Lessons
        </Text>
      </View>
      <View className="h-3 overflow-hidden rounded-full bg-gray-200">
        <View className="h-full rounded-full bg-blue-500" style={{ width: `${percentage}%` }} />
      </View>
      <Text className="mt-1 text-right text-xs text-gray-500">
        {percentage.toFixed(0)}% Complete
      </Text>
    </View>
  );
}
