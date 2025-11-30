import * as React from 'react';
import { View, ActivityIndicator, TouchableOpacity, Pressable } from 'react-native';
import { Text, Button, Icon, Card } from '@/components/ui';
import { Plus, Users, FileText, BookOpen, Target, Trophy } from 'lucide-react-native';
import { useQuickActions } from '@/core/hooks/queries';
import { useRouter } from 'expo-router';
import { prefetchDailyQuests } from '@/core/query/prefetch';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { STALE_TIMES } from '@/core/query/constants';

/**
 * Get icon component for action type
 */
const getActionIcon = (type: string) => {
  const icons: Record<string, typeof Plus> = {
    course: BookOpen,
    quest: Target,
    achievement: Trophy,
    project: FileText,
    social: Users,
    default: Plus,
  };
  return icons[type] || icons.default;
};

/**
 * QuickActions Component
 *
 * Displays quick action buttons based on user context.
 * Uses cached data for instant display on return visits.
 * T048: Implements prefetching for likely navigation targets.
 *
 * US1: Instant Data Display with Background Refresh
 */
export function QuickActions() {
  const { data: actions, isLoading, error } = useQuickActions();
  const router = useRouter();
  const queryClient = useQueryClient();

  /**
   * T048: Prefetch quest data when button is pressed (not on hover for mobile)
   */
  const handleQuestPressIn = React.useCallback(() => {
    prefetchDailyQuests(queryClient);
  }, [queryClient]);

  /**
   * T048: Prefetch achievements data when button is pressed
   */
  const handleAchievementsPressIn = React.useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.achievements.list(),
      staleTime: STALE_TIMES.ACHIEVEMENTS,
    });
  }, [queryClient]);

  // Loading state
  if (isLoading) {
    return (
      <View>
        <Text className="mb-3 text-lg font-semibold">Quick Actions</Text>
        <View className="flex-row flex-wrap gap-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="min-w-[140px] flex-1 items-center justify-center p-4">
              <ActivityIndicator size="small" color="#6366F1" />
            </Card>
          ))}
        </View>
      </View>
    );
  }

  // Error state - show default actions
  if (error || !actions) {
    return (
      <View>
        <Text className="mb-3 text-lg font-semibold">Quick Actions</Text>
        <View className="flex-row flex-wrap gap-3">
          <Button
            variant="outline"
            className="min-w-[140px] flex-1"
            onPress={() => router.push('/learning')}>
            <Icon as={BookOpen} size={16} />
            <Text>Browse Courses</Text>
          </Button>
          <Pressable
            onPressIn={handleQuestPressIn}
            onPress={() => router.push('/quests')}
            className="min-w-[140px] flex-1 rounded-md border border-input bg-background px-4 py-2">
            <View className="flex-row items-center justify-center gap-2">
              <Icon as={Target} size={16} />
              <Text>View Quests</Text>
            </View>
          </Pressable>
          <Pressable
            onPressIn={handleAchievementsPressIn}
            onPress={() => router.push('/achievements')}
            className="min-w-[140px] flex-1 rounded-md border border-input bg-background px-4 py-2">
            <View className="flex-row items-center justify-center gap-2">
              <Icon as={Trophy} size={16} />
              <Text>Achievements</Text>
            </View>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View>
      <Text className="mb-3 text-lg font-semibold">Quick Actions</Text>
      <View className="flex-row flex-wrap gap-3">
        {actions.map((action, index) => {
          const IconComponent = getActionIcon(action.type);

          // T048: Determine prefetch handler based on action type
          const handlePressIn = () => {
            if (action.type === 'quest') handleQuestPressIn();
            if (action.type === 'achievement') handleAchievementsPressIn();
          };

          return (
            <Pressable
              key={action.id || index}
              onPressIn={handlePressIn}
              onPress={() => {
                // Handle action navigation
                if (action.actionUrl) {
                  router.push(action.actionUrl as any);
                }
              }}
              className="min-w-[140px] flex-1 rounded-md border border-input bg-background px-4 py-2">
              <View className="flex-row items-center justify-center gap-2">
                <Icon as={IconComponent} size={16} />
                <Text>{action.title}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
