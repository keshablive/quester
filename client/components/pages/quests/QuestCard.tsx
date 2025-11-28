import * as React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Quest } from '@/core/types/quest';
import { QuestCardProps } from './types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter, Badge, Button, Progress, Icon, Text } from '@/components/ui';
import { Clock, Trophy, Star } from 'lucide-react-native';

export function QuestCard({ quest, onPress }: QuestCardProps) {
  return (
    <TouchableOpacity onPress={() => onPress(quest)}>
      <Card className="mb-4 overflow-hidden">
        <CardHeader className="pb-2">
          <View className="flex-row justify-between items-start">
            <View className="flex-1 mr-2">
              <View className="flex-row items-center mb-1 gap-2">
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
              <View className="bg-green-100 dark:bg-green-900 p-1 rounded-full">
                <Icon as={Star} size={16} className="text-green-600 dark:text-green-400" fill="currentColor" />
              </View>
            )}
          </View>
          <CardDescription numberOfLines={2}>{quest.description}</CardDescription>
        </CardHeader>
        
        <CardContent className="pb-2">
          <View className="flex-row justify-between mb-2">
            <View className="flex-row items-center">
              <Icon as={Trophy} size={14} className="text-yellow-500 mr-1" />
              <Text className="text-sm text-muted-foreground">{quest.xp_reward} XP</Text>
            </View>
            <View className="flex-row items-center">
              <Icon as={Clock} size={14} className="text-blue-500 mr-1" />
              <Text className="text-sm text-muted-foreground">{quest.estimated_time_minutes} min</Text>
            </View>
          </View>
          
          {quest.progress_percentage !== undefined && quest.progress_percentage > 0 && (
            <View className="mt-2">
              <View className="flex-row justify-between mb-1">
                <Text className="text-xs text-muted-foreground">Progress</Text>
                <Text className="text-xs text-muted-foreground">{Math.round(quest.progress_percentage)}%</Text>
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

function getDifficultyColor(difficulty: string): "default" | "secondary" | "destructive" | "outline" {
  switch (difficulty) {
    case 'beginner': return 'secondary';
    case 'intermediate': return 'default';
    case 'advanced': return 'destructive';
    case 'expert': return 'destructive';
    default: return 'outline';
  }
}
