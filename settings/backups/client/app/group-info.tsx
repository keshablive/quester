import React from 'react';
import { View, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { ScreenWrapper } from '@/components/screen-wrapper';

export default function GroupInfoScreen() {
  return (
    <ScreenWrapper screenName="GroupInfo">
      <ScrollView className="flex-1 bg-background p-4">
        <View className="gap-4">
          <Text className="text-2xl font-bold text-foreground">Group Info</Text>

          {/* TODO: Implement group information display */}
          <View className="rounded-lg border border-border bg-card p-4">
            <Text className="mb-2 text-foreground">This screen will display:</Text>
            <Text className="text-muted-foreground">• Group details and description</Text>
            <Text className="text-muted-foreground">• Member list</Text>
            <Text className="text-muted-foreground">• Admin controls</Text>
            <Text className="text-muted-foreground">• Media and files shared</Text>
          </View>

          <Button onPress={() => router.back()}>
            <Text>Go Back</Text>
          </Button>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}
