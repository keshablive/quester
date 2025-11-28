/**
 * Unified Sidebar Header Component
 *
 * A flexible header that adapts to different sidebar variants
 */

import * as React from 'react';
import { View, Pressable } from 'react-native';
import { Text, Button, Badge } from '@/components/ui';
import { X } from 'lucide-react-native';
import { cn, Stack, Row } from '@/core';
import type { SidebarHeaderProps } from './types';

export function SidebarHeader({
  onClose,
  variant,
  title,
  subtitle,
  badge,
  onAction,
  actionLabel,
  actionIcon: ActionIcon,
}: SidebarHeaderProps) {
  return (
    <View className="bg-gradient-to-b from-primary/5 to-transparent px-6 py-5">
      <Row className="mb-2 items-center justify-between">
        <View className="flex-1">
          <Row className="items-center gap-3">
            <Text className="text-3xl font-black tracking-tight text-foreground">{title}</Text>
            {badge !== undefined && badge > 0 && (
              <Badge variant="default" className="h-6 min-w-[24px] px-2">
                <Text className="text-xs font-bold text-primary-foreground">
                  {badge > 99 ? '99+' : badge}
                </Text>
              </Badge>
            )}
          </Row>
          <Text className="mt-1.5 text-xs font-medium text-muted-foreground">{subtitle}</Text>
        </View>

        <Pressable
          onPress={onClose}
          className="h-11 w-11 items-center justify-center rounded-xl bg-muted/60 shadow-sm active:bg-muted/80">
          <X size={20} className="text-foreground" strokeWidth={2.5} />
        </Pressable>
      </Row>

      {onAction && actionLabel && (
        <Button variant="ghost" size="sm" onPress={onAction} className="-ml-2 mt-2 self-start">
          {ActionIcon && <ActionIcon size={14} className="mr-2 text-primary" />}
          <Text className="text-xs font-bold text-primary">{actionLabel}</Text>
        </Button>
      )}
    </View>
  );
}
