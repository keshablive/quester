import * as React from 'react';
import { View, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { cn } from '@/core';
import { Text, Icon } from '@/components/ui';
import { NavigationItemProps } from './types';

export const NavigationItem = React.memo(
  ({ item, isActive, isExpanded, orientation }: NavigationItemProps) => {
    const containerClasses = React.useMemo(
      () =>
        cn(
          'items-center justify-center transition-all',
          isExpanded
            ? orientation === 'vertical'
              ? 'w-[calc(50%-8px)] p-2'
              : 'w-[30%] p-2'
            : orientation === 'vertical'
              ? 'w-full py-3'
              : 'px-4 py-2'
        ),
      [isExpanded, orientation]
    );

    const iconContainerClasses = React.useMemo(
      () =>
        cn(
          'items-center justify-center transition-all rounded-2xl w-12 h-12',
          isExpanded && 'mb-2',
          isActive ? 'bg-secondary' : 'bg-transparent hover:bg-muted/50'
        ),
      [isExpanded, isActive]
    );

    const iconSize = isExpanded ? 24 : 20;

    return (
      <Link href={item.href as any} asChild>
        <Pressable className={containerClasses}>
          {/* Icon Container */}
          <View className={iconContainerClasses}>
            <item.icon
              size={iconSize}
              className={cn(isActive ? 'text-foreground' : 'text-muted-foreground')}
              strokeWidth={2.5}
            />
          </View>

          {/* Label (Visible when expanded) */}
          {isExpanded && (
            <Text
              className={cn(
                'text-center text-xs font-semibold',
                isActive ? 'text-foreground' : 'text-muted-foreground'
              )}
              numberOfLines={1}>
              {item.label}
            </Text>
          )}
        </Pressable>
      </Link>
    );
  }
);
