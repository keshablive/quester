import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text, Card, CardContent, CardHeader, CardTitle, Button, Icon } from '@/components/ui';
import { Home, Package, TrendingUp, DollarSign, Eye, Heart, ArrowRight } from 'lucide-react-native';
import { propertiesService, classifiedsService, Property, ClassifiedAd } from '@/core';
import { MarketplaceCard } from './MarketplaceCard';
import { cn } from '@/core';

interface MarketplaceDashboardProps {
  onNavigate: (view: string) => void;
  onItemPress: (item: Property | ClassifiedAd, type: 'property' | 'classified') => void;
}

export function MarketplaceDashboard({ onNavigate, onItemPress }: MarketplaceDashboardProps) {
  const [featuredProperties, setFeaturedProperties] = useState<Property[]>([]);
  const [featuredClassifieds, setFeaturedClassifieds] = useState<ClassifiedAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProperties: 0,
    totalClassifieds: 0,
    totalViews: 0,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load featured properties (first 3)
      const propertiesResponse = await propertiesService.search({ page: 1, limit: 3 });
      setFeaturedProperties(propertiesResponse.data.slice(0, 3));
      
      // Load popular classifieds (first 3)
      const popularClassifieds = await classifiedsService.getPopular();
      setFeaturedClassifieds(popularClassifieds.slice(0, 3));
      
      // Set stats (in real app, these would come from an analytics endpoint)
      setStats({
        totalProperties: propertiesResponse.total || propertiesResponse.data.length,
        totalClassifieds: popularClassifieds.length,
        totalViews: 1234, // Mock data
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const STATS = [
    { label: 'Properties Listed', value: stats.totalProperties.toString(), icon: Home, color: 'text-blue-500' },
    { label: 'Classifieds Active', value: stats.totalClassifieds.toString(), icon: Package, color: 'text-green-500' },
    { label: 'Total Views', value: stats.totalViews.toString(), icon: Eye, color: 'text-purple-500' },
  ];

  const CATEGORIES = [
    { label: 'Properties', icon: Home, view: 'properties', color: 'bg-blue-500/10', iconColor: 'text-blue-500' },
    { label: 'Classifieds', icon: Package, view: 'classifieds', color: 'bg-green-500/10', iconColor: 'text-green-500' },
  ];

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="p-6 gap-6">
        {/* Header */}
        <View>
          <Text className="text-3xl font-bold">Marketplace</Text>
          <Text className="text-muted-foreground">Discover properties and classifieds</Text>
        </View>

        {/* Stats Row */}
        <View className="flex-row gap-4">
          {STATS.map((stat, index) => (
            <Card key={index} className="flex-1">
              <CardContent className="p-4 items-center gap-2">
                <Icon as={stat.icon} size={24} className={stat.color} />
                <Text className="text-2xl font-bold">{stat.value}</Text>
                <Text className="text-xs text-center text-muted-foreground">{stat.label}</Text>
              </CardContent>
            </Card>
          ))}
        </View>

        {/* Quick Actions / Categories */}
        <View className="gap-4">
          <Text className="text-xl font-semibold">Browse Categories</Text>
          <View className="flex-row gap-4">
            {CATEGORIES.map((category, index) => (
              <Pressable
                key={index}
                className="flex-1"
                onPress={() => onNavigate(category.view)}
              >
                <View className={cn("p-6 rounded-xl items-center gap-3", category.color)}>
                  <Icon as={category.icon} size={32} className={category.iconColor} />
                  <Text className="font-semibold">{category.label}</Text>
                  <Icon as={ArrowRight} size={16} className="text-muted-foreground" />
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Featured Properties */}
        {featuredProperties.length > 0 && (
          <View className="gap-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-xl font-semibold">Featured Properties</Text>
              <Button variant="ghost" size="sm" onPress={() => onNavigate('properties')}>
                <Text>View All</Text>
                <Icon as={ArrowRight} size={16} className="ml-1" />
              </Button>
            </View>
            <View className="gap-4">
              {featuredProperties.map((property) => (
                <MarketplaceCard
                  key={property.id}
                  item={property}
                  type="property"
                  onPress={(item) => onItemPress(item, 'property')}
                />
              ))}
            </View>
          </View>
        )}

        {/* Popular Classifieds */}
        {featuredClassifieds.length > 0 && (
          <View className="gap-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-xl font-semibold">Popular Classifieds</Text>
              <Button variant="ghost" size="sm" onPress={() => onNavigate('classifieds')}>
                <Text>View All</Text>
                <Icon as={ArrowRight} size={16} className="ml-1" />
              </Button>
            </View>
            <View className="gap-4">
              {featuredClassifieds.map((classified) => (
                <MarketplaceCard
                  key={classified.id}
                  item={classified}
                  type="classified"
                  onPress={(item) => onItemPress(item, 'classified')}
                />
              ))}
            </View>
          </View>
        )}

        {/* Empty State */}
        {!loading && featuredProperties.length === 0 && featuredClassifieds.length === 0 && (
          <Card>
            <CardContent className="p-8 items-center gap-4">
              <Icon as={Package} size={48} className="text-muted-foreground" />
              <Text className="text-lg font-semibold text-center">No items available yet</Text>
              <Text className="text-sm text-muted-foreground text-center">
                Be the first to list a property or classified ad!
              </Text>
            </CardContent>
          </Card>
        )}
      </View>
    </ScrollView>
  );
}
