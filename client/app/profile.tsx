import { View, ScrollView, Text } from 'react-native';
import {
  ProfileHeader,
  ProfileStats,
  ProfileBio,
  ContactInfo,
  RecentActivity,
} from '@/components/pages/profile';
import { LearningAchievementsGrid } from '@/components/pages/learning';
import { useLearningAchievements, useLearningXP } from '@/core/hooks';

export default function ProfilePage() {
  // Learning achievements for profile (T104)
  const { achievements, isLoading: achievementsLoading } = useLearningAchievements();
  const { summary, loading: xpLoading } = useLearningXP();

  return (
    <ScrollView className="flex-1">
      <View className="gap-6 p-6">
        <ProfileHeader />
        <ProfileStats />

        {/* Learning XP Summary (T104) */}
        {summary && (
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

        {/* Learning Achievements Grid (T104) */}
        <View>
          <Text className="mb-3 text-lg font-bold text-foreground">Learning Achievements</Text>
          <LearningAchievementsGrid
            achievements={achievements?.unlocked ?? []}
            loading={achievementsLoading}
          />
        </View>

        <ProfileBio />
        <ContactInfo />
        <RecentActivity />
      </View>
    </ScrollView>
  );
}
