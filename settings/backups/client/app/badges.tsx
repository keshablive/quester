import { BadgeCard, type BadgeData } from '@/components/gamification/badge-card';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useBadges, useUserBadges } from '@/lib/hooks/useBadges';
import type { Badge, UserBadge } from '@/lib/api/badges';
import { Stack } from 'expo-router';
import { SearchIcon, XIcon, TrophyIcon, LockIcon, CheckCircleIcon } from 'lucide-react-native';
import { View, ScrollView, Modal, ActivityIndicator, RefreshControl } from 'react-native';
import { ScreenWrapper } from '@/components/screen-wrapper';

// Mapper functions to convert API types to component types
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

type TabType = 'all' | 'earned' | 'available';

type BadgeDetailModalProps = {
  visible: boolean;
  badge: Badge | null;
  userBadge?: UserBadge;
  onClose: () => void;
};

function BadgeDetailModal({ visible, badge, userBadge, onClose }: BadgeDetailModalProps) {
  if (!badge) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Button
        variant="ghost"
        className="flex-1 items-center justify-center bg-black/50 p-4"
        onPress={onClose}>
        <View className="w-full max-w-md rounded-2xl bg-background p-6">
          <View className="mb-4 items-end">
            <Button variant="ghost" size="icon" onPress={onClose}>
              <Icon as={XIcon} className="text-foreground" />
            </Button>
          </View>

          <View className="mb-6 items-center">
            <BadgeCard badge={mapBadgeToBadgeData(badge, userBadge)} size="large" />
          </View>

          <View className="gap-4">
            <View>
              <Text className="mb-1 text-sm font-semibold text-muted-foreground">Description</Text>
              <Text className="text-base">{badge.description}</Text>
            </View>

            <View className="flex-row gap-4">
              <View className="flex-1">
                <Text className="mb-1 text-sm font-semibold text-muted-foreground">Points</Text>
                <Text className="text-base">{badge.points_threshold}</Text>
              </View>

              <View className="flex-1">
                <Text className="mb-1 text-sm font-semibold text-muted-foreground">Tier</Text>
                <Text className="text-base capitalize">{badge.tier}</Text>
              </View>
            </View>

            {badge.category && (
              <View>
                <Text className="mb-1 text-sm font-semibold text-muted-foreground">Category</Text>
                <Text className="text-base capitalize">{badge.category}</Text>
              </View>
            )}

            {userBadge && (
              <>
                {userBadge.earned_at && (
                  <View>
                    <Text className="mb-1 text-sm font-semibold text-muted-foreground">
                      Earned On
                    </Text>
                    <Text className="text-base">
                      {new Date(userBadge.earned_at).toLocaleDateString()}
                    </Text>
                  </View>
                )}

                {userBadge.approval_status && userBadge.approval_status !== 'approved' && (
                  <View>
                    <Text className="mb-1 text-sm font-semibold text-muted-foreground">Status</Text>
                    <Text className="text-base capitalize">{userBadge.approval_status}</Text>
                  </View>
                )}
              </>
            )}
          </View>

          <Button onPress={onClose} className="mt-6">
            <Text>Close</Text>
          </Button>
        </View>
      </Button>
    </Modal>
  );
}

export default function BadgesScreen() {
  const [activeTab, setActiveTab] = React.useState<TabType>('all');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedBadge, setSelectedBadge] = React.useState<{
    badge: Badge;
    userBadge?: UserBadge;
  } | null>(null);

  // Fetch all badges
  const {
    data: allBadgesData,
    isLoading: allBadgesLoading,
    refetch: refetchAllBadges,
  } = useBadges({
    filters: {},
  });

  // Fetch user's earned badges (assuming userId is available, e.g., from auth context)
  // TODO: Get userId from auth context
  const userId = '1'; // Placeholder - replace with actual user ID from auth
  const {
    data: earnedBadgesData,
    isLoading: earnedBadgesLoading,
    refetch: refetchEarnedBadges,
  } = useUserBadges({
    userId,
    filters: { status: 'approved' },
  });

  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      if (activeTab === 'all' || activeTab === 'available') {
        await refetchAllBadges();
      }
      if (activeTab === 'earned') {
        await refetchEarnedBadges();
      }
    } finally {
      setRefreshing(false);
    }
  }, [activeTab, refetchAllBadges, refetchEarnedBadges]);

  // Filter badges based on search and tab
  const filteredBadges = React.useMemo(() => {
    let badges: Badge[] = [];
    let userBadges: UserBadge[] = [];

    if (activeTab === 'all') {
      badges = allBadgesData?.data.badges || [];
    } else if (activeTab === 'earned') {
      userBadges = earnedBadgesData?.data.badges || [];
      badges = userBadges
        .map((ub) => ub.badge)
        .filter((badge): badge is Badge => badge !== undefined);
    } else if (activeTab === 'available') {
      const allBadges = allBadgesData?.data.badges || [];
      const earnedBadgeIds = new Set(
        (earnedBadgesData?.data.badges || []).map((ub: UserBadge) => ub.badge_id)
      );
      badges = allBadges.filter((badge: Badge) => !earnedBadgeIds.has(badge.id));
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      badges = badges.filter(
        (badge) =>
          badge.name.toLowerCase().includes(query) ||
          badge.description.toLowerCase().includes(query)
      );
    }

    return { badges, userBadges };
  }, [activeTab, searchQuery, allBadgesData, earnedBadgesData]);

  const handleBadgePress = (badge: Badge, userBadge?: UserBadge) => {
    setSelectedBadge({ badge, userBadge });
  };

  const isLoading = allBadgesLoading || earnedBadgesLoading;

  const tabConfig: Array<{ key: TabType; label: string; icon: any }> = [
    { key: 'all', label: 'All Badges', icon: TrophyIcon },
    { key: 'earned', label: 'Earned', icon: CheckCircleIcon },
    { key: 'available', label: 'Available', icon: LockIcon },
  ];

  return (
    <ScreenWrapper screenName="Badges">
      <Stack.Screen
        options={{
          title: 'Badges',
          headerLargeTitle: true,
        }}
      />

      <ScrollView
        className="flex-1 bg-background"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
        {/* Search Bar */}
        <View className="px-4 pb-2 pt-4">
          <View className="relative">
            <Icon
              as={SearchIcon}
              className="absolute left-3 top-3 z-10 text-muted-foreground"
              size={20}
            />
            <Input
              placeholder="Search badges..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="pl-10"
            />
          </View>
        </View>

        {/* Tab Navigation */}
        <View className="flex-row gap-2 px-4 py-3">
          {tabConfig.map((tab) => (
            <Button
              key={tab.key}
              variant="ghost"
              onPress={() => setActiveTab(tab.key)}
              className={`flex-1 flex-row items-center justify-center gap-2 rounded-lg px-4 py-3 ${
                activeTab === tab.key ? 'bg-primary' : 'bg-secondary'
              }`}>
              <Icon
                as={tab.icon}
                className={activeTab === tab.key ? 'text-primary-foreground' : 'text-foreground'}
                size={18}
              />
              <Text
                className={`text-sm font-semibold ${
                  activeTab === tab.key ? 'text-primary-foreground' : 'text-foreground'
                }`}>
                {tab.label}
              </Text>
            </Button>
          ))}
        </View>

        {/* Badge Stats */}
        {activeTab === 'earned' && earnedBadgesData && (
          <View className="mx-4 my-2 rounded-lg bg-secondary px-4 py-3">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 items-center">
                <Text className="text-2xl font-bold">{earnedBadgesData.data.badges.length}</Text>
                <Text className="text-xs text-muted-foreground">Total Earned</Text>
              </View>
              <View className="flex-1 items-center">
                <Text className="text-2xl font-bold">
                  {earnedBadgesData.data.badges.reduce(
                    (sum: number, ub: UserBadge) => sum + (ub.badge?.points_threshold || 0),
                    0
                  )}
                </Text>
                <Text className="text-xs text-muted-foreground">Total Points</Text>
              </View>
              <View className="flex-1 items-center">
                <Text className="text-2xl font-bold capitalize">
                  {earnedBadgesData.data.badges[0]?.badge?.tier || 'N/A'}
                </Text>
                <Text className="text-xs text-muted-foreground">Highest Tier</Text>
              </View>
            </View>
          </View>
        )}

        {/* Loading State */}
        {isLoading && !refreshing && (
          <View className="flex-1 items-center justify-center py-12">
            <ActivityIndicator size="large" />
            <Text className="mt-4 text-muted-foreground">Loading badges...</Text>
          </View>
        )}

        {/* Badge Grid */}
        {!isLoading && (
          <View className="px-4 py-2">
            {filteredBadges.badges.length === 0 ? (
              <View className="items-center justify-center py-12">
                <Icon
                  as={activeTab === 'available' ? LockIcon : TrophyIcon}
                  className="mb-4 text-muted-foreground"
                  size={48}
                />
                <Text className="mb-2 text-lg font-semibold">
                  {activeTab === 'all' && 'No badges available'}
                  {activeTab === 'earned' && 'No badges earned yet'}
                  {activeTab === 'available' && 'All badges earned!'}
                </Text>
                <Text className="text-center text-muted-foreground">
                  {activeTab === 'all' && 'Check back later for new badges'}
                  {activeTab === 'earned' && 'Complete quests to earn your first badge'}
                  {activeTab === 'available' && 'Congratulations on earning all available badges!'}
                </Text>
              </View>
            ) : (
              <View className="flex-row flex-wrap gap-3">
                {filteredBadges.badges.map((badge, _index) => {
                  const userBadge = filteredBadges.userBadges.find(
                    (ub) => ub.badge_id === badge.id
                  );
                  return (
                    <View key={badge.id} className="w-[48%]">
                      <BadgeCard
                        badge={mapBadgeToBadgeData(badge, userBadge)}
                        size="medium"
                        onPress={() => handleBadgePress(badge, userBadge)}
                      />
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Badge Detail Modal */}
      <BadgeDetailModal
        visible={!!selectedBadge}
        badge={selectedBadge?.badge || null}
        userBadge={selectedBadge?.userBadge}
        onClose={() => setSelectedBadge(null)}
      />
    </ScreenWrapper>
  );
}
