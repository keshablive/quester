import * as React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Quest } from '@/core/types/quest';
import { QuestCardProps } from './types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
  Badge,
  Button,
  Progress,
  Icon,
  Text,
} from '@/components/ui';
import { Clock, Trophy, Star } from 'lucide-react-native';

/**
 * QuestCard Component
 *
 * Displays a quest item in a list.
 * FR-005: Wrapped with React.memo to prevent unnecessary re-renders during scroll.
 */
function QuestCardComponent({ quest, onPress }: QuestCardProps) {
  return (
    <TouchableOpacity onPress={() => onPress(quest)}>
      <Card className="mb-4 overflow-hidden">
        <CardHeader className="pb-2">
          <View className="flex-row items-start justify-between">
            <View className="mr-2 flex-1">
              <View className="mb-1 flex-row items-center gap-2">
                <Badge variant="outline">
                  <Text className="text-xs font-medium capitalize">{quest.category}</Text>
                </Badge>
                <Badge variant={getDifficultyColor(quest.difficulty)}>
                  <Text className="text-xs font-medium capitalize">{quest.difficulty}</Text>
                </Badge>
              </View>
              <CardTitle className="text-lg">{quest.title}</CardTitle>
            </View>
            {quest.is_completed && (
              <View className="rounded-full bg-green-100 p-1 dark:bg-green-900">
                <Icon
                  as={Star}
                  size={16}
                  className="text-green-600 dark:text-green-400"
                  fill="currentColor"
                />
              </View>
            )}
          </View>
          <CardDescription numberOfLines={2}>{quest.description}</CardDescription>
        </CardHeader>

        <CardContent className="pb-2">
          <View className="mb-2 flex-row justify-between">
            <View className="flex-row items-center">
              <Icon as={Trophy} size={14} className="mr-1 text-yellow-500" />
              <Text className="text-sm text-muted-foreground">{quest.xp_reward} XP</Text>
            </View>
            <View className="flex-row items-center">
              <Icon as={Clock} size={14} className="mr-1 text-blue-500" />
              <Text className="text-sm text-muted-foreground">
                {quest.estimated_time_minutes} min
              </Text>
            </View>
          </View>

          {quest.progress_percentage !== undefined && quest.progress_percentage > 0 && (
            <View className="mt-2">
              <View className="mb-1 flex-row justify-between">
                <Text className="text-xs text-muted-foreground">Progress</Text>
                <Text className="text-xs text-muted-foreground">
                  {Math.round(quest.progress_percentage)}%
                </Text>
              </View>
              <Progress value={quest.progress_percentage} className="h-2" />
            </View>
          )}
        </CardContent>

        <CardFooter>
          <Button variant="secondary" className="w-full" onPress={() => onPress(quest)}>
            <Text>{quest.progress_percentage ? 'Continue Quest' : 'Start Quest'}</Text>
          </Button>
        </CardFooter>
      </Card>
    </TouchableOpacity>
  );
}

function getDifficultyColor(
  difficulty: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (difficulty) {
    case 'beginner':
      return 'secondary';
    case 'intermediate':
      return 'default';
    case 'advanced':
      return 'destructive';
    case 'expert':
      return 'destructive';
    default:
      return 'outline';
  }
}

/**
 * Custom comparison function for QuestCard memoization (FR-005, FR-016)
 * Compares only the quest properties that affect rendering
 */
function areQuestPropsEqual(prevProps: QuestCardProps, nextProps: QuestCardProps): boolean {
  const prevQuest = prevProps.quest;
  const nextQuest = nextProps.quest;

  // Compare quest properties that affect rendering
  return (
    prevQuest.id === nextQuest.id &&
    prevQuest.title === nextQuest.title &&
    prevQuest.description === nextQuest.description &&
    prevQuest.category === nextQuest.category &&
    prevQuest.difficulty === nextQuest.difficulty &&
    prevQuest.xp_reward === nextQuest.xp_reward &&
    prevQuest.estimated_time_minutes === nextQuest.estimated_time_minutes &&
    prevQuest.is_completed === nextQuest.is_completed &&
    prevQuest.progress_percentage === nextQuest.progress_percentage &&
    // Note: onPress callback identity comparison is intentionally skipped
    // as it's typically stable from useCallback in parent
    prevProps.onPress === nextProps.onPress
  );
}

/**
 * Memoized QuestCard export (FR-005)
 * Prevents re-renders when scrolling through quest list
 */
export const QuestCard = React.memo(QuestCardComponent, areQuestPropsEqual);
