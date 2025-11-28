import * as React from 'react';
import { View } from 'react-native';
import { Text, Card, Icon } from '@/components/ui';
import { BarChart3 } from 'lucide-react-native';

export function TrafficOverview() {
  return (
    <Card className="p-6">
      <Text className="font-semibold text-lg mb-4">Traffic Overview</Text>
      <View className="h-48 bg-muted/20 rounded-lg items-center justify-center border-2 border-dashed border-muted">
        <Icon as={BarChart3} size={48} className="text-muted-foreground/50" />
        <Text className="text-muted-foreground mt-2">Chart visualization</Text>
      </View>
    </Card>
  );
}
