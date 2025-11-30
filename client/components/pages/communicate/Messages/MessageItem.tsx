import * as React from 'react';
import { View } from 'react-native';
import { Text, Avatar, AvatarFallback, AvatarImage, Icon } from '@/components/ui';
import { Clock, Users } from 'lucide-react-native';
import type { LegacyMessage } from './types';

interface MessageItemProps {
  message: LegacyMessage;
  isLast: boolean;
  /** Whether this is a group conversation (T049) */
  isGroup?: boolean;
}

/**
 * MessageItem Component
 *
 * Displays a message preview item in a conversation list.
 * FR-005: Wrapped with React.memo to prevent unnecessary re-renders during scroll.
 */
function MessageItemComponent({ message, isLast, isGroup = false }: MessageItemProps) {
  return (
    <View
      className={`flex-row items-center gap-3 p-4 ${
        !isLast ? 'border-b border-border' : ''
      } ${message.unread ? 'bg-primary/5' : ''}`}>
      {/* Avatar with group indicator (T049) */}
      <View className="relative">
        <Avatar alt={message.sender} className="h-12 w-12">
          {isGroup ? (
            <AvatarFallback className="bg-primary/10">
              <Icon as={Users} size={20} className="text-primary" />
            </AvatarFallback>
          ) : (
            <AvatarFallback>
              <Text className="text-sm font-medium">{message.initials}</Text>
            </AvatarFallback>
          )}
        </Avatar>
        {/* Group badge indicator (T049) */}
        {isGroup && (
          <View className="absolute -bottom-1 -right-1 rounded-full bg-primary p-0.5">
            <Icon as={Users} size={10} className="text-primary-foreground" />
          </View>
        )}
      </View>

      <View className="flex-1 gap-1">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Text
              className={`font-semibold ${message.unread ? 'text-foreground' : 'text-foreground'}`}>
              {message.sender}
            </Text>
            {/* Group label (T049) */}
            {isGroup && (
              <View className="rounded bg-muted px-1.5 py-0.5">
                <Text className="text-xs text-muted-foreground">Group</Text>
              </View>
            )}
          </View>
          <View className="flex-row items-center gap-1">
            <Icon as={Clock} size={12} className="text-muted-foreground" />
            <Text className="text-xs text-muted-foreground">{message.time}</Text>
          </View>
        </View>
        <View className="flex-row items-center gap-2">
          <Text
            className={`flex-1 text-sm ${
              message.unread ? 'font-medium text-foreground' : 'text-muted-foreground'
            }`}
            numberOfLines={1}>
            {message.preview}
          </Text>
          {message.unread && <View className="h-2 w-2 rounded-full bg-primary" />}
        </View>
      </View>
    </View>
  );
}

/**
 * Custom comparison function for MessageItem memoization (FR-005, FR-016)
 * Compares only the properties that affect rendering
 * Note: LegacyMessage doesn't have an id, so we compare all fields
 */
function areMessagePropsEqual(prevProps: MessageItemProps, nextProps: MessageItemProps): boolean {
  const prevMsg = prevProps.message;
  const nextMsg = nextProps.message;

  return (
    prevMsg.sender === nextMsg.sender &&
    prevMsg.preview === nextMsg.preview &&
    prevMsg.time === nextMsg.time &&
    prevMsg.unread === nextMsg.unread &&
    prevMsg.initials === nextMsg.initials &&
    prevProps.isLast === nextProps.isLast &&
    prevProps.isGroup === nextProps.isGroup
  );
}

/**
 * Memoized MessageItem export (FR-005)
 * Prevents re-renders when scrolling through message list
 */
export const MessageItem = React.memo(MessageItemComponent, areMessagePropsEqual);
