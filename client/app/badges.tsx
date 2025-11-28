import React, { useState, useEffect } from 'react';
import { View, FlatList } from 'react-native';
import { 
  Text, 
  Card, 
  CardContent, 
  Badge as BadgeUI,
  Skeleton,
  Icon
} from '@/components/ui';
import { Trophy, Lock } from 'lucide-react-native';
import { badgesService, Badge } from '@/core';
import { cn } from '@/core';

function BadgeCard({ badge }: { badge: Badge }) {
  const getRarityColor = () => {
    switch (badge.rarity) {
      case 'common': return 'text-gray-500';
      case 'rare': return 'text-blue-500';
      case 'epic': return 'text-purple-500';
      case 'legendary': return 'text-yellow-500';
      default: return 'text-muted-foreground';
    }
  };

  const getRarityVariant = () => {
    switch (badge.rarity) {
      case 'common': return 'secondary';
      case 'rare': return 'default';
      case 'epic': return 'default';
      case 'legendary': return 'default';
      default: return 'outline';
    }
  };

  return (
    <Card className={cn("mb-4", badge.earned ? "border-primary/50" : "border-border opacity-50")}>
      <CardContent className="p-4 flex-row items-center gap-4">
        <View className={cn(
          "w-16 h-16 rounded-full items-center justify-center",
          badge.earned ? "bg-primary/10" : "bg-muted"
        )}>
          {badge.earned ? (
            <Text className="text-3xl">{badge.icon}</Text>
          ) : (
            <Icon as={Lock} size={24} className="text-muted-foreground" />
          )}
        </View>
        
        <View className="flex-1 gap-1">
          <View className="flex-row items-center justify-between">
            <Text className={cn(
              "text-lg font-bold",
              badge.earned ? "text-foreground" : "text-muted-foreground"
            )}>
              {badge.name}
            </Text>
            <BadgeUI variant={getRarityVariant()}>
              <Text>{badge.rarity}</Text>
            </BadgeUI>
          </View>
          
          <Text className="text-sm text-muted-foreground">{badge.description}</Text>
          
          {badge.earned && badge.earnedAt && (
            <Text className="text-xs text-primary mt-1">
              Earned: {new Date(badge.earnedAt).toLocaleDateString()}
            </Text>
          )}
          
          {!badge.earned && badge.requirement && (
            <Text className="text-xs text-muted-foreground mt-1">
              Requirement: {badge.requirement}
            </Text>
          )}
        </View>
      </CardContent>
    </Card>
  );
}

function BadgesSkeleton() {
  return (
    <View className="p-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardContent className="p-4 flex-row items-center gap-4">
            <Skeleton className="w-16 h-16 rounded-full" />
            <View className="flex-1 gap-2">
              <View className="flex-row justify-between">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-5 w-16" />
              </View>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-24" />
            </View>
          </CardContent>
        </Card>
      ))}
    </View>
  );
}

export default function BadgesPage() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBadges();
  }, []);

  const loadBadges = async () => {
    try {
      setLoading(true);
      const data = await badgesService.getBadges();
      setBadges(data);
    } catch (err) {
      console.error('Failed to load badges:', err);
    } finally {
      setLoading(false);
    }
  };

  const earnedCount = badges.filter(b => b.earned).length;

  return (
    <View className="flex-1 bg-background">
      <View className="p-4 border-b border-border bg-card">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Icon as={Trophy} size={24} className="text-primary mr-2" />
            <Text className="text-2xl font-bold text-foreground">Badges</Text>
          </View>
          <Text className="text-lg font-semibold text-primary">
            {earnedCount}/{badges.length}
          </Text>
        </View>
      </View>

      {loading ? (
        <BadgesSkeleton />
      ) : (
        <FlatList
          data={badges}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <BadgeCard badge={item} />}
          contentContainerClassName="p-4"
        />
      )}
    </View>
  );
}

