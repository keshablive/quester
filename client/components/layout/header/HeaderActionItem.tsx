import * as React from 'react';
import { View, Pressable } from 'react-native';
import { Text, Avatar, AvatarImage, AvatarFallback } from '@/components/ui';
import { cn } from '@/core';
import type { HeaderAction } from './types';

interface HeaderActionItemProps {
  action: HeaderAction;
}

export function HeaderActionItem({ action }: HeaderActionItemProps) {
  return (
    <Pressable
      onPress={action.onPress}
      className={cn(
        'w-10 h-10 rounded-lg items-center justify-center relative',
        'hover:bg-accent active:bg-accent/80 transition-all'
      )}
    >
      {action.image ? (
        <Avatar className="w-8 h-8" alt={action.label}>
          <AvatarImage source={{ uri: action.image }} />
          <AvatarFallback>
            <action.icon 
              size={20} 
              className="text-muted-foreground" 
              strokeWidth={2}
            />
          </AvatarFallback>
        </Avatar>
      ) : (
        <action.icon 
          size={20} 
          className="text-muted-foreground" 
          strokeWidth={2}
        />
      )}
      {action.badge && action.badge > 0 && (
        <View className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full items-center justify-center border-2 border-card">
          <Text className="text-[10px] font-bold text-destructive-foreground">
            {action.badge > 9 ? '9+' : action.badge}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
