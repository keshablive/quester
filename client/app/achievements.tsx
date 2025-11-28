import React, { useState, useEffect } from 'react';
import { View, FlatList } from 'react-native';
import { 
  Text, 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  Button,
  Progress,
  Skeleton,
  Icon
} from '@/components/ui';
import { Award, Gift } from 'lucide-react-native';
import { achievementsService, Achievement } from '@/core';
import { cn } from '@/core';

function AchievementCard({ achievement, onClaim }: { achievement: Achievement; onClaim?: (id: string) => void }) {
  return (
    <Card className={cn("mb-4", achievement.unlocked ? "border-primary/50" : "border-border")}>
      <CardContent className="p-4 pt-4">
        <View className="flex-row items-center mb-3">
          <View className={cn(
            "w-16 h-16 rounded-full items-center justify-center mr-3",
            achievement.unlocked ? "bg-primary/10" : "bg-muted"
          )}>
            <Text className="text-3xl">{achievement.icon}</Text>
          </View>
          <View className="flex-1">
            <Text className={cn(
              "text-lg font-bold mb-1",
              achievement.unlocked ? "text-foreground" : "text-muted-foreground"
            )}>
              {achievement.name}
            </Text>
            <View className="flex-row items-center">
              <Icon as={Award} size={14} className="text-primary mr-1" />
              <Text className="text-sm font-semibold text-primary">{achievement.points} pts</Text>
            </View>
          </View>
        </View>

        <Text className="text-sm text-muted-foreground mb-3">{achievement.description}</Text>

        {/* Progress Bar */}
        <View className="mb-3 gap-2">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs text-muted-foreground">Progress</Text>
            <Text className="text-xs font-semibold text-foreground">
              {achievement.progress}/{achievement.maxProgress}
            </Text>
          </View>
          <Progress value={(achievement.progress / achievement.maxProgress) * 100} />
        </View>

        {/* Claim Button */}
        {achievement.unlocked && !achievement.claimed && (
          <Button 
            className="w-full"
            onPress={() => onClaim?.(achievement.id)}
          >
            <Icon as={Gift} size={16} className="mr-2 text-primary-foreground" />
            <Text>Claim Reward</Text>
          </Button>
        )}

        {achievement.claimed && (
          <View className="bg-primary/10 py-3 rounded-lg flex-row items-center justify-center border border-primary/20">
            <Text className="text-base font-semibold text-primary">Claimed</Text>
          </View>
        )}
      </CardContent>
    </Card>
  );
}

function AchievementsSkeleton() {
  return (
    <View className="p-4 gap-4">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="p-4">
          <View className="flex-row items-center mb-3">
            <Skeleton className="w-16 h-16 rounded-full mr-3" />
            <View className="flex-1 gap-2">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/4" />
            </View>
          </View>
          <Skeleton className="h-4 w-full mb-3" />
          <Skeleton className="h-2 w-full mb-3" />
        </Card>
      ))}
    </View>
  );
}

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    try {
      setLoading(true);
      const data = await achievementsService.getAchievements();
      setAchievements(data);
    } catch (err) {
      console.error('Failed to load achievements:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (id: string) => {
    try {
      await achievementsService.claimAchievement(id);
      setAchievements(achievements.map(a => 
        a.id === id ? { ...a, claimed: true } : a
      ));
    } catch (err) {
      console.error('Failed to claim achievement:', err);
    }
  };

  const totalPoints = achievements.filter(a => a.claimed).reduce((sum, a) => sum + a.points, 0);
  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <View className="flex-1 bg-background">
      <View className="p-4 border-b border-border bg-card">
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center">
            <Icon as={Award} size={24} className="text-primary mr-2" />
            <Text className="text-2xl font-bold text-foreground">Achievements</Text>
          </View>
          <Text className="text-lg font-semibold text-primary">{totalPoints} pts</Text>
        </View>
        <Text className="text-sm text-muted-foreground">
          {unlockedCount}/{achievements.length} unlocked
        </Text>
      </View>

      {loading ? (
        <AchievementsSkeleton />
      ) : (
        <FlatList
          data={achievements}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <AchievementCard achievement={item} onClaim={handleClaim} />}
          contentContainerClassName="p-4"
        />
      )}
    </View>
  );
}

