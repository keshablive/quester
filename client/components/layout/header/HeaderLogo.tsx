import * as React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui';
import { QuesterLogo } from '@/components/ui/logo';
import { useColorScheme } from 'nativewind';

export function HeaderLogo() {
  const { colorScheme } = useColorScheme();
  
  return (
    <View className="flex-row items-center gap-3">
      <QuesterLogo size={32} color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} />
      <Text className="text-xl font-bold text-foreground">Quester</Text>
    </View>
  );
}
