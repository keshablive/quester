import * as React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui';

export function SettingsHeader() {
  return (
    <View>
      <Text className="text-3xl font-bold">Settings</Text>
      <Text className="text-muted-foreground">
        Manage your account settings and preferences
      </Text>
    </View>
  );
}
