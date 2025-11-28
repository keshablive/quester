import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { transactionsService, Transaction } from '@/core';
import { DollarSign, Calendar, User, CheckCircle, AlertTriangle, Package } from 'lucide-react-native';

import { TransactionDetailProps } from './types';

export function TransactionDetail({ transactionId }: TransactionDetailProps) {
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadTransaction();
  }, [transactionId]);

  const loadTransaction = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await transactionsService.get(transactionId);
      setTransaction(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transaction');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelivery = async () => {
    if (!transaction) return;
    try {
      setActionLoading(true);
      const updated = await transactionsService.confirmDelivery(transactionId);
      setTransaction(updated);
    } catch (err) {
      console.error('Failed to confirm delivery:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReleaseFunds = async () => {
    if (!transaction) return;
    try {
      setActionLoading(true);
      const updated = await transactionsService.releaseFunds(transactionId);
      setTransaction(updated);
    } catch (err) {
      console.error('Failed to release funds:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenDispute = async () => {
    if (!transaction) return;
    try {
      setActionLoading(true);
      const updated = await transactionsService.openDispute(transactionId, 'Issue with transaction');
      setTransaction(updated);
    } catch (err) {
      console.error('Failed to open dispute:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading transaction...</Text>
      </View>
    );
  }

  if (error || !transaction) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error || 'Transaction not found'}</Text>
        <Pressable style={styles.retryButton} onPress={loadTransaction}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.amountContainer}>
          <DollarSign size={32} color="#4F46E5" />
          <Text style={styles.amount}>{formatPrice(transaction.amount, transaction.currency)}</Text>
        </View>
        
        <View style={[
          styles.statusBadge,
          transaction.status === 'completed' && styles.statusCompleted,
          transaction.status === 'pending' && styles.statusPending,
          transaction.status === 'failed' && styles.statusFailed,
        ]}>
          <Text style={styles.statusText}>{transaction.status}</Text>
        </View>
      </View>

      {/* Details */}
      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transaction Details</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Type:</Text>
            <Text style={styles.detailValue}>{transaction.type}</Text>
          </View>

          <View style={styles.detailRow}>
            <Calendar size={18} color="#6B7280" />
            <Text style={styles.detailLabel}>Created:</Text>
            <Text style={styles.detailValue}>{formatDate(transaction.createdAt)}</Text>
          </View>

          <View style={styles.detailRow}>
            <Calendar size={18} color="#6B7280" />
            <Text style={styles.detailLabel}>Updated:</Text>
            <Text style={styles.detailValue}>{formatDate(transaction.updatedAt)}</Text>
          </View>

          <View style={styles.detailRow}>
            <User size={18} color="#6B7280" />
            <Text style={styles.detailLabel}>Sender:</Text>
            <Text style={styles.detailValue}>{transaction.senderId}</Text>
          </View>

          <View style={styles.detailRow}>
            <User size={18} color="#6B7280" />
            <Text style={styles.detailLabel}>Receiver:</Text>
            <Text style={styles.detailValue}>{transaction.receiverId}</Text>
          </View>
        </View>

        {/* Actions */}
        {transaction.status === 'pending' && (
          <View style={styles.actions}>
            <Text style={styles.actionsTitle}>Available Actions</Text>

            <Pressable
              style={[styles.actionButton, styles.actionPrimary]}
              onPress={handleConfirmDelivery}
              disabled={actionLoading}
            >
              <Package size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Confirm Delivery</Text>
            </Pressable>

            <Pressable
              style={[styles.actionButton, styles.actionSuccess]}
              onPress={handleReleaseFunds}
              disabled={actionLoading}
            >
              <CheckCircle size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Release Funds</Text>
            </Pressable>

            <Pressable
              style={[styles.actionButton, styles.actionDanger]}
              onPress={handleOpenDispute}
              disabled={actionLoading}
            >
              <AlertTriangle size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Open Dispute</Text>
            </Pressable>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  amount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusCompleted: {
    backgroundColor: '#10B981',
  },
  statusPending: {
    backgroundColor: '#F59E0B',
  },
  statusFailed: {
    backgroundColor: '#EF4444',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  content: {
    padding: 20,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
    flex: 1,
  },
  actions: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
  },
  actionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  actionPrimary: {
    backgroundColor: '#4F46E5',
  },
  actionSuccess: {
    backgroundColor: '#10B981',
  },
  actionDanger: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
