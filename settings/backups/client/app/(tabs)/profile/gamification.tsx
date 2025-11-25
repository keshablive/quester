import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { ScreenWrapper } from '@/components/screen-wrapper';
import { Text } from '@/components/ui/text';
import { GamificationHeader } from '@/components/gamification/gamification-header';
import { LeaderboardWidget } from '@/components/gamification/leaderboard-widget';
import { useLeaderboard } from '@/lib/hooks/use-leaderboard';

export default function GamificationDashboardScreen() {
  // useLeaderboard provides data, loading, error, helpers
  const { data, loading, error, refresh, getTopUsers, getCurrentUserRank } = useLeaderboard({
    autoFetch: true,
    realTime: true,
  });

  const topUsers = typeof getTopUsers === 'function' ? getTopUsers(10) : data || [];
  const currentUserRank =
    typeof getCurrentUserRank === 'function' ? getCurrentUserRank() : undefined;

  return (
    <ScreenWrapper screenName="GamificationDashboard">
      <ScrollView contentContainerStyle={styles.container} removeClippedSubviews>
        <View style={styles.headerWrapper}>
          <GamificationHeader />
        </View>

        <View style={styles.section}>
          <Text variant="h2">Your Progress</Text>
          <Text variant="muted" className="mt-2">
            View your current level, XP and recently unlocked badges. Progress updates in real-time.
          </Text>
        </View>

        <View style={styles.section}>
          <Text variant="h3">Leaderboard</Text>
          <LeaderboardWidget
            data={topUsers}
            currentUserId=""
            loading={loading}
            error={String(error || '')}
            onRefresh={refresh}
            showFilters
            maxUsers={10}
          />
          {currentUserRank != null && (
            <View style={styles.rankCard}>
              <Text>Your Rank: #{String(currentUserRank)}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text variant="h3">Recent Activity</Text>
          <Text variant="muted" className="mt-2">
            Recent XP gains, level-ups and badge unlocks will appear here.
          </Text>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  headerWrapper: {
    paddingHorizontal: 0,
    paddingVertical: 8,
  },
  section: {
    marginTop: 16,
    marginBottom: 8,
  },
  rankCard: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
});
