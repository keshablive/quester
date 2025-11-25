import React from 'react';
import { View, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { ScreenWrapper } from '@/components/screen-wrapper';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <ScreenWrapper screenName="PostDetail">
      <ScrollView className="flex-1 bg-background p-4">
        <View className="gap-4">
          <Text className="text-2xl font-bold text-foreground">Post Details</Text>
          <Text className="text-muted-foreground">Post ID: {id}</Text>

          {/* TODO: Implement post details fetching and display */}
          <View className="rounded-lg border border-border bg-card p-4">
            <Text className="mb-2 text-foreground">This screen will display:</Text>
            <Text className="text-muted-foreground">• Post content and media</Text>
            <Text className="text-muted-foreground">• Author information</Text>
            <Text className="text-muted-foreground">• Comments and reactions</Text>
            <Text className="text-muted-foreground">• Share and save options</Text>
          </View>

          <Button onPress={() => router.back()}>
            <Text>Go Back</Text>
          </Button>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}
