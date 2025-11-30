import React from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@/components/ui';
import { BookOpen, Clock, TrendingUp, CheckCircle } from 'lucide-react-native';
import { cn, OptimizedImage } from '@/core';
import { CourseCardProps } from './course.types';

export function CourseCard({ course, onPress, onEnroll }: CourseCardProps) {
  const getLevelColor = () => {
    switch (course.level) {
      case 'beginner':
        return 'text-green-500';
      case 'intermediate':
        return 'text-yellow-500';
      case 'advanced':
        return 'text-red-500';
      default:
        return 'text-muted-foreground';
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  return (
    <Pressable
      className="mb-4 overflow-hidden rounded-xl border border-border bg-card"
      onPress={() => onPress?.(course.id)}>
      {/* Thumbnail */}
      {course.thumbnail ? (
        <OptimizedImage
          source={course.thumbnail}
          className="h-48 w-full"
          contentFit="cover"
          placeholder="courseThumbnail"
        />
      ) : (
        <View className="h-48 w-full items-center justify-center bg-muted">
          <BookOpen size={48} className="text-muted-foreground" />
        </View>
      )}

      {/* Content */}
      <View className="p-4">
        <Text className="mb-2 text-lg font-bold text-foreground">{course.title}</Text>
        <Text className="mb-3 line-clamp-2 text-sm text-muted-foreground">
          {course.description}
        </Text>

        {/* Meta Info */}
        <View className="mb-3 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Clock size={16} className="mr-1 text-muted-foreground" />
            <Text className="text-xs text-muted-foreground">{formatDuration(course.duration)}</Text>
          </View>
          <View className="flex-row items-center">
            <TrendingUp size={16} className={cn('mr-1', getLevelColor())} />
            <Text className={cn('text-xs font-semibold capitalize', getLevelColor())}>
              {course.level}
            </Text>
          </View>
        </View>

        <Text className="mb-3 text-sm text-muted-foreground">Instructor: {course.instructor}</Text>

        {/* Progress or Enroll Button */}
        {course.enrolled ? (
          <View>
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-sm font-semibold text-foreground">Progress</Text>
              <Text className="text-sm font-semibold text-primary">{course.progress || 0}%</Text>
            </View>
            <View className="h-2 overflow-hidden rounded-full bg-muted">
              <View className="h-full bg-primary" style={{ width: `${course.progress || 0}%` }} />
            </View>
          </View>
        ) : (
          <Pressable
            className="flex-row items-center justify-center rounded-lg bg-primary py-3"
            onPress={() => onEnroll?.(course.id)}>
            <CheckCircle size={16} color="#fff" className="mr-2" />
            <Text className="text-base font-semibold text-primary-foreground">Enroll Now</Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}
