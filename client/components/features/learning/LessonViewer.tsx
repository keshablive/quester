import React, { useState, useEffect } from 'react';
import { View, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { Text } from '@/components/ui';
import { PlayCircle, CheckCircle, ArrowLeft } from 'lucide-react-native';
import { lessonsService, Lesson } from '@/core';
import { LessonViewerProps } from './course.types';
import { useRouter } from 'expo-router';

export function LessonViewer({ lessonId, onComplete, onBack }: LessonViewerProps) {
  const router = useRouter();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    loadLesson();
  }, [lessonId]);

  const loadLesson = async () => {
    try {
      setLoading(true);
      const data = await lessonsService.getLesson(lessonId);
      setLesson(data);
    } catch (err) {
      console.error('Failed to load lesson:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!lesson || lesson.completed) return;
    
    try {
      setCompleting(true);
      await lessonsService.completeLesson(lessonId);
      setLesson({ ...lesson, completed: true });
      onComplete?.(lessonId);
    } catch (err) {
      console.error('Failed to complete lesson:', err);
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" className="text-primary" />
      </View>
    );
  }

  if (!lesson) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text className="text-base text-destructive">Lesson not found</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background">
      {/* Header */}
      <View className="p-4 border-b border-border bg-card">
        <Pressable
          className="flex-row items-center mb-2"
          onPress={onBack || (() => router.back())}
        >
          <ArrowLeft size={20} className="text-primary mr-2" />
          <Text className="text-base text-primary">Back to Course</Text>
        </Pressable>
        <Text className="text-2xl font-bold text-foreground">{lesson.title}</Text>
      </View>

      {/* Video Player Placeholder */}
      {lesson.videoUrl && (
        <View className="w-full h-64 bg-black items-center justify-center">
          <PlayCircle size={64} color="#fff" />
          <Text className="text-white mt-2">Video Player</Text>
        </View>
      )}

      {/* Content */}
      <View className="p-4">
        <Text className="text-base text-muted-foreground mb-4">{lesson.description}</Text>
        
        {lesson.content && (
          <View className="bg-card rounded-xl p-4 border border-border mb-4">
            <Text className="text-base text-foreground">{lesson.content}</Text>
          </View>
        )}

        {/* Complete Button */}
        {!lesson.completed && (
          <Pressable
            className="bg-primary py-4 rounded-xl flex-row items-center justify-center"
            onPress={handleComplete}
            disabled={completing}
          >
            {completing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <CheckCircle size={20} color="#fff" className="mr-2" />
                <Text className="text-base font-semibold text-primary-foreground">
                  Mark as Complete
                </Text>
              </>
            )}
          </Pressable>
        )}

        {lesson.completed && (
          <View className="bg-primary/10 py-4 rounded-xl flex-row items-center justify-center border border-primary/20">
            <CheckCircle size={20} className="text-primary mr-2" />
            <Text className="text-base font-semibold text-primary">Completed</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
