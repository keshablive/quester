import React from 'react';
import { View, Pressable, Image } from 'react-native';
import { Text } from '@/components/ui';
import { BookOpen, Clock, TrendingUp, CheckCircle } from 'lucide-react-native';
import { cn } from '@/core';
import { CourseCardProps } from './course.types';

export function CourseCard({ course, onPress, onEnroll }: CourseCardProps) {
  const getLevelColor = () => {
    switch (course.level) {
      case 'beginner': return 'text-green-500';
      case 'intermediate': return 'text-yellow-500';
      case 'advanced': return 'text-red-500';
      default: return 'text-muted-foreground';
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
      className="bg-card rounded-xl border border-border overflow-hidden mb-4"
      onPress={() => onPress?.(course.id)}
    >
      {/* Thumbnail */}
      {course.thumbnail ? (
        <Image
          source={{ uri: course.thumbnail }}
          className="w-full h-48"
          resizeMode="cover"
        />
      ) : (
        <View className="w-full h-48 bg-muted items-center justify-center">
          <BookOpen size={48} className="text-muted-foreground" />
        </View>
      )}

      {/* Content */}
      <View className="p-4">
        <Text className="text-lg font-bold text-foreground mb-2">{course.title}</Text>
        <Text className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {course.description}
        </Text>

        {/* Meta Info */}
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center">
            <Clock size={16} className="text-muted-foreground mr-1" />
            <Text className="text-xs text-muted-foreground">
              {formatDuration(course.duration)}
            </Text>
          </View>
          <View className="flex-row items-center">
            <TrendingUp size={16} className={cn("mr-1", getLevelColor())} />
            <Text className={cn("text-xs font-semibold capitalize", getLevelColor())}>
              {course.level}
            </Text>
          </View>
        </View>

        <Text className="text-sm text-muted-foreground mb-3">
          Instructor: {course.instructor}
        </Text>

        {/* Progress or Enroll Button */}
        {course.enrolled ? (
          <View>
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-sm font-semibold text-foreground">Progress</Text>
              <Text className="text-sm font-semibold text-primary">
                {course.progress || 0}%
              </Text>
            </View>
            <View className="h-2 bg-muted rounded-full overflow-hidden">
              <View
                className="h-full bg-primary"
                style={{ width: `${course.progress || 0}%` }}
              />
            </View>
          </View>
        ) : (
          <Pressable
            className="bg-primary py-3 rounded-lg flex-row items-center justify-center"
            onPress={() => onEnroll?.(course.id)}
          >
            <CheckCircle size={16} color="#fff" className="mr-2" />
            <Text className="text-base font-semibold text-primary-foreground">
              Enroll Now
            </Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}
