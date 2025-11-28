import * as React from 'react';
import { View } from 'react-native';
import { Text, Button, Icon } from '@/components/ui';
import { Calendar } from 'lucide-react-native';

export function AnalyticsHeader() {
  return (
    <View className="flex-row items-center justify-between">
      <View>
        <Text className="text-3xl font-bold">Analytics</Text>
        <Text className="text-muted-foreground">
          Track your performance and insights
        </Text>
      </View>
      <Button variant="outline" size="sm">
        <Icon as={Calendar} size={16} />
        <Text>Last 30 days</Text>
      </Button>
    </View>
  );
}
