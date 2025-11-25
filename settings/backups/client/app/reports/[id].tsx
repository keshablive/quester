import React, { useState, useEffect } from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Text } from '@/components/ui/text';
import { ScreenWrapper } from '@/components/screen-wrapper';

export default function ReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch report data by id
    setTimeout(() => setLoading(false), 500);
  }, [id]);

  return (
    <>
      <Stack.Screen
        options={{
          title: `Report #${id}`,
          headerLargeTitle: false,
        }}
      />
      <ScreenWrapper screenName="ReportDetail">
        <ScrollView className="flex-1 bg-background">
          {loading ? (
            <View className="flex-1 items-center justify-center p-8">
              <ActivityIndicator size="large" />
              <Text className="mt-4 text-muted-foreground">Loading report...</Text>
            </View>
          ) : (
            <View className="p-4">
              <Text className="text-2xl font-bold text-foreground">Report #{id}</Text>
              <Text className="mt-2 text-muted-foreground">
                View detailed report data and analytics.
              </Text>
              {/* TODO: Implement report detail UI */}
            </View>
          )}
        </ScrollView>
      </ScreenWrapper>
    </>
  );
}
