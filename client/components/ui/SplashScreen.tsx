import * as React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Text } from './text';
import { QuesterLogo } from './logo';
import { appConfig } from '@/core';
import { useColorScheme } from 'nativewind';

export function SplashScreen() {
  const { colorScheme } = useColorScheme();

  return (
    <View className="flex-1 items-center justify-center bg-background">
      <View className="items-center gap-6">
        <QuesterLogo size={96} color={colorScheme === 'dark' ? '#ffffff' : '#000000'} />
        <View className="items-center gap-2">
          <Text className="text-2xl font-bold tracking-tight">{appConfig.name}</Text>
          <ActivityIndicator size="large" className="text-primary" />
        </View>
      </View>
    </View>
  );
}
