import * as React from 'react';
import { View } from 'react-native';
import { Text, Card, Icon } from '@/components/ui';
import { TrendingUp, TrendingDown } from 'lucide-react-native';
import type { PageStat } from './types';

export function TopPages() {
  const pages: PageStat[] = [
    { page: '/dashboard', views: '12.5K', change: '+15%', trend: TrendingUp },
    { page: '/products', views: '8.3K', change: '+8%', trend: TrendingUp },
    { page: '/about', views: '5.2K', change: '-2%', trend: TrendingDown },
    { page: '/contact', views: '3.1K', change: '+5%', trend: TrendingUp },
  ];

  return (
    <View>
      <Text className="text-lg font-semibold mb-3">Top Performing Pages</Text>
      <Card>
        {pages.map((item, index) => (
          <View 
            key={index}
            className={`p-4 flex-row items-center justify-between ${
              index < pages.length - 1 ? 'border-b border-border' : ''
            }`}
          >
            <View className="flex-1">
              <Text className="font-medium">{item.page}</Text>
              <Text className="text-muted-foreground text-sm">{item.views} views</Text>
            </View>
            <View className="flex-row items-center gap-1">
              <Icon 
                as={item.trend} 
                size={14} 
                className={item.change.startsWith('+') ? 'text-green-500' : 'text-red-500'}
              />
              <Text className={item.change.startsWith('+') ? 'text-green-500 text-sm' : 'text-red-500 text-sm'}>
                {item.change}
              </Text>
            </View>
          </View>
        ))}
      </Card>
    </View>
  );
}
