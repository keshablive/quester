import React from 'react';
import { View, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { ScreenWrapper } from '@/components/screen-wrapper';

export default function UserProfileScreen() {
  return (
    <ScreenWrapper screenName="UserProfile">
      <ScrollView className="flex-1 bg-background p-4">
      <View className="gap-4">
        <Text className="text-2xl font-bold text-foreground">User Profile</Text>

        {/* TODO: Implement user profile quick view */}
        <View className="rounded-lg border border-border bg-card p-4">
          <Text className="mb-2 text-foreground">This screen will display:</Text>
          <Text className="text-muted-foreground">• User basic information</Text>
          <Text className="text-muted-foreground">• Quick actions (message, follow)</Text>
          <Text className="text-muted-foreground">• Recent activity</Text>
        </View>

        <Button onPress={() => router.back()}>
          <Text>Close</Text>
        </Button>
      </View>
      </ScrollView>
    </ScreenWrapper>
  );
}
