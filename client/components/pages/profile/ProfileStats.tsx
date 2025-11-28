import * as React from 'react';
import { View } from 'react-native';
import { Text, Card } from '@/components/ui';
import type { StatItem } from './types';

export function ProfileStats() {
  const stats: StatItem[] = [
    { label: 'Posts', value: '234' },
    { label: 'Followers', value: '1.2k' },
    { label: 'Following', value: '456' },
  ];

  return (
    <View className="flex-row gap-4">
      {stats.map((stat, index) => (
        <Card key={index} className="flex-1 p-4 items-center">
          <Text className="text-2xl font-bold">{stat.value}</Text>
          <Text className="text-muted-foreground text-sm">{stat.label}</Text>
        </Card>
      ))}
    </View>
  );
}
