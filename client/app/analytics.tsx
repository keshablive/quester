import { useState, lazy, Suspense } from 'react';
import { View, ScrollView } from 'react-native';
import { Tabs, TabsList, TabsTrigger, TabsContent, Text, Card } from '@/components/ui';
import { ChunkErrorBoundary, PageLoadingFallback, useSocialLeaderboard, useSocialXP } from '@/core';

// US3: Lazy load heavy analytics components for faster app launch
const AnalyticsHeader = lazy(() =>
  import('@/components/features/analytics').then((m) => ({ default: m.AnalyticsHeader }))
);
const KeyMetrics = lazy(() =>
  import('@/components/features/analytics').then((m) => ({ default: m.KeyMetrics }))
);
const TrafficOverview = lazy(() =>
  import('@/components/features/analytics').then((m) => ({ default: m.TrafficOverview }))
);
const TopPages = lazy(() =>
  import('@/components/features/analytics').then((m) => ({ default: m.TopPages }))
);
const Demographics = lazy(() =>
  import('@/components/features/analytics').then((m) => ({ default: m.Demographics }))
);
const SocialLeaderboardWidget = lazy(() =>
  import('@/components/features/communicate/Social').then((m) => ({
    default: m.SocialLeaderboardWidget,
  }))
);

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState('overview');

  // T063: Social leaderboard data
  const {
    entries: allTimeEntries,
    userPosition: allTimePosition,
    loading: allTimeLoading,
  } = useSocialLeaderboard({
    period: 'alltime',
    limit: 20,
    fetchOnMount: activeTab === 'social',
  });

  const {
    entries: monthlyEntries,
    userPosition: monthlyPosition,
    loading: monthlyLoading,
  } = useSocialLeaderboard({
    period: 'monthly',
    limit: 20,
    fetchOnMount: activeTab === 'social',
  });

  const { summary } = useSocialXP();

  return (
    <ChunkErrorBoundary
      maxRetries={3}
      onError={(error) => console.error('Analytics chunk load failed:', error)}>
      <View className="flex-1">
        <Suspense fallback={<PageLoadingFallback message="Loading analytics..." />}>
          <View className="p-6 pb-4">
            <AnalyticsHeader />
          </View>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
            <TabsList className="mx-6 mb-4">
              <TabsTrigger value="overview" className="flex-1">
                <Text>Overview</Text>
              </TabsTrigger>
              <TabsTrigger value="traffic" className="flex-1">
                <Text>Traffic</Text>
              </TabsTrigger>
              <TabsTrigger value="demographics" className="flex-1">
                <Text>Demographics</Text>
              </TabsTrigger>
              <TabsTrigger value="social" className="flex-1">
                <Text>Social</Text>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="flex-1">
              <ScrollView className="flex-1">
                <View className="gap-6 p-6">
                  <KeyMetrics />
                  <TrafficOverview />
                  <TopPages />
                </View>
              </ScrollView>
            </TabsContent>

            <TabsContent value="traffic" className="flex-1">
              <ScrollView className="flex-1">
                <View className="gap-6 p-6">
                  <TrafficOverview />
                  <TopPages />
                </View>
              </ScrollView>
            </TabsContent>

            <TabsContent value="demographics" className="flex-1">
              <ScrollView className="flex-1">
                <View className="p-6">
                  <Demographics />
                </View>
              </ScrollView>
            </TabsContent>

            {/* T063: Social leaderboard tab */}
            <TabsContent value="social" className="flex-1">
              <ScrollView className="flex-1">
                <View className="gap-6 p-6">
                  {/* User's social stats card */}
                  <Card className="p-4">
                    <Text className="mb-3 text-lg font-semibold">Your Social Stats</Text>
                    <View className="flex-row flex-wrap gap-4">
                      <View className="items-center">
                        <Text className="text-2xl font-bold text-primary">
                          {summary?.totalSocialXP || 0}
                        </Text>
                        <Text className="text-sm text-muted-foreground">Total XP</Text>
                      </View>
                      <View className="items-center">
                        <Text className="text-2xl font-bold">{summary?.postsCreated || 0}</Text>
                        <Text className="text-sm text-muted-foreground">Posts</Text>
                      </View>
                      <View className="items-center">
                        <Text className="text-2xl font-bold">{summary?.likesGivenCount || 0}</Text>
                        <Text className="text-sm text-muted-foreground">Likes Given</Text>
                      </View>
                      <View className="items-center">
                        <Text className="text-2xl font-bold">{summary?.commentsCount || 0}</Text>
                        <Text className="text-sm text-muted-foreground">Comments</Text>
                      </View>
                    </View>
                  </Card>

                  {/* All-time leaderboard */}
                  <SocialLeaderboardWidget
                    entries={allTimeEntries}
                    userPosition={allTimePosition}
                    period="alltime"
                    loading={allTimeLoading}
                    maxEntries={20}
                  />

                  {/* Monthly leaderboard */}
                  <SocialLeaderboardWidget
                    entries={monthlyEntries}
                    userPosition={monthlyPosition}
                    period="monthly"
                    loading={monthlyLoading}
                    maxEntries={20}
                  />
                </View>
              </ScrollView>
            </TabsContent>
          </Tabs>
        </Suspense>
      </View>
    </ChunkErrorBoundary>
  );
}
