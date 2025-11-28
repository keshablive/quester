/**
 * User Content Component
 *
 * Displays user profile menu and actions
 */

import * as React from 'react';
import { View, Pressable } from 'react-native';
import { Text, Button, Separator, Card, CardContent } from '@/components/ui';
import { ChevronRight, LogOut } from 'lucide-react-native';
import { cn, Stack } from '@/core';
import { UserStatsCard } from '@/components/shared';
import type { UserContentProps } from './types';

export function UserContent({ menuItems, onSignOut }: UserContentProps) {
  return (
    <Stack className="flex-1">
      {/* User Stats */}
      <View className="px-6 py-5">
        <UserStatsCard />
      </View>

      {/* Menu Items */}
      <View className="px-6 py-2">
        <Text className="mb-4 text-xs font-black uppercase tracking-widest text-muted-foreground">
          Quick Actions
        </Text>
        <Stack className="gap-2.5">
          {menuItems.map((item, index) => (
            <Pressable key={index} onPress={item.onPress} className="relative">
              <Card className="border-0">
                <CardContent className="flex-row items-center p-4">
                  <View
                    className={cn(
                      'mr-3.5 h-12 w-12 items-center justify-center rounded-xl shadow-sm',
                      item.bgColor
                    )}>
                    <item.icon size={22} className={item.color} strokeWidth={2.5} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-bold tracking-tight text-foreground">
                      {item.label}
                    </Text>
                    <Text className="mt-0.5 text-xs font-medium text-muted-foreground">
                      {item.description}
                    </Text>
                  </View>
                  {item.badge && (
                    <View className="mr-2 h-6 min-w-[24px] items-center justify-center rounded-full bg-destructive px-2">
                      <Text className="text-xs font-bold text-destructive-foreground">
                        {item.badge}
                      </Text>
                    </View>
                  )}
                  <ChevronRight size={20} className="text-muted-foreground/60" strokeWidth={2.5} />
                </CardContent>
              </Card>
            </Pressable>
          ))}
        </Stack>
      </View>

      <View className="px-6">
        <Separator className="my-6" />
      </View>

      {/* Logout Button */}
      <View className="px-6 pb-6">
        <Button variant="destructive" size="lg" onPress={onSignOut} className="w-full">
          <LogOut size={20} className="mr-2" />
          <Text>Logout</Text>
        </Button>
      </View>
    </Stack>
  );
}
