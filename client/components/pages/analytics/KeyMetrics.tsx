import * as React from 'react';
import { View } from 'react-native';
import { Text, Card, Icon } from '@/components/ui';
import { Activity, BarChart3, PieChart, TrendingUp, TrendingDown } from 'lucide-react-native';
import type { MetricItem } from './types';

export function KeyMetrics() {
  const metrics: MetricItem[] = [
    { label: 'Page Views', value: '45.2K', change: '+12.5%', changeType: 'increase', icon: Activity },
    { label: 'Bounce Rate', value: '32.8%', change: '-4.3%', changeType: 'decrease', icon: BarChart3 },
    { label: 'Conversion', value: '3.42%', change: '+0.8%', changeType: 'increase', icon: PieChart },
  ];

  return (
    <View className="flex-row gap-4 flex-wrap">
      {metrics.map((metric, index) => (
        <Card key={index} className="flex-1 min-w-[150px] p-4">
          <View className="flex-row items-center gap-2 mb-2">
            <Icon as={metric.icon} size={18} className="text-primary" />
            <Text className="text-sm text-muted-foreground">{metric.label}</Text>
          </View>
          <Text className="text-2xl font-bold">{metric.value}</Text>
          <View className="flex-row items-center gap-1 mt-1">
            <Icon 
              as={metric.changeType === 'increase' ? TrendingUp : TrendingDown} 
              size={14} 
              className="text-green-500" 
            />
            <Text className="text-green-500 text-xs">{metric.change}</Text>
          </View>
        </Card>
      ))}
    </View>
  );
}
