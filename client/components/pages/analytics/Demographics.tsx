import * as React from 'react';
import { View } from 'react-native';
import { Text, Card } from '@/components/ui';

export function Demographics() {
  const locations = [
    { name: 'United States', percentage: 35 },
    { name: 'United Kingdom', percentage: 27 },
    { name: 'Canada', percentage: 19 },
  ];

  const devices = [
    { name: 'Desktop', percentage: 52 },
    { name: 'Mobile', percentage: 38 },
    { name: 'Tablet', percentage: 10 },
  ];

  return (
    <View className="flex-row gap-4">
      <Card className="flex-1 p-4">
        <Text className="font-semibold mb-3">Top Locations</Text>
        <View className="gap-2">
          {locations.map((location, idx) => (
            <View key={idx} className="flex-row justify-between">
              <Text className="text-sm">{location.name}</Text>
              <Text className="text-sm text-muted-foreground">
                {location.percentage}%
              </Text>
            </View>
          ))}
        </View>
      </Card>

      <Card className="flex-1 p-4">
        <Text className="font-semibold mb-3">Devices</Text>
        <View className="gap-2">
          {devices.map((device, idx) => (
            <View key={idx} className="flex-row justify-between">
              <Text className="text-sm">{device.name}</Text>
              <Text className="text-sm text-muted-foreground">{device.percentage}%</Text>
            </View>
          ))}
        </View>
      </Card>
    </View>
  );
}
