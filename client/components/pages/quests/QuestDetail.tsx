import * as React from 'react';
import { View, ScrollView } from 'react-native';
import { Quest } from '@/core/types/quest';
import { QuestDetailProps } from './types';
import { Button, Text, Badge, Icon, Separator } from '@/components/ui';
import { Clock, Trophy, ArrowLeft, CheckCircle, Circle } from 'lucide-react-native';

export function QuestDetail({ quest, onBack, onStart, onAbandon }: QuestDetailProps) {
  return (
    <View className="flex-1 bg-background">
      <View className="px-4 py-2 border-b border-border flex-row items-center">
        <Button variant="ghost" size="icon" onPress={onBack} className="mr-2">
          <Icon as={ArrowLeft} size={24} />
        </Button>
        <Text className="text-lg font-semibold flex-1" numberOfLines={1}>{quest.title}</Text>
      </View>

      <ScrollView className="flex-1 p-4">
        <View className="mb-6">
          <View className="flex-row gap-2 mb-4">
            <Badge variant="outline">{quest.category}</Badge>
            <Badge variant="secondary">{quest.difficulty}</Badge>
          </View>
          
          <Text className="text-2xl font-bold mb-2">{quest.title}</Text>
          <Text className="text-muted-foreground mb-4">{quest.description}</Text>
          
          <View className="flex-row gap-6 mb-6">
            <View className="flex-row items-center">
              <Icon as={Trophy} size={20} className="text-yellow-500 mr-2" />
              <View>
                <Text className="font-semibold">{quest.xp_reward} XP</Text>
                <Text className="text-xs text-muted-foreground">Reward</Text>
              </View>
            </View>
            <View className="flex-row items-center">
              <Icon as={Clock} size={20} className="text-blue-500 mr-2" />
              <View>
                <Text className="font-semibold">{quest.estimated_time_minutes} min</Text>
                <Text className="text-xs text-muted-foreground">Duration</Text>
              </View>
            </View>
          </View>
        </View>

        <Separator className="mb-6" />

        <View className="mb-6">
          <Text className="text-lg font-semibold mb-4">Steps</Text>
          {quest.steps?.map((step, index) => (
            <View key={step.id} className="flex-row mb-4">
              <View className="mr-4 items-center">
                <View className="w-8 h-8 rounded-full bg-secondary items-center justify-center">
                  <Text className="font-semibold">{index + 1}</Text>
                </View>
                {index < (quest.steps?.length || 0) - 1 && (
                  <View className="w-0.5 h-full bg-border mt-2" />
                )}
              </View>
              <View className="flex-1 pb-4">
                <Text className="font-semibold mb-1">{step.title}</Text>
                <Text className="text-sm text-muted-foreground">{step.description}</Text>
                <Badge variant="outline" className="mt-2 self-start">
                  {step.type}
                </Badge>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View className="p-4 border-t border-border">
        {quest.status === 'active' || quest.progress_percentage ? (
           <Button size="lg" className="w-full" onPress={onStart}>
             <Text>Continue Quest</Text>
           </Button>
        ) : (
          <Button size="lg" className="w-full" onPress={onStart}>
            <Text>Start Quest</Text>
          </Button>
        )}
      </View>
    </View>
  );
}
