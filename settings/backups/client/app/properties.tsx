import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import { Stack } from 'expo-router';
import { MapPin, List, Sliders, Search, X } from 'lucide-react-native';
import { PropertyCard } from '@/components/marketplace/property-card';
import { PropertyMap } from '@/components/marketplace/property-map';
import { searchProperties, PropertySearchParams, PropertyWithDistance } from '@/lib/api/properties';
import { useGeolocation } from '@/lib/hooks/useGeolocation';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ScreenWrapper } from '@/components/screen-wrapper';

type ViewMode = 'list' | 'map';

interface FilterState {
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  minArea?: number;
  maxArea?: number;
  propertyType?: 'house' | 'apartment' | 'villa' | 'plot' | 'commercial';
  listingType?: 'sale' | 'rent';
  searchRadius: number;
  keywords?: string;
}

export default function PropertiesScreen() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [properties, setProperties] = useState<PropertyWithDistance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | number | undefined>(
    undefined
  );

  const { coords, loading: locationLoading, error: locationError } = useGeolocation();

  const [filters, setFilters] = useState<FilterState>({
    searchRadius: 10000, // 10km default
  });

  const loadProperties = useCallback(
    async (pageNum: number = 1, append: boolean = false) => {
      if (!coords) return;

      try {
        if (!append) {
          setLoading(true);
        }

        const params: PropertySearchParams = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          radius: filters.searchRadius,
          page: pageNum,
          limit: 20,
        };

        // Apply filters
        if (filters.minPrice) params.min_price = filters.minPrice;
        if (filters.maxPrice) params.max_price = filters.maxPrice;
        if (filters.bedrooms) params.bedrooms = filters.bedrooms;
        if (filters.bathrooms) params.bathrooms = filters.bathrooms;
        if (filters.minArea) params.min_area = filters.minArea;
        if (filters.maxArea) params.max_area = filters.maxArea;
        if (filters.propertyType) params.property_type = filters.propertyType;
        if (filters.listingType) params.listing_type = filters.listingType;
        if (filters.keywords) params.keywords = filters.keywords;

        const response = await searchProperties(params);

        if (append) {
          setProperties((prev) => [...prev, ...response.properties]);
        } else {
          setProperties(response.properties);
        }

        setHasMore(response.properties.length === 20);
        setPage(pageNum);
      } catch (error) {
        console.error('Failed to load properties:', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [coords, filters]
  );

  useEffect(() => {
    if (coords) {
      loadProperties(1, false);
    }
  }, [coords, filters]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadProperties(1, false);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadProperties(page + 1, true);
    }
  };

  const handlePropertyPress = (propertyId: string | number) => {
    const idStr = String(propertyId);
    // TODO: Navigate to property detail screen
    console.log('Navigate to property:', idStr);
  };

  const handleFavoritePress = (propertyId: string | number) => {
    const idStr = String(propertyId);
    // TODO: Toggle favorite
    console.log('Toggle favorite:', idStr);
  };

  const handleMapPropertyPress = (propertyId: string | number) => {
    setSelectedPropertyId(String(propertyId));
  };

  const applyFilters = () => {
    setShowFilters(false);
    loadProperties(1, false);
  };

  const clearFilters = () => {
    setFilters({
      searchRadius: 10000,
    });
  };

  const renderListHeader = () => (
    <View className="border-b border-gray-200 bg-white p-4">
      <View className="mb-3 flex-row items-center space-x-2">
        <View className="flex-1 flex-row items-center rounded-lg bg-gray-100 px-3 py-2">
          <Search size={20} color="#6B7280" />
          <TextInput
            placeholder="Search properties..."
            value={filters.keywords || ''}
            onChangeText={(text) => setFilters({ ...filters, keywords: text })}
            className="ml-2 flex-1 text-base"
          />
          {filters.keywords && (
            <Button
              variant="ghost"
              size="icon"
              onPress={() => setFilters({ ...filters, keywords: undefined })}>
              <X size={20} color="#6B7280" />
            </Button>
          )}
        </View>
        <Button onPress={() => setShowFilters(true)} className="rounded-lg bg-primary p-2">
          <Sliders size={24} color="#FFFFFF" />
        </Button>
      </View>

      <View className="flex-row items-center justify-between">
        <Text className="text-sm text-muted-foreground">
          {properties.length} properties found
          {coords && ` within ${filters.searchRadius / 1000}km`}
        </Text>
        <View className="flex-row space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onPress={() => setViewMode('list')}
            className={`rounded-lg p-2 ${viewMode === 'list' ? 'bg-primary' : 'bg-muted'}`}>
            <List size={20} color={viewMode === 'list' ? '#FFFFFF' : '#6B7280'} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onPress={() => setViewMode('map')}
            className={`rounded-lg p-2 ${viewMode === 'map' ? 'bg-primary' : 'bg-muted'}`}>
            <MapPin size={20} color={viewMode === 'map' ? '#FFFFFF' : '#6B7280'} />
          </Button>
        </View>
      </View>
    </View>
  );

  const renderProperty = ({ item }: { item: PropertyWithDistance }) => (
    <PropertyCard
      property={item.property}
      distance={item.distance_meters}
      onPress={() => handlePropertyPress(item.property.id)}
      onFavoritePress={() => handleFavoritePress(item.property.id)}
      showDistance
    />
  );

  const renderListFooter = () => {
    if (!loading || page === 1) return null;
    return (
      <View className="py-4">
        <ActivityIndicator size="small" color="#3B82F6" />
      </View>
    );
  };

  if (locationLoading) {
    return (
      <ScreenWrapper screenName="Properties">
        <View className="flex-1 items-center justify-center bg-background">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="mt-4 text-muted-foreground">Getting your location...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (locationError) {
    return (
      <ScreenWrapper screenName="Properties">
        <View className="flex-1 items-center justify-center bg-background p-4">
          <MapPin size={48} color="#EF4444" />
          <Text className="mt-4 text-lg font-semibold text-foreground">Location Required</Text>
          <Text className="mt-2 text-center text-muted-foreground">
            Please enable location permissions to search for properties near you.
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper screenName="Properties">
      <Stack.Screen
        options={{
          title: 'Properties',
          headerRight: () => (
            <Button variant="ghost" size="icon" onPress={() => setShowFilters(true)}>
              <Sliders size={24} color="#3B82F6" />
            </Button>
          ),
        }}
      />

      <View className="flex-1 bg-background">
        {viewMode === 'list' ? (
          <FlatList
            data={properties}
            renderItem={renderProperty}
            keyExtractor={(item) => item.property.id.toString()}
            ListHeaderComponent={renderListHeader}
            ListFooterComponent={renderListFooter}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            contentContainerClassName="pb-4"
            removeClippedSubviews={true}
            windowSize={21}
            maxToRenderPerBatch={10}
            initialNumToRender={10}
            updateCellsBatchingPeriod={50}
          />
        ) : (
          <View className="flex-1">
            {renderListHeader()}
            <PropertyMap
              properties={properties.map((p) => p.property)}
              userLocation={
                coords
                  ? {
                      latitude: coords.latitude,
                      longitude: coords.longitude,
                    }
                  : undefined
              }
              radius={filters.searchRadius}
              onPropertyPress={handleMapPropertyPress}
              selectedPropertyId={selectedPropertyId}
            />
          </View>
        )}
      </View>

      {/* Filters Modal */}
      <Modal visible={showFilters} animationType="slide" presentationStyle="pageSheet">
        <View className="flex-1 bg-background">
          <View className="flex-row items-center justify-between border-b border-border p-4">
            <Button variant="ghost" size="icon" onPress={() => setShowFilters(false)}>
              <X size={24} color="#6B7280" />
            </Button>
            <Text className="text-lg font-semibold text-foreground">Filters</Text>
            <Button variant="ghost" onPress={clearFilters}>
              <Text className="font-medium text-primary">Clear</Text>
            </Button>
          </View>

          <ScrollView className="flex-1 p-4">
            {/* Price Range */}
            <View className="mb-6">
              <Text className="mb-2 text-base font-semibold text-foreground">Price Range</Text>
              <View className="flex-row space-x-2">
                <TextInput
                  placeholder="Min"
                  keyboardType="numeric"
                  value={filters.minPrice?.toString()}
                  onChangeText={(text) =>
                    setFilters({ ...filters, minPrice: text ? parseInt(text) : undefined })
                  }
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2"
                />
                <TextInput
                  placeholder="Max"
                  keyboardType="numeric"
                  value={filters.maxPrice?.toString()}
                  onChangeText={(text) =>
                    setFilters({ ...filters, maxPrice: text ? parseInt(text) : undefined })
                  }
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2"
                />
              </View>
            </View>

            {/* Bedrooms */}
            <View className="mb-6">
              <Text className="mb-2 text-base font-semibold text-foreground">Bedrooms</Text>
              <View className="flex-row space-x-2">
                {[1, 2, 3, 4, 5].map((num) => (
                  <Button
                    key={num}
                    variant="ghost"
                    onPress={() => setFilters({ ...filters, bedrooms: num })}
                    className={`flex-1 rounded-lg border py-2 ${
                      filters.bedrooms === num
                        ? 'border-primary bg-primary'
                        : 'border-border bg-background'
                    }`}>
                    <Text
                      className={`text-center font-medium ${
                        filters.bedrooms === num ? 'text-primary-foreground' : 'text-foreground'
                      }`}>
                      {num}+
                    </Text>
                  </Button>
                ))}
              </View>
            </View>

            {/* Property Type */}
            <View className="mb-6">
              <Text className="mb-2 text-base font-semibold text-foreground">Property Type</Text>
              <View className="flex-row flex-wrap gap-2">
                {['house', 'apartment', 'villa', 'plot', 'commercial'].map((type) => (
                  <Button
                    key={type}
                    variant="ghost"
                    onPress={() =>
                      setFilters({
                        ...filters,
                        propertyType: type as FilterState['propertyType'],
                      })
                    }
                    className={`rounded-lg border px-4 py-2 ${
                      filters.propertyType === type
                        ? 'border-primary bg-primary'
                        : 'border-border bg-background'
                    }`}>
                    <Text
                      className={`font-medium capitalize ${
                        filters.propertyType === type
                          ? 'text-primary-foreground'
                          : 'text-foreground'
                      }`}>
                      {type}
                    </Text>
                  </Button>
                ))}
              </View>
            </View>

            {/* Listing Type */}
            <View className="mb-6">
              <Text className="mb-2 text-base font-semibold text-foreground">Listing Type</Text>
              <View className="flex-row space-x-2">
                {['sale', 'rent'].map((type) => (
                  <Button
                    key={type}
                    variant="ghost"
                    onPress={() =>
                      setFilters({ ...filters, listingType: type as FilterState['listingType'] })
                    }
                    className={`flex-1 rounded-lg border py-2 ${
                      filters.listingType === type
                        ? 'border-primary bg-primary'
                        : 'border-border bg-background'
                    }`}>
                    <Text
                      className={`text-center font-medium capitalize ${
                        filters.listingType === type ? 'text-primary-foreground' : 'text-foreground'
                      }`}>
                      {type}
                    </Text>
                  </Button>
                ))}
              </View>
            </View>

            {/* Search Radius */}
            <View className="mb-6">
              <Text className="mb-2 text-base font-semibold text-foreground">
                Search Radius: {filters.searchRadius / 1000}km
              </Text>
              <View className="flex-row space-x-2">
                {[5000, 10000, 25000, 50000, 100000].map((radius) => (
                  <Button
                    key={radius}
                    variant="ghost"
                    onPress={() => setFilters({ ...filters, searchRadius: radius })}
                    className={`flex-1 rounded-lg border py-2 ${
                      filters.searchRadius === radius
                        ? 'border-primary bg-primary'
                        : 'border-border bg-background'
                    }`}>
                    <Text
                      className={`text-center font-medium ${
                        filters.searchRadius === radius
                          ? 'text-primary-foreground'
                          : 'text-foreground'
                      }`}>
                      {radius / 1000}km
                    </Text>
                  </Button>
                ))}
              </View>
            </View>
          </ScrollView>

          <View className="border-t border-border p-4">
            <Button onPress={applyFilters} className="items-center rounded-lg bg-primary py-3">
              <Text className="text-base font-semibold text-primary-foreground">Apply Filters</Text>
            </Button>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}
