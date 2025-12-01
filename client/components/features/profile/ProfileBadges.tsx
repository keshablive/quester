import * as React from 'react';
import { View, ScrollView, Pressable, ActivityIndicator, Platform } from 'react-native';
import { Text, Card, Badge } from '@/components/ui';
import { cn } from '@/core';
import { socialGamificationService } from '@/core/api';

/**
 * Social achievement data from API
 */
export interface SocialAchievement {
  id: string;
  name: string;
  description: string;
  iconUrl?: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'legendary';
  targetCount: number;
  currentCount: number;
  completed: boolean;
  xpReward: number;
  completedAt?: string;
}

interface ProfileBadgesProps {
  /** User ID to fetch badges for (optional, defaults to current user) */
  userId?: string;
  /** Show all badges or only completed ones */
  showAll?: boolean;
  /** Maximum badges to display */
  maxBadges?: number;
  /** Additional class names */
  className?: string;
  /** Callback when a badge is pressed */
  onBadgePress?: (achievement: SocialAchievement) => void;
}

const difficultyColors: Record<string, string> = {
  easy: 'bg-green-500',
  medium: 'bg-blue-500',
  hard: 'bg-purple-500',
  legendary: 'bg-yellow-500',
};

const difficultyBorders: Record<string, string> = {
  easy: 'border-green-500',
  medium: 'border-blue-500',
  hard: 'border-purple-500',
  legendary: 'border-yellow-500',
};

const difficultyLabels: Record<string, string> = {
  easy: 'Common',
  medium: 'Rare',
  hard: 'Epic',
  legendary: 'Legendary',
};

/**
 * Achievement badge item component
 */
function AchievementBadge({
  achievement,
  onPress,
}: {
  achievement: SocialAchievement;
  onPress?: () => void;
}) {
  const progress = Math.min((achievement.currentCount / achievement.targetCount) * 100, 100);

  return (
    <Pressable
      onPress={onPress}
      className={cn(
        'items-center',
        Platform.select({
          web: 'cursor-pointer transition-transform hover:scale-105',
        })
      )}>
      <View
        className={cn(
          'relative h-16 w-16 items-center justify-center rounded-full border-2',
          achievement.completed ? difficultyBorders[achievement.difficulty] : 'border-muted',
          !achievement.completed && 'opacity-50'
        )}>
        {achievement.iconUrl ? (
          <View
            className={cn(
              'h-14 w-14 items-center justify-center rounded-full',
              achievement.completed ? difficultyColors[achievement.difficulty] : 'bg-muted'
            )}>
            <Text className="text-2xl">{achievement.completed ? '🎖️' : '🔒'}</Text>
          </View>
        ) : (
          <View
            className={cn(
              'h-14 w-14 items-center justify-center rounded-full',
              achievement.completed ? difficultyColors[achievement.difficulty] : 'bg-muted'
            )}>
            <Text className="text-2xl">{achievement.completed ? '🎖️' : '🔒'}</Text>
          </View>
        )}

        {/* Progress ring for incomplete achievements */}
        {!achievement.completed && (
          <View
            className="absolute -inset-0.5 rounded-full"
            style={{
              borderWidth: 3,
              borderColor: 'transparent',
              borderTopColor:
                difficultyColors[achievement.difficulty]?.replace('bg-', '#') || '#666',
              transform: [{ rotate: `${progress * 3.6}deg` }],
            }}
          />
        )}
      </View>

      {/* Badge name */}
      <Text
        className={cn(
          'mt-1 w-20 text-center text-xs',
          achievement.completed ? 'text-foreground' : 'text-muted-foreground'
        )}
        numberOfLines={2}>
        {achievement.name}
      </Text>

      {/* Progress indicator for incomplete */}
      {!achievement.completed && (
        <Text className="text-xs text-muted-foreground">
          {achievement.currentCount}/{achievement.targetCount}
        </Text>
      )}
    </Pressable>
  );
}

/**
 * ProfileBadges component displays social achievements
 * US3: Display earned social badges on profile
 */
export function ProfileBadges({
  userId,
  showAll = false,
  maxBadges,
  className,
  onBadgePress,
}: ProfileBadgesProps) {
  const [achievements, setAchievements] = React.useState<SocialAchievement[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function fetchAchievements() {
      try {
        setLoading(true);
        setError(null);

        const response = userId
          ? await socialGamificationService.getUserSocialAchievements(userId)
          : await socialGamificationService.getMySocialAchievements();

        if (response?.achievements) {
          setAchievements(response.achievements);
        }
      } catch (err) {
        console.error('Failed to fetch achievements:', err);
        setError('Failed to load badges');
      } finally {
        setLoading(false);
      }
    }

    fetchAchievements();
  }, [userId]);

  // Filter and limit achievements
  const displayedAchievements = React.useMemo(() => {
    let filtered = showAll ? achievements : achievements.filter((a) => a.completed);

    // Sort completed first, then by difficulty
    filtered.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? -1 : 1;
      const difficultyOrder = { legendary: 0, hard: 1, medium: 2, easy: 3 };
      return (difficultyOrder[a.difficulty] || 4) - (difficultyOrder[b.difficulty] || 4);
    });

    if (maxBadges && maxBadges > 0) {
      filtered = filtered.slice(0, maxBadges);
    }

    return filtered;
  }, [achievements, showAll, maxBadges]);

  const completedCount = achievements.filter((a) => a.completed).length;
  const totalCount = achievements.length;

  if (loading) {
    return (
      <Card className={cn('p-4', className)}>
        <View className="items-center justify-center py-4">
          <ActivityIndicator size="small" />
        </View>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn('p-4', className)}>
        <Text className="text-center text-sm text-muted-foreground">{error}</Text>
      </Card>
    );
  }

  if (displayedAchievements.length === 0) {
    return (
      <Card className={cn('p-4', className)}>
        <Text className="mb-2 text-base font-semibold">Social Badges</Text>
        <Text className="text-center text-sm text-muted-foreground">
          No badges earned yet. Keep engaging to unlock achievements!
        </Text>
      </Card>
    );
  }

  return (
    <Card className={cn('p-4', className)}>
      {/* Header */}
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-base font-semibold">Social Badges</Text>
        <Badge variant="secondary" className="px-2 py-0.5">
          <Text className="text-xs">
            {completedCount}/{totalCount}
          </Text>
        </Badge>
      </View>

      {/* Badges Grid */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 16, paddingVertical: 4 }}>
        {displayedAchievements.map((achievement) => (
          <AchievementBadge
            key={achievement.id}
            achievement={achievement}
            onPress={onBadgePress ? () => onBadgePress(achievement) : undefined}
          />
        ))}
      </ScrollView>

      {/* View all link */}
      {!showAll && achievements.length > (maxBadges || displayedAchievements.length) && (
        <Pressable className="mt-3 items-center">
          <Text className="text-sm text-primary">View all badges →</Text>
        </Pressable>
      )}
    </Card>
  );
}

export default ProfileBadges;
