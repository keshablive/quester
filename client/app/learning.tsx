/**
 * Learning Page
 *
 * Route file for learning/courses view with gamification features.
 * Uses custom hooks that wrap TanStack Query for data fetching.
 *
 * Phase 3 Migration: Verified TanStack Query integration via hooks
 * FR-007: System MUST migrate Learning page to use TanStack Query
 *
 * @module app/learning
 */

import React from 'react';
import { View, ScrollView, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  LearningDashboard,
  CourseList,
  CourseDetail,
  LessonViewer,
  CertificateList,
  LearningXPSummary,
  CourseProgressCard,
  LevelUpModal,
  LearningStreakWidget,
  LearningChallengesWidget,
  LearningLeaderboardWidget,
} from '@/components/features/learning';
import { useLearningXP, useLearningProgress, useLearningGamificationWebSocket } from '@/core/hooks';
import { OfflineIndicator } from '@/components/shared';
import { ChunkErrorBoundary } from '@/core/routes';

export default function LearningPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ view: string; id: string }>();
  const view = params.view || 'dashboard';
  const id = params.id;

  // Learning XP state (T049)
  const {
    summary,
    streak,
    loading: xpLoading,
    levelUpModal,
    closeLevelUpModal,
    refreshSummary,
  } = useLearningXP();

  // Course progress state (T049)
  const { allCoursesProgress, loading: progressLoading, refreshProgress } = useLearningProgress();

  // WebSocket real-time updates (T102)
  useLearningGamificationWebSocket({
    onXPAwarded: () => {
      refreshSummary();
    },
    onLevelUp: () => {
      refreshSummary();
    },
  });

  const navigateTo = (newView: string, newId?: string) => {
    router.push({
      pathname: '/learning',
      params: { view: newView, ...(newId ? { id: newId } : {}) },
    });
  };

  const renderContent = () => {
    switch (view) {
      case 'courses':
        return <CourseList onCoursePress={(courseId) => navigateTo('course-detail', courseId)} />;
      case 'course-detail':
        if (!id) return null; // Or error state
        return (
          <CourseDetail
            courseId={id}
            onStartLesson={(lessonId) => navigateTo('lesson', lessonId)}
          />
        );
      case 'lesson':
        if (!id) return null;
        return (
          <LessonViewer
            lessonId={id}
            onBack={() => router.back()}
            onComplete={() => {
              // Refresh XP after lesson completion
              refreshSummary();
              refreshProgress();
              router.back();
            }}
          />
        );
      case 'certificates':
        return (
          <CertificateList
            onCertificatePress={(cert) => console.log('Certificate pressed:', cert.id)}
          />
        );
      default:
        // Dashboard view with XP summary, streak, challenges, and leaderboard (T102)
        return (
          <ScrollView className="flex-1">
            {/* XP Summary Section */}
            <View className="px-4 pt-4">
              <LearningXPSummary summary={summary} streak={streak} loading={xpLoading} />
            </View>

            {/* Streak Widget (T102) - uses hook internally */}
            <View className="mt-4 px-4">
              <LearningStreakWidget />
            </View>

            {/* Daily Challenges Widget (T102) - uses hook internally */}
            <View className="mt-4 px-4">
              <LearningChallengesWidget />
            </View>

            {/* Leaderboard Widget (T102) - uses hook internally */}
            <View className="mt-4 px-4">
              <LearningLeaderboardWidget showTimeframeTabs />
            </View>

            {/* In-Progress Courses */}
            {allCoursesProgress.length > 0 && (
              <View className="mt-4 px-4">
                <Text className="mb-2 text-lg font-bold text-foreground">Continue Learning</Text>
                <View className="mb-2">
                  {allCoursesProgress
                    .filter((cp) => !cp.is_completed)
                    .slice(0, 3) // Show top 3 in-progress
                    .map((courseProgress) => (
                      <View key={courseProgress.course_id} className="mb-3">
                        <CourseProgressCard
                          progress={courseProgress}
                          onPress={() => navigateTo('course-detail', courseProgress.course_id)}
                        />
                      </View>
                    ))}
                </View>
              </View>
            )}

            {/* Main Dashboard Content */}
            <LearningDashboard onNavigate={navigateTo} />
          </ScrollView>
        );
    }
  };

  return (
    <ChunkErrorBoundary>
      <View className="flex-1 bg-background">
        <OfflineIndicator />
        {renderContent()}

        {/* Level Up Modal (T048) */}
        <LevelUpModal
          visible={levelUpModal.visible}
          level={levelUpModal.level}
          levelName={levelUpModal.levelName}
          totalXP={levelUpModal.totalXP}
          onClose={closeLevelUpModal}
        />
      </View>
    </ChunkErrorBoundary>
  );
}
