import React, { useState, useEffect } from 'react';
import { View, FlatList, TextInput, ActivityIndicator, Pressable } from 'react-native';
import { Text } from '@/components/ui';
import { MarketplaceCard } from './MarketplaceCard';
import {  propertiesService, classifiedsService, Property, ClassifiedAd, PropertyFilters } from '@/core';
import { Search, Home, Package, TrendingUp, Clock } from 'lucide-react-native';
import { cn } from '@/core';

import { MarketplaceListProps, MarketplaceItemType, MarketplaceItem } from './types';

type TabType = 'properties' | 'classifieds';
type ViewMode = 'all' | 'recent' | 'popular' | 'my-items';

export function MarketplaceList({ onItemPress, initialTab = 'properties' }: MarketplaceListProps) {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('all');

  useEffect(() => {
    loadItems();
  }, [activeTab, viewMode]);

  const loadItems = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (activeTab === 'properties') {
        const filters: PropertyFilters = {
          page: 1,
          limit: 50,
          query: searchQuery,
        };
        const response = await propertiesService.search(filters);
        setItems(response.data);
      } else {
        let data: ClassifiedAd[];
        switch (viewMode) {
          case 'recent':
            data = await classifiedsService.getRecent();
            break;
          case 'popular':
            data = await classifiedsService.getPopular();
            break;
          case 'my-items':
            data = await classifiedsService.getMyAds();
            break;
          default:
            const response = await classifiedsService.search({ query: searchQuery });
            data = response.data;
        }
        setItems(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setViewMode('all');
    loadItems();
  };

  const renderHeader = () => (
    <View className="mb-4">
      <Text className="text-3xl font-bold text-foreground mb-4">Marketplace</Text>
      
      {/* Tab Navigation */}
      <View className="flex-row gap-2 mb-4">
        <Pressable
          className={cn(
            "flex-1 flex-row items-center justify-center px-4 py-3 rounded-xl gap-2 border",
            activeTab === 'properties' 
              ? "bg-primary/10 border-primary/20" 
              : "bg-card border-border"
          )}
          onPress={() => setActiveTab('properties')}
        >
          <Home size={20} className={activeTab === 'properties' ? "text-primary" : "text-muted-foreground"} />
          <Text className={cn(
            "text-base font-semibold",
            activeTab === 'properties' ? "text-primary" : "text-muted-foreground"
          )}>
            Properties
          </Text>
        </Pressable>

        <Pressable
          className={cn(
            "flex-1 flex-row items-center justify-center px-4 py-3 rounded-xl gap-2 border",
            activeTab === 'classifieds' 
              ? "bg-primary/10 border-primary/20" 
              : "bg-card border-border"
          )}
          onPress={() => setActiveTab('classifieds')}
        >
          <Package size={20} className={activeTab === 'classifieds' ? "text-primary" : "text-muted-foreground"} />
          <Text className={cn(
            "text-base font-semibold",
            activeTab === 'classifieds' ? "text-primary" : "text-muted-foreground"
          )}>
            Classifieds
          </Text>
        </Pressable>
      </View>

      {/* Search Bar */}
      <View className="flex-row items-center bg-card rounded-xl px-4 mb-4 shadow-sm border border-border h-12">
        <Search size={20} className="text-muted-foreground mr-2" />
        <TextInput
          className="flex-1 text-base text-foreground h-full"
          placeholder={`Search ${activeTab}...`}
          placeholderTextColor="#6B7280"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
      </View>

      {/* View Mode Filters - Only for Classifieds */}
      {activeTab === 'classifieds' && (
        <View className="flex-row gap-2">
          <Pressable
            className={cn(
              "flex-row items-center px-4 py-2 rounded-full gap-1.5 border",
              viewMode === 'all' 
                ? "bg-primary/10 border-primary/20" 
                : "bg-card border-border"
            )}
            onPress={() => setViewMode('all')}
          >
            <Text className={cn(
              "text-sm font-semibold",
              viewMode === 'all' ? "text-primary" : "text-muted-foreground"
            )}>
              All
            </Text>
          </Pressable>

          <Pressable
            className={cn(
              "flex-row items-center px-4 py-2 rounded-full gap-1.5 border",
              viewMode === 'recent' 
                ? "bg-primary/10 border-primary/20" 
                : "bg-card border-border"
            )}
            onPress={() => setViewMode('recent')}
          >
            <Clock size={16} className={viewMode === 'recent' ? "text-primary" : "text-muted-foreground"} />
            <Text className={cn(
              "text-sm font-semibold",
              viewMode === 'recent' ? "text-primary" : "text-muted-foreground"
            )}>
              Recent
            </Text>
          </Pressable>

          <Pressable
            className={cn(
              "flex-row items-center px-4 py-2 rounded-full gap-1.5 border",
              viewMode === 'popular' 
                ? "bg-primary/10 border-primary/20" 
                : "bg-card border-border"
            )}
            onPress={() => setViewMode('popular')}
          >
            <TrendingUp size={16} className={viewMode === 'popular' ? "text-primary" : "text-muted-foreground"} />
            <Text className={cn(
              "text-sm font-semibold",
              viewMode === 'popular' ? "text-primary" : "text-muted-foreground"
            )}>
              Popular
            </Text>
          </Pressable>

          <Pressable
            className={cn(
              "flex-row items-center px-4 py-2 rounded-full gap-1.5 border",
              viewMode === 'my-items' 
                ? "bg-primary/10 border-primary/20" 
                : "bg-card border-border"
            )}
            onPress={() => setViewMode('my-items')}
          >
            <Text className={cn(
              "text-sm font-semibold",
              viewMode === 'my-items' ? "text-primary" : "text-muted-foreground"
            )}>
              My Ads
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );

  const renderEmpty = () => (
    <View className="py-12 items-center">
      <Text className="text-lg font-semibold text-foreground mb-2">
        No {activeTab} found
      </Text>
      <Text className="text-sm text-muted-foreground">
        Try adjusting your search or {activeTab === 'classifieds' ? 'view' : 'filters'}
      </Text>
    </View>
  );

  const renderError = () => (
    <View className="flex-1 justify-center items-center bg-background p-6">
      <Text className="text-base text-destructive text-center mb-4">{error}</Text>
      <Pressable className="bg-primary px-6 py-3 rounded-lg" onPress={loadItems}>
        <Text className="text-base font-semibold text-primary-foreground">Retry</Text>
      </Pressable>
    </View>
  );

  if (loading && items.length === 0) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" className="text-primary" />
        <Text className="mt-3 text-base text-muted-foreground">
          Loading {activeTab}...
        </Text>
      </View>
    );
  }

  if (error && items.length === 0) {
    return renderError();
  }

  return (
    <View className="flex-1 bg-background">
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MarketplaceCard 
            item={item} 
            type={activeTab === 'properties' ? 'property' : 'classified'}
            onPress={(item) => onItemPress(item, activeTab === 'properties' ? 'property' : 'classified')} 
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={{ padding: 16 }}
        refreshing={loading}
        onRefresh={loadItems}
      />
    </View>
  );
}
