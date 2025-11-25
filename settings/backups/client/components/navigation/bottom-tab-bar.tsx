/**
 * BottomTabBar Component
 * Feature 003, T044: Bottom tab navigation with notification badges
 * Feature 003, T139: Offline indicator with pending actions count
 *
 * Displays bottom navigation tabs with:
 * - Tab labels and icons
 * - Notification badges
 * - Active state highlighting
 * - Offline indicator with pending queue count
 * - Accessibility support
 */

import React from 'react';
import { View, Pressable, Platform } from 'react-native';
import { Text } from '@/components/ui/text';
import { useNavigation } from '@/lib/contexts/navigation-context';
import { useNetwork } from '@/lib/hooks/useNetwork';
import { useOfflineQueue } from '@/lib/hooks/use-offline-queue';
import * as Icons from 'lucide-react-native';

export interface TabItem {
  name: string;
  label: string;
  icon: string;
}

export interface BottomTabBarProps {
  tabs: TabItem[];
  activeTab: string;
  onTabPress: (tabName: string) => void;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = React.memo(
  ({ tabs, activeTab, onTabPress }) => {
    const { notificationCounts, trackFeature, clearNotificationCount } = useNavigation();

    // Phase 8, T139: Offline status and pending actions
    const { isOffline } = useNetwork();
    const { pendingCount, isSyncing } = useOfflineQueue({ autoSync: true });

    // Optimized with useCallback (Phase 7, T114)
    const handleTabPress = React.useCallback(
      (tabName: string) => {
        // Track the feature
        trackFeature(tabName as any);

        // Clear notifications for this tab
        clearNotificationCount(tabName as any);

        // Call parent handler
        onTabPress(tabName);
      },
      [trackFeature, clearNotificationCount, onTabPress]
    );

    const getNotificationCount = (tabName: string): number => {
      return (notificationCounts as any)[tabName] || 0;
    };

    const formatBadgeCount = (count: number): string => {
      if (count > 99) return '99+';
      return count.toString();
    };

    return (
      <View
        testID="bottom-tab-bar-container"
        className="safe-area-bottom absolute bottom-0 left-0 right-0">
        {/* Phase 8, T139: Offline Indicator */}
        {isOffline && (
          <View
            testID="offline-indicator"
            className="flex-row items-center justify-center gap-2 border-t border-orange-200 bg-orange-50 px-4 py-2"
            accessibilityRole="alert"
            accessibilityLabel={`You are offline${pendingCount > 0 ? `, ${pendingCount} pending actions` : ''}`}
            accessibilityLiveRegion="polite">
            <Icons.WifiOff size={16} color="#ea580c" />
            <Text variant="small" className="font-medium text-orange-600">
              {isSyncing
                ? 'Syncing...'
                : pendingCount > 0
                  ? `Offline • ${pendingCount} pending`
                  : 'Offline'}
            </Text>
            {isSyncing && <Icons.Loader2 size={14} color="#ea580c" className="animate-spin" />}
          </View>
        )}

        {/* Tab Bar */}
        <View
          className="flex-row border-t border-gray-200 bg-white"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 3,
            elevation: 8,
          }}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.name;
            const notificationCount = getNotificationCount(tab.name);
            const hasNotifications = notificationCount > 0;

            // Get icon component
            const IconComponent = (Icons as any)[tab.icon] || Icons.Circle;

            return (
              <Pressable
                key={tab.name}
                testID={`tab-${tab.name}`}
                onPress={() => handleTabPress(tab.name)}
                className="flex-1 items-center justify-center py-2"
                style={{ minHeight: Platform.OS === 'ios' ? 44 : 48 }}
                accessible={true}
                accessibilityRole="tab"
                accessibilityLabel={`${tab.label}${hasNotifications ? `, ${notificationCount} notifications` : ''}`}
                accessibilityHint={
                  hasNotifications ? `${notificationCount} unread notifications` : undefined
                }
                accessibilityState={{ selected: isActive }}>
                <View className="relative items-center">
                  <IconComponent
                    size={24}
                    color={isActive ? '#3b82f6' : '#6b7280'}
                    className={isActive ? 'text-blue-500' : 'text-gray-500'}
                  />

                  {hasNotifications && (
                    <View
                      testID={`badge-${tab.name}`}
                      className="absolute -right-2 -top-1 h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1"
                      style={{
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.2,
                        shadowRadius: 1,
                        elevation: 2,
                      }}>
                      <Text
                        variant="small"
                        className="font-bold text-white"
                        style={{ fontSize: 10 }}>
                        {formatBadgeCount(notificationCount)}
                      </Text>
                    </View>
                  )}
                </View>

                <Text
                  variant="small"
                  className={`mt-1 ${isActive ? 'font-semibold text-blue-500' : 'text-gray-600'}`}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }
);

BottomTabBar.displayName = 'BottomTabBar';
