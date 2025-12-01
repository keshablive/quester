/**
 * Transaction List Component
 *
 * Displays user transactions with infinite scroll, offline support,
 * and pull-to-refresh functionality.
 *
 * US1: Transaction History with Offline Access
 *
 * @module components/features/transactions/TransactionList
 */

import React from 'react';
import { View, FlatList, ActivityIndicator, Pressable } from 'react-native';
import { Text } from '@/components/ui';
import { useInfiniteTransactions } from '@/core/hooks/queries';
import type { Transaction } from '@/core/types/query.types';
import {
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle2,
  XCircle,
  WifiOff,
  RefreshCw,
} from 'lucide-react-native';
import { cn } from '@/core';

import { TransactionListProps } from './types';

// One hour in milliseconds - threshold for stale data warning
const STALE_THRESHOLD_MS = 60 * 60 * 1000;

/**
 * Offline Indicator Component (FR-012)
 *
 * Shows when displaying stale/cached data
 */
function OfflineIndicator({ dataUpdatedAt }: { dataUpdatedAt: number }) {
  const isVeryStale = Date.now() - dataUpdatedAt > STALE_THRESHOLD_MS;
  const lastUpdated = new Date(dataUpdatedAt).toLocaleTimeString();

  return (
    <View
      className={cn(
        'mx-4 mb-4 flex-row items-center rounded-lg px-4 py-2',
        isVeryStale ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-blue-100 dark:bg-blue-900/30'
      )}>
      <WifiOff
        size={16}
        className={cn(
          isVeryStale ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'
        )}
      />
      <Text
        className={cn(
          'ml-2 text-sm',
          isVeryStale ? 'text-amber-700 dark:text-amber-300' : 'text-blue-700 dark:text-blue-300'
        )}>
        {isVeryStale
          ? `Data may be outdated (last updated: ${lastUpdated})`
          : `Viewing offline data (updated: ${lastUpdated})`}
      </Text>
    </View>
  );
}

export function TransactionList({ onTransactionPress }: TransactionListProps) {
  // US1: Use TanStack Query for caching, offline support, and instant display
  const {
    data: transactions,
    isLoading,
    isRefreshing,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isStale,
    dataUpdatedAt,
  } = useInfiniteTransactions();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 size={16} className="text-emerald-500" />;
      case 'pending':
        return <Clock size={16} className="text-amber-500" />;
      case 'failed':
        return <XCircle size={16} className="text-destructive" />;
      default:
        return <Clock size={16} className="text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-emerald-500';
      case 'pending':
        return 'text-amber-500';
      case 'failed':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  const getTransactionDescription = (item: Transaction) => {
    if (item.description) return item.description;
    // Derive description from type if not available
    const typeLabel = item.type.charAt(0).toUpperCase() + item.type.slice(1);
    return `${typeLabel} Transaction`;
  };

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <Pressable
      className="mb-3 flex-row items-center rounded-xl border border-border bg-card p-4"
      onPress={() => onTransactionPress?.(item)}>
      <View
        className={cn(
          'mr-3 h-10 w-10 items-center justify-center rounded-full',
          item.type === 'credit'
            ? 'bg-emerald-100 dark:bg-emerald-900/30'
            : 'bg-red-100 dark:bg-red-900/30'
        )}>
        {item.type === 'credit' ? (
          <ArrowDownLeft size={20} className="text-emerald-600 dark:text-emerald-400" />
        ) : (
          <ArrowUpRight size={20} className="text-red-600 dark:text-red-400" />
        )}
      </View>

      <View className="flex-1">
        <Text className="mb-0.5 text-base font-semibold text-foreground">
          {getTransactionDescription(item)}
        </Text>
        <Text className="text-xs text-muted-foreground">
          {new Date(item.createdAt).toLocaleDateString()} •{' '}
          {new Date(item.createdAt).toLocaleTimeString()}
        </Text>
      </View>

      <View className="items-end">
        <Text
          className={cn(
            'mb-1 text-base font-bold',
            item.type === 'credit' ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'
          )}>
          {item.type === 'credit' ? '+' : '-'}${item.amount.toFixed(2)}
        </Text>
        <View className="flex-row items-center gap-1">
          {getStatusIcon(item.status)}
          <Text className={cn('text-xs capitalize', getStatusColor(item.status))}>
            {item.status}
          </Text>
        </View>
      </View>
    </Pressable>
  );

  const renderHeader = () => (
    <View className="mb-6">
      {/* FR-012: Show offline indicator when data is stale */}
      {isStale && dataUpdatedAt > 0 && <OfflineIndicator dataUpdatedAt={dataUpdatedAt} />}

      <View className="flex-row items-center rounded-xl border border-border bg-card p-5 shadow-sm">
        <CreditCard size={32} className="text-primary" />
        <View className="ml-4 flex-1">
          <Text className="text-2xl font-bold text-foreground">Transactions</Text>
          <Text className="mt-0.5 text-sm text-muted-foreground">Payment History</Text>
        </View>
        {isRefreshing && <RefreshCw size={20} className="animate-spin text-primary" />}
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View className="items-center py-12">
      <CreditCard size={64} className="text-muted-foreground/30" />
      <Text className="mb-2 mt-4 text-lg font-semibold text-foreground">No transactions yet</Text>
      <Text className="text-sm text-muted-foreground">
        Your transaction history will appear here
      </Text>
    </View>
  );

  const renderError = () => (
    <View className="flex-1 items-center justify-center bg-background p-6">
      <Text className="mb-4 text-center text-base text-destructive">
        {error?.message || 'Failed to load transactions'}
      </Text>
      <Pressable className="rounded-lg bg-primary px-6 py-3" onPress={() => refetch()}>
        <Text className="text-base font-semibold text-primary-foreground">Retry</Text>
      </Pressable>
    </View>
  );

  const renderFooter = () => {
    if (!hasNextPage) return null;

    if (isFetchingNextPage) {
      return (
        <View className="items-center py-4">
          <ActivityIndicator size="small" className="text-primary" />
        </View>
      );
    }

    return null;
  };

  // FR-006: Show loading skeleton on initial fetch
  if (isLoading && transactions.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" className="text-primary" />
        <Text className="mt-3 text-base text-muted-foreground">Loading transactions...</Text>
      </View>
    );
  }

  // FR-007: Show error with retry capability
  if (error && transactions.length === 0) {
    return renderError();
  }

  return (
    <View className="flex-1 bg-background">
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={renderTransaction}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        contentContainerStyle={{ padding: 16 }}
        // FR-005: Pull-to-refresh support (T021)
        refreshing={isRefreshing}
        onRefresh={refetch}
        // FR-010: Infinite scroll - load more when near end
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
      />
    </View>
  );
}
