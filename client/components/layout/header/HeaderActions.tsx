import * as React from 'react';
import { View } from 'react-native';
import { Search, Bell, ShoppingCart, User } from 'lucide-react-native';
import { HeaderActionItem } from './HeaderActionItem';
import type { HeaderAction } from './types';
import { useCurrentUser } from '@/core/hooks/queries/useUser';
import { useUnreadNotificationCount } from '@/core/hooks/queries/useNotifications';

interface HeaderActionsProps {
  onUserIconPress?: () => void;
  onCartIconPress?: () => void;
  onNotificationIconPress?: () => void;
  onSearchIconPress?: () => void;
}

export function HeaderActions({
  onUserIconPress,
  onCartIconPress,
  onNotificationIconPress,
  onSearchIconPress,
}: HeaderActionsProps) {
  // Use TanStack Query for cached user data - deduplicates with other components
  const { data: user } = useCurrentUser();

  // Use TanStack Query for notification count - auto-refreshes
  const { data: notificationData } = useUnreadNotificationCount();
  const unreadCount = notificationData?.count ?? 0;

  const actionIcons: HeaderAction[] = [
    { icon: Search, label: 'Search', onPress: onSearchIconPress || (() => console.log('Search')) },
    {
      icon: Bell,
      label: 'Notifications',
      onPress: onNotificationIconPress || (() => console.log('Notifications')),
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    {
      icon: ShoppingCart,
      label: 'Cart',
      onPress: onCartIconPress || (() => console.log('Cart')),
      badge: 2,
    },
    {
      icon: User,
      label: 'Profile',
      onPress: onUserIconPress || (() => console.log('Profile')),
      image: user?.avatarUrl,
    },
  ];

  return (
    <View className="flex-row items-center gap-1">
      {actionIcons.map((action, index) => (
        <HeaderActionItem key={index} action={action} />
      ))}
    </View>
  );
}
