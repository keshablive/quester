import * as React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui';

export function DashboardHeader() {
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <View>
      <Text className="text-3xl font-bold">{greeting}! 👋</Text>
      <Text className="text-muted-foreground">
        Here's what's happening with your projects today.
      </Text>
    </View>
  );
}
