import React, { useState, useEffect } from 'react';
import { View, FlatList, ActivityIndicator, Pressable } from 'react-native';
import { Text } from '@/components/ui';
import { transactionsService, Transaction } from '@/core';
import { CreditCard, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle2, XCircle } from 'lucide-react-native';
import { cn } from '@/core';

import { TransactionListProps } from './types';

export function TransactionList({ onTransactionPress }: TransactionListProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await transactionsService.getMyTransactions();
      setTransactions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

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
      case 'completed': return 'text-emerald-500';
      case 'pending': return 'text-amber-500';
      case 'failed': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const getTransactionDescription = (item: Transaction) => {
    // Derive description from type if not available
    const typeLabel = item.type.charAt(0).toUpperCase() + item.type.slice(1);
    return `${typeLabel} Transaction`;
  };

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <Pressable
      className="flex-row items-center bg-card p-4 mb-3 rounded-xl border border-border"
      onPress={() => onTransactionPress?.(item)}
    >
      <View className={cn(
        "w-10 h-10 rounded-full items-center justify-center mr-3",
        item.type === 'credit' ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-red-100 dark:bg-red-900/30"
      )}>
        {item.type === 'credit' ? (
          <ArrowDownLeft size={20} className="text-emerald-600 dark:text-emerald-400" />
        ) : (
          <ArrowUpRight size={20} className="text-red-600 dark:text-red-400" />
        )}
      </View>

      <View className="flex-1">
        <Text className="text-base font-semibold text-foreground mb-0.5">
          {getTransactionDescription(item)}
        </Text>
        <Text className="text-xs text-muted-foreground">
          {new Date(item.createdAt).toLocaleDateString()} • {new Date(item.createdAt).toLocaleTimeString()}
        </Text>
      </View>

      <View className="items-end">
        <Text className={cn(
          "text-base font-bold mb-1",
          item.type === 'credit' ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
        )}>
          {item.type === 'credit' ? '+' : '-'}${item.amount.toFixed(2)}
        </Text>
        <View className="flex-row items-center gap-1">
          {getStatusIcon(item.status)}
          <Text className={cn("text-xs capitalize", getStatusColor(item.status))}>
            {item.status}
          </Text>
        </View>
      </View>
    </Pressable>
  );

  const renderHeader = () => (
    <View className="mb-6">
      <View className="flex-row items-center bg-card p-5 rounded-xl shadow-sm border border-border">
        <CreditCard size={32} className="text-primary" />
        <View className="ml-4">
          <Text className="text-2xl font-bold text-foreground">Transactions</Text>
          <Text className="text-sm text-muted-foreground mt-0.5">Payment History</Text>
        </View>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View className="py-12 items-center">
      <CreditCard size={64} className="text-muted-foreground/30" />
      <Text className="text-lg font-semibold text-foreground mt-4 mb-2">No transactions yet</Text>
      <Text className="text-sm text-muted-foreground">Your transaction history will appear here</Text>
    </View>
  );

  const renderError = () => (
    <View className="flex-1 justify-center items-center bg-background p-6">
      <Text className="text-base text-destructive text-center mb-4">{error}</Text>
      <Pressable className="bg-primary px-6 py-3 rounded-lg" onPress={loadTransactions}>
        <Text className="text-base font-semibold text-primary-foreground">Retry</Text>
      </Pressable>
    </View>
  );

  if (loading && transactions.length === 0) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" className="text-primary" />
        <Text className="mt-3 text-base text-muted-foreground">Loading transactions...</Text>
      </View>
    );
  }

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
        contentContainerStyle={{ padding: 16 }}
        refreshing={loading}
        onRefresh={loadTransactions}
      />
    </View>
  );
}
