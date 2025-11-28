/**
 * Sidebar Usage Examples
 *
 * This file demonstrates how to use the unified sidebar system
 * with all its variants.
 */

import * as React from 'react';
import { View } from 'react-native';
import { User, Settings, Bell, HelpCircle } from 'lucide-react-native';
import { router } from 'expo-router';
import { Sidebar } from '@/components/layout';
import { useAuth } from '@/core/auth/AuthContext';
import { ROUTES } from '@/core';
import type {
  MenuItem,
  CartItem,
  NotificationItem,
  SearchResult,
} from '@/components/layout/sidebar';

export function SidebarExamples() {
  // State for different sidebars
  const [userSidebarOpen, setUserSidebarOpen] = React.useState(false);
  const [cartSidebarOpen, setCartSidebarOpen] = React.useState(false);
  const [notificationSidebarOpen, setNotificationSidebarOpen] = React.useState(false);
  const [searchOverlayOpen, setSearchOverlayOpen] = React.useState(false);

  const { signOut } = useAuth();

  // ==================== USER SIDEBAR ====================
  const userMenuItems: MenuItem[] = [
    {
      icon: User,
      label: 'My Profile',
      description: 'View and edit your profile',
      color: 'text-blue-600',
      bgColor: 'bg-blue-500/10',
      onPress: () => {
        setUserSidebarOpen(false);
        router.push(`/${ROUTES.PROFILE}`);
      },
    },
    {
      icon: Settings,
      label: 'Settings',
      description: 'Customize app preferences',
      color: 'text-purple-600',
      bgColor: 'bg-purple-500/10',
      onPress: () => {
        setUserSidebarOpen(false);
        router.push(`/${ROUTES.SETTINGS}`);
      },
    },
    {
      icon: Bell,
      label: 'Notifications',
      description: 'Manage your alerts',
      color: 'text-orange-600',
      bgColor: 'bg-orange-500/10',
      badge: 5, // Optional badge
      onPress: () => console.log('Notifications'),
    },
    {
      icon: HelpCircle,
      label: 'Help & Support',
      description: 'Get assistance anytime',
      color: 'text-green-600',
      bgColor: 'bg-green-500/10',
      onPress: () => console.log('Help'),
    },
  ];

  // ==================== CART SIDEBAR ====================
  const [cartItems, setCartItems] = React.useState<CartItem[]>([
    { id: '1', title: 'Premium UI Kit', price: 49.0, quantity: 1, image: 'ui-kit' },
    { id: '2', title: 'Icon Pack Pro', price: 29.0, quantity: 2, image: 'icons' },
    { id: '3', title: 'React Native Course', price: 99.0, quantity: 1, image: 'course' },
  ]);

  const handleUpdateQuantity = (id: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = Math.max(0, item.quantity + delta);
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const handleRemoveItem = (id: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleCheckout = () => {
    console.log('Checkout', cartItems);
    setCartSidebarOpen(false);
  };

  // ==================== NOTIFICATION SIDEBAR ====================
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([
    {
      id: '1',
      title: 'Project Approved',
      message: 'Your project "Quester App" has been approved by the admin.',
      time: '2 hours ago',
      read: false,
      type: 'success',
    },
    {
      id: '2',
      title: 'System Maintenance',
      message: 'Scheduled maintenance will occur tonight at 2:00 AM EST.',
      time: '5 hours ago',
      read: false,
      type: 'warning',
    },
    {
      id: '3',
      title: 'New Comment',
      message: 'Alex commented on your task "Design System Update".',
      time: '1 day ago',
      read: true,
      type: 'info',
    },
    {
      id: '4',
      title: 'Payment Failed',
      message: 'Your subscription renewal payment failed. Please update your card.',
      time: '2 days ago',
      read: true,
      type: 'error',
    },
  ]);

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item))
    );
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
  };

  const handleViewMessages = () => {
    setNotificationSidebarOpen(false);
    router.push(`/${ROUTES.MESSAGES}`);
  };

  // ==================== SEARCH OVERLAY ====================
  const [searchQuery, setSearchQuery] = React.useState('');

  const allSearchResults: SearchResult[] = [
    { id: '1', title: 'Dashboard', subtitle: 'Page', type: 'page', href: '/dashboard' },
    {
      id: '2',
      title: 'Profile Settings',
      subtitle: 'Settings',
      type: 'setting',
      href: '/settings',
    },
    { id: '3', title: 'Alex Johnson', subtitle: 'User', type: 'user' },
    { id: '4', title: 'Q4 Report.pdf', subtitle: 'File', type: 'file' },
    {
      id: '5',
      title: 'Analytics Overview',
      subtitle: 'Page',
      type: 'page',
      href: '/analytics',
    },
  ];

  const filteredSearchResults = React.useMemo(() => {
    if (!searchQuery) return [];
    return allSearchResults.filter(
      (item) =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const handleSearchSelect = (result: SearchResult) => {
    console.log('Selected:', result);
    if (result.href) {
      router.push(result.href as any); // Type assertion for dynamic routes
    }
    setSearchOverlayOpen(false);
    setSearchQuery('');
  };

  return (
    <View>
      {/* USER SIDEBAR */}
      <Sidebar
        variant="user"
        isOpen={userSidebarOpen}
        onClose={() => setUserSidebarOpen(false)}
        menuItems={userMenuItems}
        onSignOut={signOut}
      />

      {/* CART SIDEBAR */}
      <Sidebar
        variant="cart"
        isOpen={cartSidebarOpen}
        onClose={() => setCartSidebarOpen(false)}
        items={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemove={handleRemoveItem}
        onCheckout={handleCheckout}
      />

      {/* NOTIFICATION SIDEBAR */}
      <Sidebar
        variant="notification"
        isOpen={notificationSidebarOpen}
        onClose={() => setNotificationSidebarOpen(false)}
        notifications={notifications}
        onMarkAsRead={handleMarkAsRead}
        onMarkAllRead={handleMarkAllRead}
        onViewMessages={handleViewMessages}
      />

      {/* SEARCH OVERLAY */}
      <Sidebar
        variant="search"
        isOpen={searchOverlayOpen}
        onClose={() => setSearchOverlayOpen(false)}
        query={searchQuery}
        onQueryChange={setSearchQuery}
        onClear={() => setSearchQuery('')}
        results={filteredSearchResults}
        onSelect={handleSearchSelect}
      />
    </View>
  );
}
