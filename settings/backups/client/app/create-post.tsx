import React from 'react';
import { View, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { ScreenWrapper } from '@/components/screen-wrapper';

export default function CreatePostScreen() {
  return (
    <ScreenWrapper screenName="CreatePost">
      <ScrollView className="flex-1 bg-background p-4">
        <View className="gap-4">
          <Text className="text-2xl font-bold text-foreground">Create Post</Text>

          {/* TODO: Implement post creation form */}
          <View className="rounded-lg border border-border bg-card p-4">
            <Text className="mb-2 text-foreground">This screen will include:</Text>
            <Text className="text-muted-foreground">• Rich text editor</Text>
            <Text className="text-muted-foreground">• Media upload (images/videos)</Text>
            <Text className="text-muted-foreground">• Privacy settings</Text>
            <Text className="text-muted-foreground">• Tags and mentions</Text>
          </View>

          <Button onPress={() => router.back()}>
            <Text>Cancel</Text>
          </Button>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}
