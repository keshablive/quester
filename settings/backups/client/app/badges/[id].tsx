import React from 'react';
import { View, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { ScreenWrapper } from '@/components/screen-wrapper';

export default function BadgeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <ScreenWrapper screenName="BadgeDetail">
      <ScrollView className="flex-1 bg-background p-4">
        <View className="gap-4">
          <Text className="text-2xl font-bold text-foreground">Badge Details</Text>
          <Text className="text-muted-foreground">Badge ID: {id}</Text>

          {/* TODO: Implement badge details fetching and display */}
          <View className="rounded-lg border border-border bg-card p-4">
            <Text className="mb-2 text-foreground">This screen will display:</Text>
            <Text className="text-muted-foreground">• Badge icon and tier</Text>
            <Text className="text-muted-foreground">• Achievement requirements</Text>
            <Text className="text-muted-foreground">• Earned date and rarity</Text>
          </View>

          <Button onPress={() => router.back()}>
            <Text>Go Back</Text>
          </Button>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}
