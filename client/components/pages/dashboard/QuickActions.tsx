import * as React from 'react';
import { View, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Text, Button, Icon, Card } from '@/components/ui';
import { Plus, Users, FileText, BookOpen, Target, Trophy } from 'lucide-react-native';
import { useQuickActions } from '@/core/hooks/queries';

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
 *
 * US1: Instant Data Display with Background Refresh
 */
export function QuickActions() {
  const { data: actions, isLoading, error } = useQuickActions();

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
          <Button variant="outline" className="min-w-[140px] flex-1">
            <Icon as={BookOpen} size={16} />
            <Text>Browse Courses</Text>
          </Button>
          <Button variant="outline" className="min-w-[140px] flex-1">
            <Icon as={Target} size={16} />
            <Text>View Quests</Text>
          </Button>
          <Button variant="outline" className="min-w-[140px] flex-1">
            <Icon as={Trophy} size={16} />
            <Text>Achievements</Text>
          </Button>
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

          return (
            <Button
              key={action.id || index}
              variant="outline"
              className="min-w-[140px] flex-1"
              onPress={() => {
                // Handle action navigation
                // This would typically use router.push(action.actionUrl)
                console.log(`Navigate to: ${action.actionUrl || action.title}`);
              }}>
              <Icon as={IconComponent} size={16} />
              <Text>{action.title}</Text>
            </Button>
          );
        })}
      </View>
    </View>
  );
}
