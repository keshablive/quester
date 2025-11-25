import React from 'react';
import { View, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { ScreenWrapper } from '@/components/screen-wrapper';

export default function NewChatScreen() {
  return (
    <ScreenWrapper screenName="NewChat">
      <ScrollView className="flex-1 bg-background p-4">
        <View className="gap-4">
          <Text className="text-2xl font-bold text-foreground">New Chat</Text>

          {/* TODO: Implement new chat creation */}
          <View className="rounded-lg border border-border bg-card p-4">
            <Text className="mb-2 text-foreground">This screen will include:</Text>
            <Text className="text-muted-foreground">• User search</Text>
            <Text className="text-muted-foreground">• Recent contacts</Text>
            <Text className="text-muted-foreground">• Group chat creation</Text>
          </View>

          <Button onPress={() => router.back()}>
            <Text>Cancel</Text>
          </Button>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}
