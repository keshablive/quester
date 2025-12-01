import React from 'react';
import { View, ScrollView } from 'react-native';
import { Text, Card, CardContent, CardHeader, CardTitle, Button, Icon } from '@/components/ui';
import { BookOpen, Award, PlayCircle, TrendingUp, ArrowRight } from 'lucide-react-native';

interface LearningDashboardProps {
  onNavigate: (view: string, id?: string) => void;
}

export function LearningDashboard({ onNavigate }: LearningDashboardProps) {
  const STATS = [
    { label: 'Courses in Progress', value: '3', icon: BookOpen, color: 'text-blue-500' },
    { label: 'Certificates Earned', value: '2', icon: Award, color: 'text-amber-500' },
    { label: 'Hours Learned', value: '12.5', icon: PlayCircle, color: 'text-green-500' },
  ];

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="p-6 gap-6">
        <View>
          <Text className="text-3xl font-bold">Learning Center</Text>
          <Text className="text-muted-foreground">Track your progress and master new skills</Text>
        </View>

        {/* Stats Row */}
        <View className="flex-row gap-4">
          {STATS.map((stat, index) => (
            <Card key={index} className="flex-1">
              <CardContent className="p-4 items-center gap-2">
                <Icon as={stat.icon} size={24} className={stat.color} />
                <Text className="text-2xl font-bold">{stat.value}</Text>
                <Text className="text-xs text-center text-muted-foreground">{stat.label}</Text>
              </CardContent>
            </Card>
          ))}
        </View>

        {/* Quick Actions */}
        <View className="gap-4">
          <Text className="text-xl font-semibold">Quick Actions</Text>
          <View className="flex-row gap-4 flex-wrap">
            <Button 
              className="flex-1 min-w-[150px]" 
              variant="outline"
              onPress={() => onNavigate('courses')}
            >
              <Icon as={BookOpen} size={18} className="mr-2" />
              <Text>Browse Courses</Text>
            </Button>
            <Button 
              className="flex-1 min-w-[150px]" 
              variant="outline"
              onPress={() => onNavigate('certificates')}
            >
              <Icon as={Award} size={18} className="mr-2" />
              <Text>My Certificates</Text>
            </Button>
          </View>
        </View>

        {/* Continue Learning Section (Placeholder) */}
        <Card>
          <CardHeader>
            <CardTitle>Continue Learning</CardTitle>
          </CardHeader>
          <CardContent>
            <View className="gap-4">
              <View className="flex-row items-center gap-4">
                <View className="h-12 w-12 rounded-lg bg-primary/10 items-center justify-center">
                  <Icon as={TrendingUp} size={24} className="text-primary" />
                </View>
                <View className="flex-1">
                  <Text className="font-semibold">Advanced React Patterns</Text>
                  <Text className="text-sm text-muted-foreground">Lesson 5: Custom Hooks</Text>
                </View>
                <Button size="sm" onPress={() => onNavigate('lesson', '1')}>
                  <Text>Resume</Text>
                  <Icon as={ArrowRight} size={16} className="ml-1" />
                </Button>
              </View>
            </View>
          </CardContent>
        </Card>
      </View>
    </ScrollView>
  );
}
