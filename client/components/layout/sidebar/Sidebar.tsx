/**
 * Unified Sidebar Component
 *
 * A flexible sidebar that supports multiple variants:
 * - user: User profile and settings
 * - cart: Shopping cart
 * - notification: Notifications list
 * - search: Search overlay (full screen on mobile)
 */

import * as React from 'react';
import { View, Modal, Pressable, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native';
import { SidebarHeader } from './SidebarHeader';
import { UserContent } from './UserContent';
import { CartContent } from './CartContent';
import { NotificationContent } from './NotificationContent';
import { SearchContent } from './SearchContent';
import type { SidebarProps } from './types';

export function Sidebar({ isOpen, onClose, variant, ...contentProps }: SidebarProps & any) {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;

  // Search variant uses full screen on mobile
  const isSearchVariant = variant === 'search';
  const sidebarWidth = isSearchVariant
    ? Math.min(width * 0.95, 700)
    : isLargeScreen
      ? 420
      : Math.min(width * 0.9, 380);

  // Get header configuration based on variant
  const getHeaderConfig = () => {
    switch (variant) {
      case 'user':
        return {
          title: 'Profile',
          subtitle: 'Manage your account & settings',
        };
      case 'cart':
        return {
          title: 'My Cart',
          subtitle: `${contentProps.items?.length || 0} ${
            contentProps.items?.length === 1 ? 'item' : 'items'
          } in your cart`,
          badge: contentProps.items?.reduce((acc: number, item: any) => acc + item.quantity, 0),
        };
      case 'notification':
        const unreadCount = contentProps.notifications?.filter((n: any) => !n.read).length || 0;
        return {
          title: 'Notifications',
          subtitle: `You have ${unreadCount} unread ${unreadCount === 1 ? 'message' : 'messages'}`,
          badge: unreadCount,
          onAction: unreadCount > 0 ? contentProps.onMarkAllRead : undefined,
          actionLabel: 'Mark all as read',
        };
      case 'search':
        return {
          title: 'Search',
          subtitle: 'Find pages, users, files...',
        };
      default:
        return {
          title: 'Sidebar',
          subtitle: '',
        };
    }
  };

  // Render content based on variant
  const renderContent = () => {
    switch (variant) {
      case 'user':
        return <UserContent {...contentProps} />;
      case 'cart':
        return <CartContent {...contentProps} />;
      case 'notification':
        return <NotificationContent {...contentProps} />;
      case 'search':
        return <SearchContent {...contentProps} />;
      default:
        return null;
    }
  };

  const headerConfig = getHeaderConfig();

  // Search variant uses centered modal layout
  if (isSearchVariant) {
    return (
      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={onClose}
        statusBarTranslucent>
        <View className="flex-1 bg-black/60">
          <Pressable className="flex-1 items-center pt-[15%]" onPress={onClose}>
            <Pressable
              className="mx-4 w-full max-w-2xl overflow-hidden rounded-2xl border border-border/50 bg-card shadow-2xl"
              style={{ width: sidebarWidth, maxHeight: 600 }}
              onPress={(e) => e.stopPropagation()}>
              <SidebarHeader variant={variant} onClose={onClose} {...headerConfig} />
              {renderContent()}
            </Pressable>
          </Pressable>
        </View>
      </Modal>
    );
  }

  // Standard sidebar layout (right side)
  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent>
      {/* Backdrop */}
      <Pressable className="flex-1 bg-black/70" onPress={onClose}>
        {/* Sidebar */}
        <Pressable
          className="absolute bottom-0 right-0 top-0 bg-card shadow-2xl"
          style={{
            width: sidebarWidth,
            shadowColor: '#000',
            shadowOffset: { width: -8, height: 0 },
            shadowOpacity: 0.5,
            shadowRadius: 20,
            elevation: 24,
          }}
          onPress={(e) => e.stopPropagation()}>
          <SafeAreaView edges={['top', 'right', 'bottom']} className="flex-1">
            <View className="flex-1">
              <SidebarHeader variant={variant} onClose={onClose} {...headerConfig} />

              <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                bounces={true}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ flexGrow: 1 }}>
                {renderContent()}
              </ScrollView>
            </View>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
