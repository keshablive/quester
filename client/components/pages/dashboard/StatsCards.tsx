import * as React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Text, Card, Icon } from '@/components/ui';
import {
  TrendingUp,
  Users,
  FileText,
  Activity,
  BookOpen,
  Target,
  Trophy,
} from 'lucide-react-native';
import { useDashboardStats } from '@/core/hooks/queries';
import type { StatItem } from './types';

/**
 * StatsCards Component
 *
 * Displays dashboard statistics using cached TanStack Query data.
 * Shows skeleton/loading state on initial fetch, cached data on subsequent visits.
 *
 * US1: Instant Data Display with Background Refresh
 */
export function StatsCards() {
  const { data: stats, isLoading, error } = useDashboardStats();

  // Loading state (only shown on initial load, not cache hits)
  if (isLoading) {
    return (
      <View className="flex-row flex-wrap gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="min-w-[150px] flex-1 p-4">
            <View className="h-20 items-center justify-center">
              <ActivityIndicator size="small" color="#6366F1" />
            </View>
          </Card>
        ))}
      </View>
    );
  }

  // Error state with fallback
  if (error) {
    return (
      <View className="flex-row flex-wrap gap-4">
        <Card className="flex-1 p-4">
          <Text className="text-destructive">Failed to load stats</Text>
        </Card>
      </View>
    );
  }

  // Map API data to display format
  const displayStats: StatItem[] = [
    {
      label: 'XP Earned',
      value: stats?.totalXp?.toLocaleString() ?? '0',
      change: '',
      changeType: 'neutral',
      icon: Trophy,
      color: 'text-amber-500',
    },
    {
      label: 'Courses',
      value: `${stats?.coursesCompleted ?? 0}/${stats?.coursesInProgress ?? 0}`,
      change: '',
      changeType: 'neutral',
      icon: BookOpen,
      color: 'text-primary',
    },
    {
      label: 'Quests',
      value: String(stats?.questsCompleted ?? 0),
      change: '',
      changeType: 'neutral',
      icon: Target,
      color: 'text-blue-500',
    },
    {
      label: 'Streak',
      value: `${stats?.currentStreak ?? 0} days`,
      change: stats?.longestStreak ? `Best: ${stats.longestStreak}` : '',
      changeType: 'neutral',
      icon: Activity,
      color: 'text-orange-500',
    },
  ];

  return (
    <View className="flex-row flex-wrap gap-4">
      {displayStats.map((stat, index) => (
        <Card key={index} className="min-w-[150px] flex-1 p-4">
          <View className="flex-row items-center justify-between">
            <Icon as={stat.icon} className="text-primary" size={20} />
            {stat.change && (
              <Text
                className={
                  stat.changeType === 'increase'
                    ? 'text-xs text-green-500'
                    : stat.changeType === 'decrease'
                      ? 'text-xs text-orange-500'
                      : 'text-xs text-muted-foreground'
                }>
                {stat.change}
              </Text>
            )}
          </View>
          <Text className="mt-2 text-2xl font-bold">{stat.value}</Text>
          <Text className="text-sm text-muted-foreground">{stat.label}</Text>
        </Card>
      ))}
    </View>
  );
}
