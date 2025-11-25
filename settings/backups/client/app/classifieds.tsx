import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from 'react-native';
import { Stack } from 'expo-router';
import { Search, X, TrendingUp, Clock } from 'lucide-react-native';
import {
  searchClassifiedAds,
  getRecentClassifiedAds,
  getPopularClassifiedAds,
  ClassifiedAdWithDistance,
  ClassifiedAdSearchParams,
} from '@/lib/api/classifieds';
import { useGeolocation } from '@/lib/hooks/useGeolocation';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ScreenWrapper } from '@/components/screen-wrapper';

type AdType = 'job' | 'service' | 'item' | 'housing' | 'event';

interface ClassifiedCardProps {
  ad: ClassifiedAdWithDistance['ad'];
  distance?: number;
  onPress: () => void;
}

const ClassifiedCard: React.FC<ClassifiedCardProps> = ({ ad, distance, onPress }) => {
  const formatPrice = (price?: number) => {
    if (!price) return 'Contact for price';
    return `$${price.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const getTypeColor = (type: string) => {
    const colors = {
      job: 'bg-blue-100 text-blue-700',
      service: 'bg-purple-100 text-purple-700',
      item: 'bg-green-100 text-green-700',
      housing: 'bg-orange-100 text-orange-700',
      event: 'bg-pink-100 text-pink-700',
    };
    return colors[type as AdType] || 'bg-gray-100 text-gray-700';
  };

  return (
    <Button
      variant="ghost"
      onPress={onPress}
      className="mx-4 mb-3 rounded-lg border border-border bg-card p-4">
      <View className="mb-2 flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="mb-1 text-lg font-semibold text-foreground" numberOfLines={2}>
            {ad.title}
          </Text>
          {ad.price && (
            <Text className="text-xl font-bold text-primary">{formatPrice(ad.price)}</Text>
          )}
        </View>
        <View className={`rounded-full px-2 py-1 ${getTypeColor(ad.ad_type)}`}>
          <Text className="text-xs font-medium capitalize">{ad.ad_type}</Text>
        </View>
      </View>

      <Text className="mb-3 text-muted-foreground" numberOfLines={2}>
        {ad.description}
      </Text>

      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center space-x-4">
          {ad.location && distance && (
            <Text className="text-sm text-muted-foreground">
              {distance < 1000 ? `${distance}m away` : `${(distance / 1000).toFixed(1)}km away`}
            </Text>
          )}
          <Text className="text-sm text-muted-foreground">{formatDate(ad.created_at)}</Text>
        </View>
        {ad.tags && ad.tags.length > 0 && (
          <View className="flex-row space-x-1">
            {ad.tags.slice(0, 2).map((tag, index) => (
              <View key={index} className="rounded bg-muted px-2 py-0.5">
                <Text className="text-xs text-muted-foreground">#{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </Button>
  );
};

export default function ClassifiedsScreen() {
  const [selectedType, setSelectedType] = useState<AdType | 'all'>('all');
  const [ads, setAds] = useState<ClassifiedAdWithDistance[]>([]);
  const [recentAds, setRecentAds] = useState<ClassifiedAdWithDistance['ad'][]>([]);
  const [popularAds, setPopularAds] = useState<ClassifiedAdWithDistance['ad'][]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const { coords } = useGeolocation();

  const adTypes: { value: AdType | 'all'; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'job', label: 'Jobs' },
    { value: 'service', label: 'Services' },
    { value: 'item', label: 'Items' },
    { value: 'housing', label: 'Housing' },
    { value: 'event', label: 'Events' },
  ];

  const loadAds = useCallback(
    async (pageNum: number = 1, append: boolean = false) => {
      try {
        if (!append) {
          setLoading(true);
        }

        const params: ClassifiedAdSearchParams = {
          page: pageNum,
          limit: 20,
        };

        if (selectedType !== 'all') {
          params.ad_type = selectedType;
        }

        if (searchQuery) {
          params.keywords = searchQuery;
        }

        if (coords) {
          params.latitude = coords.latitude;
          params.longitude = coords.longitude;
          params.radius = 50000; // 50km
        }

        const response = await searchClassifiedAds(params);

        if (append) {
          setAds((prev) => [...prev, ...response.ads]);
        } else {
          setAds(response.ads);
        }

        setHasMore(response.ads.length === 20);
        setPage(pageNum);
      } catch (error) {
        console.error('Failed to load ads:', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [coords, selectedType, searchQuery]
  );

  const loadFeaturedAds = useCallback(async () => {
    try {
      const [recent, popular] = await Promise.all([
        getRecentClassifiedAds(5),
        getPopularClassifiedAds(5),
      ]);
      setRecentAds(recent);
      setPopularAds(popular);
    } catch (error) {
      console.error('Failed to load featured ads:', error);
    }
  }, []);

  useEffect(() => {
    loadAds(1, false);
  }, [selectedType, searchQuery]);

  useEffect(() => {
    if (selectedType === 'all') {
      loadFeaturedAds();
    }
  }, [selectedType]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadAds(1, false);
    if (selectedType === 'all') {
      loadFeaturedAds();
    }
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadAds(page + 1, true);
    }
  };

  const handleAdPress = (adId: string | number) => {
    // Normalize id to string when navigating
    const idStr = String(adId);
    // TODO: Navigate to ad detail screen
    console.log('Navigate to ad:', idStr);
  };

  const renderHeader = () => (
    <View>
      {/* Search Bar */}
      <View className="border-b border-border bg-background p-4">
        <View className="flex-row items-center rounded-lg bg-muted px-3 py-2">
          <Search size={20} color="#6B7280" />
          <TextInput
            placeholder="Search classifieds..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="ml-2 flex-1 text-base text-foreground"
          />
          {searchQuery && (
            <Button variant="ghost" size="icon" onPress={() => setSearchQuery('')}>
              <X size={20} color="#6B7280" />
            </Button>
          )}
        </View>
      </View>

      {/* Category Tabs */}
      <View className="border-b border-border bg-background">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="px-2 py-3"
          contentContainerClassName="space-x-2">
          {adTypes.map((type) => (
            <Button
              key={type.value}
              variant="ghost"
              onPress={() => setSelectedType(type.value)}
              className={`rounded-full px-4 py-2 ${
                selectedType === type.value ? 'bg-primary' : 'border border-border bg-muted'
              }`}>
              <Text
                className={`font-medium ${
                  selectedType === type.value ? 'text-primary-foreground' : 'text-foreground'
                }`}>
                {type.label}
              </Text>
            </Button>
          ))}
        </ScrollView>
      </View>

      {/* Featured Sections (only on 'all' tab) */}
      {selectedType === 'all' && (
        <>
          {/* Recent Ads */}
          {recentAds.length > 0 && (
            <View className="border-b border-border bg-background py-4">
              <View className="mb-3 flex-row items-center px-4">
                <Clock size={20} color="#3B82F6" />
                <Text className="ml-2 text-lg font-semibold text-foreground">Recently Posted</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-2">
                {recentAds.map((ad) => (
                  <View key={ad.id} className="mr-3 w-64">
                    <ClassifiedCard ad={ad} onPress={() => handleAdPress(ad.id)} />
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Popular Ads */}
          {popularAds.length > 0 && (
            <View className="border-b border-border bg-background py-4">
              <View className="mb-3 flex-row items-center px-4">
                <TrendingUp size={20} color="#3B82F6" />
                <Text className="ml-2 text-lg font-semibold text-foreground">Popular</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-2">
                {popularAds.map((ad) => (
                  <View key={ad.id} className="mr-3 w-64">
                    <ClassifiedCard ad={ad} onPress={() => handleAdPress(ad.id)} />
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </>
      )}

      {/* Results Header */}
      <View className="border-b border-border bg-background px-4 py-3">
        <Text className="text-sm text-muted-foreground">
          {ads.length} {selectedType === 'all' ? 'classifieds' : selectedType + 's'} found
        </Text>
      </View>
    </View>
  );

  const renderAd = ({ item }: { item: ClassifiedAdWithDistance }) => (
    <ClassifiedCard
      ad={item.ad}
      distance={item.distance_meters}
      onPress={() => handleAdPress(item.ad.id)}
    />
  );

  const renderFooter = () => {
    if (!loading || page === 1) return null;
    return (
      <View className="py-4">
        <ActivityIndicator size="small" color="#3B82F6" />
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View className="items-center justify-center px-4 py-12">
        <Text className="mb-2 text-lg font-semibold text-foreground">No ads found</Text>
        <Text className="text-center text-muted-foreground">
          {searchQuery
            ? 'Try adjusting your search terms'
            : 'Be the first to post in this category!'}
        </Text>
      </View>
    );
  };

  if (loading && page === 1) {
    return (
      <ScreenWrapper screenName="Classifieds">
        <View className="flex-1 items-center justify-center bg-background">
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper screenName="Classifieds">
      <Stack.Screen
        options={{
          title: 'Classifieds',
        }}
      />

      <View className="flex-1 bg-muted">
        <FlatList
          data={ads}
          renderItem={renderAd}
          keyExtractor={(item) => item.ad.id.toString()}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
        />
      </View>
    </ScreenWrapper>
  );
}
