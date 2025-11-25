import React from 'react';
import { View, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { ScreenWrapper } from '@/components/screen-wrapper';

export default function MediaViewerScreen() {
  return (
    <ScreenWrapper screenName="MediaViewer">
      <ScrollView className="flex-1 bg-background p-4">
        <View className="gap-4">
          <Text className="text-2xl font-bold text-foreground">Media Viewer</Text>

          {/* TODO: Implement media viewer with gallery */}
          <View className="rounded-lg border border-border bg-card p-4">
            <Text className="mb-2 text-foreground">This screen will display:</Text>
            <Text className="text-muted-foreground">• Full-screen media viewer</Text>
            <Text className="text-muted-foreground">• Image/video playback</Text>
            <Text className="text-muted-foreground">• Zoom and pan gestures</Text>
            <Text className="text-muted-foreground">• Download and share options</Text>
          </View>

          <Button onPress={() => router.back()}>
            <Text>Close</Text>
          </Button>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}
