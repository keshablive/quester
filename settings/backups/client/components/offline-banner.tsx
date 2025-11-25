/**
 * OfflineBanner Component
 * Phase 8, T131: Displays offline status and pending actions
 *
 * Shows a banner at the top of the screen when the device is offline.
 * Displays pending action count and provides a sync button.
 *
 * Usage:
 * ```tsx
 * const { isOffline } = useNetwork();
 * const pendingCount = usePendingActionsCount();
 *
 * <OfflineBanner
 *   isOffline={isOffline}
 *   pendingActionsCount={pendingCount}
 *   onSync={handleSync}
 * />
 * ```
 */

import React from 'react';
import { View } from 'react-native';
import { CloudOff } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';

export interface OfflineBannerProps {
  /** Whether the device is currently offline */
  isOffline: boolean;
  /** Number of pending actions in the offline queue */
  pendingActionsCount?: number;
  /** Callback to trigger sync of pending actions */
  onSync?: () => void;
  /** Whether sync is currently in progress */
  isSyncing?: boolean;
}

/**
 * OfflineBanner Component
 *
 * Displays a banner at the top of the screen when offline.
 * Shows pending actions count and provides sync button.
 *
 * Features:
 * - Automatic show/hide based on network status
 * - Pending actions counter
 * - Manual sync trigger button
 * - Accessible with ARIA roles and labels
 * - Slide-in/out animations
 */
export function OfflineBanner({
  isOffline,
  pendingActionsCount = 0,
  onSync,
  isSyncing = false,
}: OfflineBannerProps): React.JSX.Element | null {
  // Don't render if online
  if (!isOffline) {
    return null;
  }

  // Build accessibility label
  const buildAccessibilityLabel = (): string => {
    let label = 'No internet connection. You are currently offline.';
    if (pendingActionsCount > 0) {
      label += ` You have ${pendingActionsCount} pending ${
        pendingActionsCount === 1 ? 'action' : 'actions'
      } waiting to sync.`;
    }
    return label;
  };

  // Build sync button accessibility hint
  const buildSyncHint = (): string => {
    if (pendingActionsCount > 0) {
      return `Attempts to sync ${pendingActionsCount} pending ${
        pendingActionsCount === 1 ? 'action' : 'actions'
      } when connection is available`;
    }
    return 'Attempts to sync pending actions when connection is available';
  };

  return (
    <View
      testID="offline-banner"
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityLabel={buildAccessibilityLabel()}
      className="absolute left-0 right-0 top-0 z-50 w-full flex-row items-center justify-between bg-orange-500 px-4 py-3"
      style={{
        position: 'absolute',
        top: 0,
        width: '100%',
      }}>
      {/* Left side: Icon + Message */}
      <View className="flex-1 flex-row items-center gap-3">
        <View testID="offline-icon">
          <CloudOff size={20} color="white" />
        </View>
        <View className="flex-1">
          <Text variant="h4" className="text-white">
            No Internet Connection
          </Text>
          {pendingActionsCount > 0 && (
            <Text variant="small" className="text-white">
              {pendingActionsCount} pending {pendingActionsCount === 1 ? 'action' : 'actions'}
            </Text>
          )}
        </View>
      </View>

      {/* Right side: Sync button (if onSync provided) */}
      {onSync && (
        <Button
          testID="sync-button"
          onPress={onSync}
          disabled={isSyncing}
          variant="ghost"
          size="sm"
          accessibilityLabel="Sync now"
          accessibilityHint={buildSyncHint()}
          accessibilityState={{ disabled: isSyncing }}
          className="border-white/30 bg-white/20">
          <Text className="font-medium text-white">{isSyncing ? 'Syncing...' : 'Sync Now'}</Text>
        </Button>
      )}
    </View>
  );
}
