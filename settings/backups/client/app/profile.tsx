/**
 * Profile Screen - P1 Screen Migration (Phase 4)
 *
 * React Native Reusables compliance:
 * - FR-001: Button with Text wrapping pattern
 * - FR-006 to FR-010: Accessibility props (roles, labels, hints, state)
 * - FR-016: ScrollView optimization (removeClippedSubviews)
 * - FR-025: Performance monitoring (useScreenPerformanceMetrics)
 * - FR-028 to FR-030: Error boundary via ScreenWrapper
 *
 * WCAG 2.1 Level AA compliance:
 * - 4.1.2 Name, Role, Value: All interactive elements have roles
 * - 3.3.2 Labels or Instructions: All controls have labels
 * - 1.4.3 Contrast: Component library enforces contrast ratios
 */

import { BadgeCard, type BadgeData } from '@/components/gamification/badge-card';
import { ScreenWrapper } from '@/components/screen-wrapper';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Separator } from '@/components/ui/separator';
import { useUserBadges } from '@/lib/hooks/useBadges';
import { useScreenPerformanceMetrics } from '@/lib/hooks/use-performance-metrics';
import { useEnhancedPerformanceMonitor } from '@/lib/hooks/use-performance-monitor';
import type { Badge, UserBadge } from '@/lib/api/badges';
import { Stack, useRouter } from 'expo-router';
import {
  TrophyIcon,
  ChevronRightIcon,
  UserIcon,
  MailIcon,
  AwardIcon,
  TrendingUpIcon,
} from 'lucide-react-native';
import * as React from 'react';
import { View, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';

// Mapper function to convert API types to component types
function mapBadgeToBadgeData(badge: Badge, userBadge?: UserBadge): BadgeData {
  return {
    id: badge.id,
    name: badge.name,
    description: badge.description,
    iconUrl: badge.icon_url,
    tier: badge.tier,
    pointsThreshold: badge.points_threshold,
    autoAward: badge.auto_award,
    category: badge.category,
    earnedAt: userBadge?.earned_at,
    approvalStatus: userBadge?.approval_status,
    approvedAt: userBadge?.approved_at,
    approvedBy: userBadge?.approved_by,
  };
}

export default function ProfileScreen() {
  // Performance monitoring (FR-025, T124-T130)
  useScreenPerformanceMetrics('ProfileScreen');
  const { metrics: _fpsMetrics } = useEnhancedPerformanceMonitor('ProfileScreen');

  const router = useRouter();

  // TODO: Get actual user data from auth context
  const userId = '1'; // Placeholder
  const userName = 'John Doe'; // Placeholder
  const userEmail = 'john.doe@example.com'; // Placeholder
  const userXP = 1250; // Placeholder
  const userLevel = 5; // Placeholder

  const {
    data: badgesData,
    isLoading: badgesLoading,
    refetch: refetchBadges,
  } = useUserBadges({
    userId,
    filters: { status: 'approved' },
    limit: 5,
    sort: 'earnedAt',
    order: 'desc',
  });

  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await refetchBadges();
    } finally {
      setRefreshing(false);
    }
  }, [refetchBadges]);

  const handleViewAllBadges = React.useCallback(() => {
    router.push('/badges');
  }, [router]);

  // Sort badges by tier (platinum > gold > silver > bronze) then by date
  const sortedBadges = React.useMemo(() => {
    if (!badgesData?.data.badges) return [];

    const tierOrder = { platinum: 4, gold: 3, silver: 2, bronze: 1 };

    return [...badgesData.data.badges]
      .filter((ub) => ub.badge) // Filter out any without badge data
      .sort((a, b) => {
        const tierDiff =
          (tierOrder[b.badge!.tier as keyof typeof tierOrder] || 0) -
          (tierOrder[a.badge!.tier as keyof typeof tierOrder] || 0);
        if (tierDiff !== 0) return tierDiff;

        // Sort by earned date if tiers are equal
        const dateA = new Date(a.earned_at || 0).getTime();
        const dateB = new Date(b.earned_at || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 5);
  }, [badgesData]);

  const totalPoints = React.useMemo(() => {
    if (!badgesData?.data.badges) return 0;
    return badgesData.data.badges.reduce(
      (sum: number, ub) => sum + (ub.badge?.points_threshold || 0),
      0
    );
  }, [badgesData]);

  const highestTier = React.useMemo(() => {
    if (!sortedBadges.length) return 'None';
    return sortedBadges[0].badge?.tier || 'None';
  }, [sortedBadges]);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Profile',
          headerLargeTitle: true,
        }}
      />

      <ScreenWrapper screenName="ProfileScreen">
        <ScrollView
          className="flex-1 bg-background"
          removeClippedSubviews
          accessibilityRole="scrollbar"
          accessibilityLabel="Profile content"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              accessibilityLabel="Pull to refresh profile"
            />
          }>
          {/* User Info Card */}
          <View className="p-4">
            <Card>
              <CardHeader>
                <View
                  className="flex-row items-center gap-4"
                  accessibilityRole="header"
                  accessibilityLabel={`User profile for ${userName}`}>
                  <View
                    className="h-16 w-16 items-center justify-center rounded-full bg-primary"
                    accessibilityRole="image"
                    accessibilityLabel="User avatar">
                    <Icon as={UserIcon} className="text-primary-foreground" size={32} />
                  </View>
                  <View className="flex-1">
                    <CardTitle>{userName}</CardTitle>
                    <CardDescription className="mt-1 flex-row items-center gap-1">
                      <Icon
                        as={MailIcon}
                        size={14}
                        className="text-muted-foreground"
                        accessibilityLabel="Email"
                      />
                      <Text className="text-sm text-muted-foreground">{userEmail}</Text>
                    </CardDescription>
                  </View>
                </View>
              </CardHeader>

              <CardContent>
                <View
                  className="flex-row justify-around py-3"
                  accessibilityRole="summary"
                  accessibilityLabel={`User statistics: Level ${userLevel}, ${userXP} XP, ${badgesData?.data.badges.length || 0} badges earned`}>
                  <View className="items-center">
                    <Text className="text-2xl font-bold">{userLevel}</Text>
                    <Text className="text-xs text-muted-foreground">Level</Text>
                  </View>
                  <Separator orientation="vertical" className="h-12" />
                  <View className="items-center">
                    <Text className="text-2xl font-bold">{userXP}</Text>
                    <Text className="text-xs text-muted-foreground">XP</Text>
                  </View>
                  <Separator orientation="vertical" className="h-12" />
                  <View className="items-center">
                    <Text className="text-2xl font-bold">
                      {badgesData?.data.badges.length || 0}
                    </Text>
                    <Text className="text-xs text-muted-foreground">Badges</Text>
                  </View>
                </View>
              </CardContent>
            </Card>
          </View>

          {/* Badges Showcase Section */}
          <View className="px-4 pb-4">
            <Card>
              <CardHeader>
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <Icon as={TrophyIcon} className="text-primary" size={24} />
                    <CardTitle>My Badges</CardTitle>
                  </View>
                  <Button
                    variant="ghost"
                    size="sm"
                    onPress={handleViewAllBadges}
                    accessibilityRole="button"
                    accessibilityLabel="View all badges"
                    accessibilityHint="Opens the full badges list">
                    <Text className="text-sm">View All</Text>
                    <Icon as={ChevronRightIcon} size={16} />
                  </Button>
                </View>
                {!badgesLoading && badgesData && (
                  <CardDescription>
                    {badgesData.data.badges.length} earned • {totalPoints} points • Highest:{' '}
                    <Text className="font-semibold capitalize">{highestTier}</Text>
                  </CardDescription>
                )}
              </CardHeader>

              <CardContent>
                {badgesLoading ? (
                  <View
                    className="items-center justify-center py-8"
                    accessibilityRole="progressbar"
                    accessibilityLabel="Loading badges"
                    accessibilityLiveRegion="polite">
                    <ActivityIndicator size="large" />
                    <Text variant="muted" className="mt-2">
                      Loading badges...
                    </Text>
                  </View>
                ) : sortedBadges.length === 0 ? (
                  <View
                    className="items-center justify-center py-8"
                    accessibilityRole="text"
                    accessibilityLabel="No badges earned yet. Complete quests and challenges to earn your first badge">
                    <Icon
                      as={AwardIcon}
                      className="mb-3 text-muted-foreground"
                      size={48}
                      accessibilityLabel="Badge icon"
                    />
                    <Text variant="h3" className="mb-1">
                      No badges yet
                    </Text>
                    <Text variant="muted" className="mb-4 text-center">
                      Complete quests and challenges to earn your first badge!
                    </Text>
                    <Button
                      onPress={handleViewAllBadges}
                      variant="outline"
                      size="sm"
                      accessibilityRole="button"
                      accessibilityLabel="Browse available badges">
                      <Text>Browse Available Badges</Text>
                    </Button>
                  </View>
                ) : (
                  <>
                    <View
                      className="flex-row flex-wrap gap-3"
                      accessibilityRole="list"
                      accessibilityLabel={`${sortedBadges.length} earned badges displayed`}>
                      {sortedBadges.map((userBadge) => (
                        <View key={userBadge.id} className="w-[30%]">
                          <BadgeCard
                            badge={
                              userBadge.badge
                                ? mapBadgeToBadgeData(userBadge.badge, userBadge)
                                : ({} as BadgeData)
                            }
                            size="small"
                            onPress={() => router.push('/badges')}
                          />
                        </View>
                      ))}
                    </View>

                    {badgesData && badgesData.data.badges.length > 5 && (
                      <View className="mt-4">
                        <Button
                          onPress={handleViewAllBadges}
                          variant="outline"
                          size="sm"
                          accessibilityRole="button"
                          accessibilityLabel={`View all ${badgesData.data.badges.length} badges`}
                          accessibilityHint="Opens the full badges list">
                          <Text>View All {badgesData.data.badges.length} Badges</Text>
                          <Icon as={ChevronRightIcon} size={16} />
                        </Button>
                      </View>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </View>

          {/* Stats Card */}
          <View className="px-4 pb-4">
            <Card>
              <CardHeader>
                <View
                  className="flex-row items-center gap-2"
                  accessibilityRole="header"
                  accessibilityLabel="Badge statistics">
                  <Icon
                    as={TrendingUpIcon}
                    className="text-primary"
                    size={24}
                    accessibilityLabel="Statistics icon"
                  />
                  <CardTitle>Statistics</CardTitle>
                </View>
              </CardHeader>

              <CardContent>
                <View
                  className="gap-3"
                  accessibilityRole="summary"
                  accessibilityLabel={`Statistics: ${totalPoints} total badge points, ${badgesData?.data.badges.length || 0} badges earned, highest tier is ${highestTier}`}>
                  <View className="flex-row items-center justify-between py-2">
                    <Text variant="muted">Total Badge Points</Text>
                    <Text className="text-lg font-semibold">{totalPoints}</Text>
                  </View>
                  <Separator />
                  <View className="flex-row items-center justify-between py-2">
                    <Text variant="muted">Badges Earned</Text>
                    <Text className="text-lg font-semibold">
                      {badgesData?.data.badges.length || 0}
                    </Text>
                  </View>
                  <Separator />
                  <View className="flex-row items-center justify-between py-2">
                    <Text variant="muted">Highest Badge Tier</Text>
                    <Text className="text-lg font-semibold capitalize">{highestTier}</Text>
                  </View>
                </View>
              </CardContent>
            </Card>
          </View>

          {/* Settings/Actions placeholder */}
          <View className="px-4 pb-8">
            <Card>
              <CardHeader>
                <CardTitle>Account</CardTitle>
              </CardHeader>
              <CardContent>
                <View className="gap-2">
                  <Button
                    variant="outline"
                    accessibilityRole="button"
                    accessibilityLabel="Edit profile">
                    <Text>Edit Profile</Text>
                  </Button>
                  <Button
                    variant="outline"
                    accessibilityRole="button"
                    accessibilityLabel="Open settings">
                    <Text>Settings</Text>
                  </Button>
                  <Button
                    variant="destructive"
                    accessibilityRole="button"
                    accessibilityLabel="Sign out"
                    accessibilityHint="Logs you out of your account">
                    <Text>Sign Out</Text>
                  </Button>
                </View>
              </CardContent>
            </Card>
          </View>
        </ScrollView>
      </ScreenWrapper>
    </>
  );
}
