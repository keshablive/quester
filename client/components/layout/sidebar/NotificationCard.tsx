/**
 * Notification Card Component
 *
 * Individual notification item with type-based styling
 */

import * as React from 'react';
import { View, Pressable } from 'react-native';
import { Text, Card, CardContent, Badge } from '@/components/ui';
import { Info, CheckCircle, AlertTriangle, AlertCircle, Clock } from 'lucide-react-native';
import { cn, Row } from '@/core';
import type { NotificationItem } from './types';

interface NotificationCardProps {
  notification: NotificationItem;
  onPress: (id: string) => void;
}

export function NotificationCard({ notification, onPress }: NotificationCardProps) {
  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return CheckCircle;
      case 'warning':
        return AlertTriangle;
      case 'error':
        return AlertCircle;
      default:
        return Info;
    }
  };

  const getColor = () => {
    switch (notification.type) {
      case 'success':
        return 'text-green-500';
      case 'warning':
        return 'text-orange-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-blue-500';
    }
  };

  const getBgColor = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-green-500/10';
      case 'warning':
        return 'bg-orange-500/10';
      case 'error':
        return 'bg-red-500/10';
      default:
        return 'bg-blue-500/10';
    }
  };

  const IconComponent = getIcon();

  return (
    <Pressable onPress={() => onPress(notification.id)}>
      <Card
        className={cn(
          'transition-all',
          notification.read ? 'opacity-70' : 'border-l-4 border-l-primary'
        )}>
        <CardContent className="p-4">
          <Row className="gap-3">
            <View
              className={cn('h-10 w-10 items-center justify-center rounded-full', getBgColor())}>
              <IconComponent size={20} className={getColor()} />
            </View>

            <View className="flex-1">
              <Row className="mb-1 items-start justify-between">
                <Text
                  className={cn(
                    'flex-1 text-base font-bold',
                    notification.read ? 'text-muted-foreground' : 'text-foreground'
                  )}>
                  {notification.title}
                </Text>
                {!notification.read && <Badge variant="default" className="h-2 w-2 p-0" />}
              </Row>

              <Text className="mb-2 text-sm leading-5 text-muted-foreground">
                {notification.message}
              </Text>

              <Row className="items-center">
                <Clock size={12} className="mr-1.5 text-muted-foreground/60" />
                <Text className="text-xs font-medium text-muted-foreground/60">
                  {notification.time}
                </Text>
              </Row>
            </View>
          </Row>
        </CardContent>
      </Card>
    </Pressable>
  );
}
