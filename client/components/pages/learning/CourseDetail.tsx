import React, { useState, useEffect } from 'react';
import { View, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { Text } from '@/components/ui';
import {
  BookOpen,
  Clock,
  TrendingUp,
  PlayCircle,
  CheckCircle,
  ArrowLeft,
  Star,
} from 'lucide-react-native';
import { coursesService, Course, Lesson, OptimizedImage } from '@/core';
import { CourseDetailProps } from './course.types';
import { cn, useLearningProgress } from '@/core';
import { useRouter } from 'expo-router';

export function CourseDetail({ courseId, onStartLesson, onBack }: CourseDetailProps) {
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get course-specific progress (T103)
  const { courseProgress, loadCourseProgress, refreshProgress } = useLearningProgress();

  useEffect(() => {
    loadCourseDetails();
    if (courseId) {
      loadCourseProgress(courseId);
    }
  }, [courseId]);

  const loadCourseDetails = async () => {
    try {
      setLoading(true);
      const [courseData, lessonsData] = await Promise.all([
        coursesService.getCourse(courseId),
        coursesService.getCourseLessons(courseId),
      ]);
      setCourse(courseData);
      setLessons(lessonsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load course details');
    } finally {
      setLoading(false);
    }
  };

  const handleLessonPress = (lessonId: string) => {
    if (onStartLesson) {
      onStartLesson(lessonId);
    } else {
      router.push(`/lessons/${lessonId}`);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" className="text-primary" />
      </View>
    );
  }

  if (error || !course) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-6">
        <Text className="text-center text-base text-destructive">{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background">
      {/* Header */}
      <View className="relative">
        {course.thumbnail ? (
          <OptimizedImage
            source={course.thumbnail}
            className="h-64 w-full"
            contentFit="cover"
            placeholder="courseThumbnail"
          />
        ) : (
          <View className="h-64 w-full items-center justify-center bg-muted">
            <BookOpen size={64} className="text-muted-foreground" />
          </View>
        )}
        <Pressable
          className="absolute left-4 top-4 h-10 w-10 items-center justify-center rounded-full bg-black/50"
          onPress={onBack || (() => router.back())}>
          <ArrowLeft size={24} color="#fff" />
        </Pressable>
      </View>

      {/* Course Info */}
      <View className="p-4">
        <Text className="mb-2 text-2xl font-bold text-foreground">{course.title}</Text>
        <Text className="mb-4 text-base text-muted-foreground">{course.description}</Text>

        <View className="mb-4 flex-row items-center">
          <View className="mr-6 flex-row items-center">
            <Clock size={16} className="mr-1 text-muted-foreground" />
            <Text className="text-sm text-muted-foreground">{course.duration} min</Text>
          </View>
          <View className="flex-row items-center">
            <TrendingUp size={16} className="mr-1 text-primary" />
            <Text className="text-sm font-semibold capitalize text-primary">{course.level}</Text>
          </View>
        </View>

        <Text className="mb-6 text-sm text-muted-foreground">Instructor: {course.instructor}</Text>

        {/* Course XP Progress (T103) */}
        {courseProgress && (
          <View className="mb-4 flex-row items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-3">
            <View className="flex-row items-center">
              <Star size={20} className="mr-2 text-primary" fill="#FBBF24" />
              <Text className="text-base font-semibold text-foreground">
                {courseProgress.xp_earned} XP earned
              </Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-sm text-muted-foreground">
                {courseProgress.lessons_completed}/{courseProgress.total_lessons} lessons
              </Text>
            </View>
          </View>
        )}

        {/* Progress */}
        {course.enrolled && (
          <View className="mb-6">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-base font-semibold text-foreground">Your Progress</Text>
              <Text className="text-base font-semibold text-primary">{course.progress || 0}%</Text>
            </View>
            <View className="h-3 overflow-hidden rounded-full bg-muted">
              <View className="h-full bg-primary" style={{ width: `${course.progress || 0}%` }} />
            </View>
          </View>
        )}

        {/* Lessons */}
        <Text className="mb-4 text-xl font-bold text-foreground">Lessons ({lessons.length})</Text>
        {lessons.map((lesson, index) => (
          <Pressable
            key={lesson.id}
            className={cn(
              'mb-2 flex-row items-center rounded-lg border p-4',
              lesson.completed ? 'border-primary/20 bg-primary/5' : 'border-border bg-card'
            )}
            onPress={() => handleLessonPress(lesson.id)}>
            <View
              className={cn(
                'mr-3 h-10 w-10 items-center justify-center rounded-full',
                lesson.completed ? 'bg-primary' : 'bg-muted'
              )}>
              {lesson.completed ? (
                <CheckCircle size={20} color="#fff" />
              ) : (
                <Text className="text-base font-bold text-foreground">{index + 1}</Text>
              )}
            </View>
            <View className="flex-1">
              <Text
                className={cn(
                  'mb-1 text-base font-semibold',
                  lesson.completed ? 'text-primary' : 'text-foreground'
                )}>
                {lesson.title}
              </Text>
              <View className="flex-row items-center">
                <Clock size={14} className="mr-1 text-muted-foreground" />
                <Text className="text-sm text-muted-foreground">{lesson.duration} min</Text>
              </View>
            </View>
            <PlayCircle
              size={24}
              className={lesson.completed ? 'text-primary' : 'text-muted-foreground'}
            />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
