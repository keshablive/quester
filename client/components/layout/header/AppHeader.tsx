import * as React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HeaderLogo } from './HeaderLogo';
import { HeaderActions } from './HeaderActions';
import type { AppHeaderProps } from './types';

export function AppHeader({ onUserIconPress, onCartIconPress, onNotificationIconPress, onSearchIconPress }: AppHeaderProps) {
  return (
    <SafeAreaView edges={['top']} className="bg-card border-b border-border">
      <View className="h-16 px-4 flex-row items-center justify-between">
        <HeaderLogo />
        <HeaderActions 
          onUserIconPress={onUserIconPress} 
          onCartIconPress={onCartIconPress}
          onNotificationIconPress={onNotificationIconPress}
          onSearchIconPress={onSearchIconPress}
        />
      </View>
    </SafeAreaView>
  );
}
