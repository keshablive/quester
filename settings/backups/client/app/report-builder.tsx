import React from 'react';
import { View, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { Text } from '@/components/ui/text';
import { ScreenWrapper } from '@/components/screen-wrapper';

export default function ReportBuilderScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Report Builder',
          headerLargeTitle: false,
        }}
      />
      <ScreenWrapper screenName="ReportBuilder">
        <ScrollView className="flex-1 bg-background">
          <View className="p-4">
            <Text className="text-2xl font-bold text-foreground">Report Builder</Text>
            <Text className="mt-2 text-muted-foreground">
              Create custom reports and analytics dashboards.
            </Text>
            {/* TODO: Implement report builder UI */}
          </View>
        </ScrollView>
      </ScreenWrapper>
    </>
  );
}
