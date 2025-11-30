/**
 * AdminDashboard Component
 *
 * Admin dashboard with real-time stats using TanStack Query.
 * Supports automatic 5-minute refresh, stale data indicator, and error retry.
 *
 * US3: Admin Dashboard with Real-time Stats (Priority: P2)
 * FR-009: useAdminStats() returns cached dashboard data
 * FR-011: 5-minute auto-refresh while visible
 *
 * @module components/pages/admin/AdminDashboard
 */

import React, { useState, useCallback } from 'react';
import { View, ScrollView, ActivityIndicator, Pressable, RefreshControl } from 'react-native';
import { Text, Skeleton } from '@/components/ui';
import { adminService, useAdminStats, cn } from '@/core';
import { Shield, Key, FileText, BarChart3, RefreshCw, Clock } from 'lucide-react-native';
import { StaleDataIndicator, ErrorState, OfflineIndicator } from '@/components/shared';

import { EncryptionKey, AuditLogEntry } from './types';

// ============================================================================
// Sub-components
// ============================================================================

/**
 * T036: Skeleton loaders for slow API responses
 */
function DashboardSkeleton() {
  return (
    <View className="flex-1 bg-background">
      {/* Header skeleton */}
      <View className="border-b border-border bg-card px-5 py-5">
        <View className="flex-row items-center">
          <Skeleton className="h-8 w-8 rounded" />
          <View className="ml-4 flex-1">
            <Skeleton className="mb-1 h-7 w-48" />
            <Skeleton className="h-4 w-32" />
          </View>
        </View>
      </View>

      {/* Stats cards skeleton */}
      <View className="flex-row gap-3 p-4">
        {[1, 2, 3].map((i) => (
          <View key={i} className="flex-1 items-center rounded-xl bg-card p-4">
            <Skeleton className="mb-2 h-6 w-6 rounded" />
            <Skeleton className="mb-1 h-8 w-12" />
            <Skeleton className="h-3 w-16" />
          </View>
        ))}
      </View>

      {/* Actions skeleton */}
      <View className="p-4">
        <Skeleton className="mb-4 h-6 w-24" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </View>

      {/* Keys skeleton */}
      <View className="p-4">
        <Skeleton className="mb-4 h-6 w-36" />
        {[1, 2].map((i) => (
          <View key={i} className="mb-3 rounded-xl border border-border bg-card p-4">
            <View className="mb-3 flex-row items-center">
              <Skeleton className="mr-2 h-5 w-5 rounded" />
              <Skeleton className="h-5 w-24 flex-1" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </View>
            <Skeleton className="mb-1 h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * T034: "Last updated" timestamp display
 */
function LastUpdatedIndicator({ timestamp }: { timestamp: number }) {
  const formatTime = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View className="flex-row items-center justify-center bg-muted/30 py-2">
      <Clock size={12} className="mr-1 text-muted-foreground" />
      <Text className="text-xs text-muted-foreground">Last updated: {formatTime(timestamp)}</Text>
    </View>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * AdminDashboard
 *
 * T032: Migrated from useState/useEffect to useAdminStats() hook
 * T033: Auto-refresh with refetchInterval: 5 * 60 * 1000
 * T034: StaleDataIndicator with "last updated" timestamp
 * T035: Error state with retry button
 * T036: Skeleton loaders for slow API responses (>3s)
 *
 * @example
 * ```tsx
 * function AdminPage() {
 *   return <AdminDashboard />;
 * }
 * ```
 */
export function AdminDashboard() {
  // T032: Use TanStack Query hook instead of useState/useEffect
  // T033: Auto-refresh with 5-minute interval (FR-011)
  const {
    data: stats,
    isLoading,
    isRefetching,
    error,
    refetch,
    dataUpdatedAt,
  } = useAdminStats({
    refetchInterval: 5 * 60 * 1000, // 5 minutes
    refetchIntervalInBackground: false, // Only when visible
  });

  // Additional data that isn't in the main hook yet
  const [keys, setKeys] = useState<EncryptionKey[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [keysLoading, setKeysLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Load additional data
  React.useEffect(() => {
    async function loadAdditionalData() {
      try {
        setKeysLoading(true);
        const [keysData, auditData] = await Promise.all([
          adminService.listKeys(),
          adminService.getAuditLog(),
        ]);
        setKeys(keysData);
        setAuditLog(auditData.slice(0, 5)); // Show only recent 5
      } catch (err) {
        console.error('Failed to load keys/audit:', err);
      } finally {
        setKeysLoading(false);
      }
    }
    loadAdditionalData();
  }, []);

  const handleRefresh = useCallback(async () => {
    await refetch();
    // Also refresh keys and audit log
    try {
      const [keysData, auditData] = await Promise.all([
        adminService.listKeys(),
        adminService.getAuditLog(),
      ]);
      setKeys(keysData);
      setAuditLog(auditData.slice(0, 5));
    } catch (err) {
      console.error('Failed to refresh keys/audit:', err);
    }
  }, [refetch]);

  const handleRotateDEK = async () => {
    try {
      setActionLoading(true);
      await adminService.rotateDEK();
      await handleRefresh(); // Reload to show new key
    } catch (err) {
      console.error('Failed to rotate DEK:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // T036: Skeleton for initial loading (>3s threshold handled via suspense in future)
  if (isLoading && !stats) {
    return <DashboardSkeleton />;
  }

  // T035: Error state with retry button
  if (error && !stats) {
    return (
      <View className="flex-1 bg-background">
        <OfflineIndicator />
        <ErrorState
          title="Failed to Load Dashboard"
          message={error.message || 'An error occurred'}
          onRetry={handleRefresh}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <OfflineIndicator />

      {/* T034: StaleDataIndicator */}
      {dataUpdatedAt && (
        <StaleDataIndicator
          dataUpdatedAt={dataUpdatedAt}
          staleThreshold={5 * 60 * 1000} // 5 minutes
          showTimestamp
        />
      )}

      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} />}>
        {/* Header */}
        <View className="border-b border-border bg-card px-5 py-5">
          <View className="flex-row items-center">
            <Shield size={32} className="text-primary" />
            <View className="ml-4 flex-1">
              <Text className="text-2xl font-bold text-foreground">Admin Dashboard</Text>
              <Text className="mt-0.5 text-sm text-muted-foreground">KMS Management</Text>
            </View>
            {/* FR-023: Background refetch indicator */}
            {isRefetching && <ActivityIndicator size="small" className="text-primary" />}
          </View>
        </View>

        {/* T034: Last updated timestamp */}
        {dataUpdatedAt && <LastUpdatedIndicator timestamp={dataUpdatedAt} />}

        {/* Stats Cards */}
        {stats && (
          <View className="flex-row gap-3 p-4">
            <View className="flex-1 items-center rounded-xl bg-card p-4 shadow-sm">
              <Key size={24} className="text-emerald-500" />
              <Text className="mt-2 text-2xl font-bold text-foreground">
                {stats.totalUsers || 0}
              </Text>
              <Text className="mt-1 text-xs text-muted-foreground">Total Users</Text>
            </View>

            <View className="flex-1 items-center rounded-xl bg-card p-4 shadow-sm">
              <Shield size={24} className="text-primary" />
              <Text className="mt-2 text-2xl font-bold text-foreground">
                {stats.activeUsers || 0}
              </Text>
              <Text className="mt-1 text-xs text-muted-foreground">Active Users</Text>
            </View>

            <View className="flex-1 items-center rounded-xl bg-card p-4 shadow-sm">
              <BarChart3 size={24} className="text-amber-500" />
              <Text className="mt-2 text-2xl font-bold text-foreground">
                {stats.completedQuests || 0}
              </Text>
              <Text className="mt-1 text-xs text-muted-foreground">Completed Quests</Text>
            </View>
          </View>
        )}

        {/* Actions */}
        <View className="p-4">
          <Text className="mb-4 text-lg font-semibold text-foreground">Actions</Text>

          <Pressable
            className={cn(
              'flex-row items-center justify-center gap-2 rounded-lg bg-primary py-3.5',
              actionLoading && 'opacity-60'
            )}
            onPress={handleRotateDEK}
            disabled={actionLoading}>
            {actionLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <RefreshCw size={20} className="text-primary-foreground" />
                <Text className="text-base font-semibold text-primary-foreground">Rotate DEK</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Encryption Keys */}
        <View className="p-4">
          <Text className="mb-4 text-lg font-semibold text-foreground">Encryption Keys</Text>

          {keysLoading ? (
            <View className="gap-3">
              {[1, 2].map((i) => (
                <View key={i} className="rounded-xl border border-border bg-card p-4">
                  <Skeleton className="mb-2 h-5 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </View>
              ))}
            </View>
          ) : keys.length === 0 ? (
            <Text className="text-sm italic text-muted-foreground">No keys found</Text>
          ) : (
            keys.map((key, index) => (
              <View key={index} className="mb-3 rounded-xl border border-border bg-card p-4">
                <View className="mb-3 flex-row items-center gap-2">
                  <Key size={20} className="text-primary" />
                  <Text className="flex-1 text-base font-semibold text-foreground">
                    Version {key.version || index + 1}
                  </Text>
                  <View
                    className={cn(
                      'rounded-full px-2 py-1',
                      key.status === 'active'
                        ? 'bg-emerald-100 dark:bg-emerald-900/30'
                        : key.status === 'rotated'
                          ? 'bg-red-100 dark:bg-red-900/30'
                          : 'bg-muted'
                    )}>
                    <Text
                      className={cn(
                        'text-[10px] font-bold uppercase',
                        key.status === 'active'
                          ? 'text-emerald-800 dark:text-emerald-300'
                          : key.status === 'rotated'
                            ? 'text-red-800 dark:text-red-300'
                            : 'text-muted-foreground'
                      )}>
                      {key.status || 'active'}
                    </Text>
                  </View>
                </View>

                <View className="mb-1 flex-row">
                  <Text className="w-24 text-sm text-muted-foreground">Algorithm:</Text>
                  <Text className="text-sm font-medium text-foreground">
                    {key.algorithm || 'AES-256-GCM'}
                  </Text>
                </View>

                {key.createdAt && (
                  <View className="flex-row">
                    <Text className="w-24 text-sm text-muted-foreground">Created:</Text>
                    <Text className="text-sm font-medium text-foreground">
                      {new Date(key.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                )}
              </View>
            ))
          )}
        </View>

        {/* Audit Log */}
        <View className="p-4 pb-8">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-foreground">Recent Audit Log</Text>
            <FileText size={20} className="text-muted-foreground" />
          </View>

          {auditLog.length === 0 ? (
            <Text className="text-sm italic text-muted-foreground">No audit entries</Text>
          ) : (
            auditLog.map((entry, index) => (
              <View key={index} className="mb-4 flex-row items-start">
                <View className="mr-3 mt-1.5 h-2 w-2 rounded-full bg-primary" />
                <View className="flex-1">
                  <Text className="mb-0.5 text-sm font-medium text-foreground">
                    {entry.action || 'Key operation'}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : 'Recent'}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
