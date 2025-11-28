import * as React from 'react';
import { View } from 'react-native';
import { Text, Card } from '@/components/ui';

export function RecentActivity() {
  const activities = [
    'Published a new article',
    'Updated profile photo',
    'Shared a project',
    'Commented on a post'
  ];

  return (
    <View>
      <Text className="text-lg font-semibold mb-3">Recent Activity</Text>
      <Card>
        {activities.map((activity, index) => (
          <View 
            key={index}
            className={`p-4 ${index < activities.length - 1 ? 'border-b border-border' : ''}`}
          >
            <Text>{activity}</Text>
            <Text className="text-muted-foreground text-xs mt-1">
              {index + 1} {index === 0 ? 'hour' : 'days'} ago
            </Text>
          </View>
        ))}
      </Card>
    </View>
  );
}
