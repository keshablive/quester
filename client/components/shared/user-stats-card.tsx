import * as React from 'react';
import { View } from 'react-native';
import { Text, Card, Badge, Avatar, AvatarFallback, Progress, Skeleton } from '@/components/ui';
import { cn } from '@/core';
import { Trophy, Target, Zap, TrendingUp, User, Crown, Star } from 'lucide-react-native';
import { useCurrentUser } from '@/core/hooks/queries/useUser';
import { useDashboardStats } from '@/core/hooks/queries/useDashboard';

import { UserStatsCardProps } from './types';

export function UserStatsCard({
  userName,
  userEmail,
  membershipTier,
  level,
  currentXP,
  maxXP,
}: UserStatsCardProps) {
  // Use TanStack Query for cached user and stats data
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();

  // Use props as fallback, then query data, then defaults
  const displayName = userName ?? user?.displayName ?? 'User';
  const displayEmail = userEmail ?? user?.email ?? '';
  const displayTier = membershipTier ?? 'Free';
  const displayLevel = level ?? user?.level ?? 1;
  const displayCurrentXP = currentXP ?? user?.xp ?? 0;
  const displayMaxXP = maxXP ?? displayLevel * 1000;

  const progressPercentage = (displayCurrentXP / displayMaxXP) * 100;

  const userStats = [
    {
      icon: Trophy,
      label: 'Achievements',
      value: '0', // Achievements would come from a dedicated API endpoint
      color: 'text-yellow-600',
      bgColor: 'bg-gradient-to-br from-yellow-500/20 to-yellow-600/10',
      borderColor: 'border-yellow-500/30',
      shadowColor: 'shadow-yellow-500/10',
    },
    {
      icon: Target,
      label: 'Quests',
      value: String(stats?.questsCompleted ?? 0),
      color: 'text-blue-600',
      bgColor: 'bg-gradient-to-br from-blue-500/20 to-blue-600/10',
      borderColor: 'border-blue-500/30',
      shadowColor: 'shadow-blue-500/10',
    },
    {
      icon: Zap,
      label: 'XP',
      value: formatPoints(stats?.totalXp ?? 0),
      color: 'text-purple-600',
      bgColor: 'bg-gradient-to-br from-purple-500/20 to-purple-600/10',
      borderColor: 'border-purple-500/30',
      shadowColor: 'shadow-purple-500/10',
    },
    {
      icon: TrendingUp,
      label: 'Streak',
      value: `${stats?.currentStreak ?? 0}d`,
      color: 'text-green-600',
      bgColor: 'bg-gradient-to-br from-green-500/20 to-green-600/10',
      borderColor: 'border-green-500/30',
      shadowColor: 'shadow-green-500/10',
    },
  ];

  // Loading state
  if (userLoading || statsLoading) {
    return (
      <Card className="overflow-hidden bg-card shadow-lg">
        <View className="items-center px-6 pb-4 pt-6">
          <Skeleton className="mb-3 h-24 w-24 rounded-full" />
          <Skeleton className="mb-2 h-5 w-32" />
          <Skeleton className="h-3 w-40" />
        </View>
        <View className="px-6 py-4">
          <Skeleton className="h-20 w-full rounded-2xl" />
        </View>
        <View className="-mx-1.5 flex-row flex-wrap px-6 pb-6">
          {[1, 2, 3, 4].map((i) => (
            <View key={i} className="mb-3 w-1/2 px-1.5">
              <Skeleton className="h-28 rounded-2xl" />
            </View>
          ))}
        </View>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden bg-card shadow-lg">
      {/* User Profile Section */}
      <View className="from-primary/8 via-primary/4 items-center bg-gradient-to-b to-transparent px-6 pb-4 pt-6">
        <View className="relative mb-3">
          {/* Avatar Glow Effect */}
          <View className="absolute inset-0 rounded-full bg-primary/20 blur-xl" />
          <Avatar alt={displayName} className="h-24 w-24 shadow-xl">
            <AvatarFallback className="bg-gradient-to-br from-primary via-primary/90 to-primary/70">
              <User size={40} className="text-primary-foreground" strokeWidth={2.5} />
            </AvatarFallback>
          </Avatar>
          {/* Online Status with pulse */}
          <View className="absolute bottom-1 right-1">
            <View className="absolute inset-0 animate-ping rounded-full bg-green-500 opacity-75" />
            <View className="relative h-6 w-6 rounded-full border-2 border-card bg-green-500 shadow-lg" />
          </View>
        </View>

        <Text className="text-xl font-bold tracking-tight text-foreground">{displayName}</Text>
        <Text className="mt-1 text-xs text-muted-foreground">{displayEmail}</Text>

        <Badge
          variant="secondary"
          className="mt-3 bg-gradient-to-r from-primary/20 to-primary/10 shadow-sm">
          <Crown size={14} className="mr-1.5 text-primary" strokeWidth={2.5} />
          <Text className="text-xs font-bold tracking-wide text-primary">
            {displayTier.toUpperCase()}
          </Text>
          <Star size={10} className="ml-1 text-primary" strokeWidth={3} fill="currentColor" />
        </Badge>
      </View>

      {/* Level Progress */}
      <View className="px-6 py-4">
        <View className="rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 p-4 shadow-sm">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Level Progress
            </Text>
            <View className="flex-row items-center gap-2">
              <View className="rounded-lg bg-primary/20 px-2 py-1">
                <Text className="text-xs font-black text-primary">{displayLevel}</Text>
              </View>
              <Text className="text-sm font-bold text-foreground">Level {displayLevel}</Text>
            </View>
          </View>
          <Progress value={progressPercentage} className="mb-3 h-2.5" />
          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-medium text-muted-foreground">
              {displayCurrentXP.toLocaleString()} / {displayMaxXP.toLocaleString()} XP
            </Text>
            <Text className="text-xs font-bold text-primary">
              {Math.round(progressPercentage)}%
            </Text>
          </View>
        </View>
      </View>

      {/* Stats Grid */}
      <View className="px-6 pb-6">
        <View className="-mx-1.5 flex-row flex-wrap">
          {userStats.map((stat, index) => (
            <View key={index} className="mb-3 w-1/2 px-1.5">
              <View className={cn('rounded-2xl p-4 shadow-md', stat.bgColor)}>
                <View className="mb-2 flex-row items-center justify-between">
                  <View
                    className={cn(
                      'h-10 w-10 items-center justify-center rounded-xl shadow-sm',
                      stat.bgColor
                    )}>
                    <stat.icon size={20} className={stat.color} strokeWidth={2.5} />
                  </View>
                </View>
                <Text className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {stat.label}
                </Text>
                <Text className="text-2xl font-black tracking-tight text-foreground">
                  {stat.value}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </Card>
  );
}

/**
 * Format points for display (e.g., 1200 -> "1.2K")
 */
function formatPoints(points: number): string {
  if (points >= 1000000) {
    return `${(points / 1000000).toFixed(1)}M`;
  }
  if (points >= 1000) {
    return `${(points / 1000).toFixed(1)}K`;
  }
  return points.toString();
}
