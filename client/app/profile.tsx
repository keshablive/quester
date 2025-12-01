import { View, ScrollView, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  ProfileHeader,
  ProfileStats,
  ProfileBio,
  ContactInfo,
  RecentActivity,
} from '@/components/features/profile';
import { LearningAchievementsGrid } from '@/components/features/learning';
import { useLearningAchievements, useLearningXP } from '@/core/hooks';

/**
 * Profile page component
 *
 * Supports viewing own profile (no userId param) or another user's profile (with userId param)
 *
 * @example Routes:
 * - /profile - View current user's profile
 * - /profile?userId=123 - View user 123's profile
 */
export default function ProfilePage() {
  // Extract optional userId from route params for viewing other users' profiles
  const params = useLocalSearchParams<{ userId?: string }>();
  const userId = params.userId;

  // Learning achievements for profile (T104)
  const { achievements, isLoading: achievementsLoading } = useLearningAchievements();
  const { summary, loading: xpLoading } = useLearningXP();

  // Only show learning progress for own profile
  const isOwnProfile = !userId;

  return (
    <ScrollView className="flex-1">
      <View className="gap-6 p-6">
        <ProfileHeader userId={userId} />
        <ProfileStats userId={userId} />

        {/* Learning XP Summary (T104) - only for own profile */}
        {isOwnProfile && summary && (
          <View className="rounded-lg border border-border bg-card p-4">
            <Text className="mb-2 text-lg font-bold text-foreground">Learning Progress</Text>
            <View className="flex-row justify-between">
              <View className="items-center">
                <Text className="text-2xl font-bold text-primary">{summary.total_xp}</Text>
                <Text className="text-sm text-muted-foreground">Total XP</Text>
              </View>
              <View className="items-center">
                <Text className="text-2xl font-bold text-primary">{summary.level}</Text>
                <Text className="text-sm text-muted-foreground">Level</Text>
              </View>
              <View className="items-center">
                <Text className="text-2xl font-bold text-primary">
                  {achievements?.unlockedCount ?? 0}
                </Text>
                <Text className="text-sm text-muted-foreground">Achievements</Text>
              </View>
            </View>
          </View>
        )}

        {/* Learning Achievements Grid (T104) - only for own profile */}
        {isOwnProfile && (
          <View>
            <Text className="mb-3 text-lg font-bold text-foreground">Learning Achievements</Text>
            <LearningAchievementsGrid
              achievements={achievements?.unlocked ?? []}
              loading={achievementsLoading}
            />
          </View>
        )}

        <ProfileBio userId={userId} />
        <ContactInfo userId={userId} />
        {isOwnProfile && <RecentActivity />}
      </View>
    </ScrollView>
  );
}
