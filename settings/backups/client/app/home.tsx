import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '@/components/ui/text';
import { FeatureDiscoveryCarousel } from '@/components/navigation/feature-discovery-carousel';
import { FeatureCardData } from '@/components/navigation/feature-card';
import { ScreenWrapper } from '@/components/screen-wrapper';
import { GamificationHeader } from '@/components/gamification/gamification-header';
import { useFeatureDiscovery } from '@/lib/hooks/use-feature-discovery';
import {
  trackCarouselView,
  trackFeatureCardTap,
  trackFeatureConversion,
} from '@/lib/utils/feature-discovery-analytics';
import { trackNavigation } from '@/lib/utils/analytics';

export default function HomeScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  // Use feature discovery hook for data and metrics
  const {
    items: discoveryItems,
    loading,
    error,
    trackView,
    trackFeatureView,
    trackConversion,
    refresh: refreshDiscovery,
  } = useFeatureDiscovery();

  // Track carousel view on mount (SC-002)
  useEffect(() => {
    trackView(); // Hook-level tracking
    trackCarouselView(); // SC-002 analytics tracking
    trackNavigation('home', 'home-screen', { timestamp: Date.now() });
  }, []);

  // Convert discovery items to FeatureCardData format
  const features: FeatureCardData[] = discoveryItems.map((item) => ({
    id: item.id,
    type: item.type as any,
    title: item.title,
    description: item.description,
    icon: getIconForType(item.type),
    actionLabel: getActionLabelForType(item.type),
  }));

  const handleFeaturePress = useCallback(
    (feature: FeatureCardData) => {
      // Track feature view in hook
      trackFeatureView(feature.id);

      // Track feature tap for SC-002 analytics
      trackFeatureCardTap(feature.type);

      // Navigate to feature detail - route mapping
      const routeMap: Record<string, string> = {
        quest: '/(tabs)/quests',
        quests: '/(tabs)/quests',
        course: '/(tabs)/courses',
        courses: '/(tabs)/courses',
        learning: '/(tabs)/courses',
        marketplace: '/marketplace',
        property: '/properties',
        social: '/(tabs)/feed',
        messages: '/(tabs)/messages',
        video: '/(tabs)/videos',
        videos: '/(tabs)/videos',
        live: '/(tabs)/videos',
      };

      const route = routeMap[feature.type];
      if (route) {
        // Track conversion for SC-002 analytics
        trackConversion(feature.id);
        trackFeatureConversion(feature.type);

        // Track navigation event
        trackNavigation('home', route, {
          featureId: feature.id,
          featureType: feature.type,
        });

        router.push(route as any);
      }
    },
    [router, trackFeatureView, trackConversion]
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshDiscovery();
    setRefreshing(false);
  }, [refreshDiscovery]);

  // Helper: Get icon name for feature type
  function getIconForType(type: string): string {
    const iconMap: Record<string, string> = {
      quest: 'trophy',
      quests: 'trophy',
      course: 'book',
      courses: 'book',
      learning: 'book',
      marketplace: 'shopping-bag',
      property: 'home',
      social: 'heart',
      messages: 'message-square',
      video: 'video',
      videos: 'video',
      live: 'radio',
    };
    return iconMap[type] || 'star';
  }

  // Helper: Get action label for feature type
  function getActionLabelForType(type: string): string {
    const labelMap: Record<string, string> = {
      quest: 'Start Quest',
      quests: 'View Quests',
      course: 'Start Course',
      courses: 'Browse Courses',
      learning: 'Start Learning',
      marketplace: 'Browse Marketplace',
      property: 'View Property',
      social: 'View Feed',
      messages: 'Open Messages',
      video: 'Watch Video',
      videos: 'Browse Videos',
      live: 'Watch Live',
    };
    return labelMap[type] || 'View Details';
  }

  return (
    <ScreenWrapper screenName="Home">
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing || loading} onRefresh={handleRefresh} />
        }>
        {/* Gamification Header */}
        <View style={styles.gamificationHeaderContainer}>
          <GamificationHeader />
        </View>

        <View style={styles.header}>
          <Text style={styles.greeting}>Welcome to Quester</Text>
          <Text style={styles.subtitle}>Discover features and track your progress</Text>
        </View>

        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Unable to load featured content</Text>
            <Text style={styles.errorSubtext}>{String(error)}</Text>
          </View>
        ) : (
          <FeatureDiscoveryCarousel features={features} onFeaturePress={handleFeaturePress} />
        )}

        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Your Progress</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>1,234</Text>
              <Text style={styles.statLabel}>Total XP</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>Level 5</Text>
              <Text style={styles.statLabel}>Current Level</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>8</Text>
              <Text style={styles.statLabel}>Badges Earned</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  contentContainer: {
    paddingBottom: 32,
  },
  gamificationHeaderContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  header: {
    padding: 16,
    paddingTop: 24,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: {
    marginHorizontal: 16,
    marginVertical: 24,
    padding: 20,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#991b1b',
    marginBottom: 4,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#dc2626',
  },
  statsSection: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
});
