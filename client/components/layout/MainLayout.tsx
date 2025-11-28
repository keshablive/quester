import * as React from 'react';
import { View } from 'react-native';
import { AppHeader } from './header';
import { NavigationRail, BottomNavigationBar } from './navigation';
import { Sidebar } from './sidebar';
import { useResponsive, useToggle } from '@/core';

import { MainLayoutProps } from './types';

export function MainLayout({ children }: MainLayoutProps) {
  const { isDesktop, isTablet } = useResponsive();
  const [isExpanded, toggleExpanded] = useToggle(false);
  const [isUserSidebarOpen, toggleUserSidebar] = useToggle(false);
  const [isCartOpen, toggleCart] = useToggle(false);
  const [isNotificationOpen, toggleNotification] = useToggle(false);
  const [isSearchOpen, toggleSearch] = useToggle(false);
  const showNavigationRail = isDesktop || isTablet;

  return (
    <View className="flex-1 flex-row bg-background">
      {/* Navigation Rail - Desktop/Tablet */}
      {showNavigationRail && <NavigationRail isExpanded={isExpanded} onToggle={toggleExpanded} />}

      <View className="flex-1">
        {/* Header */}
        <AppHeader
          onUserIconPress={toggleUserSidebar}
          onCartIconPress={toggleCart}
          onNotificationIconPress={toggleNotification}
          onSearchIconPress={toggleSearch}
        />

        {/* Main Content */}
        <View className="flex-1">{children}</View>

        {/* Bottom Navigation - Mobile */}
        {!showNavigationRail && (
          <BottomNavigationBar isExpanded={isExpanded} onToggle={toggleExpanded} />
        )}
      </View>

      {/* Sidebars & Overlays */}
      <Sidebar
        variant="user"
        isOpen={isUserSidebarOpen}
        onClose={toggleUserSidebar}
        menuItems={[]}
        onSignOut={() => {}}
      />
      <Sidebar
        variant="cart"
        isOpen={isCartOpen}
        onClose={toggleCart}
        items={[]}
        onUpdateQuantity={() => {}}
        onRemove={() => {}}
        onCheckout={() => {}}
      />
      <Sidebar
        variant="notification"
        isOpen={isNotificationOpen}
        onClose={toggleNotification}
        notifications={[]}
        onMarkAsRead={() => {}}
        onMarkAllRead={() => {}}
        onViewMessages={() => {}}
      />
      <Sidebar
        variant="search"
        isOpen={isSearchOpen}
        onClose={toggleSearch}
        query=""
        onQueryChange={() => {}}
        onClear={() => {}}
        results={[]}
        onSelect={() => {}}
      />
    </View>
  );
}
