/**
 * Transactions Page
 *
 * Route file for transactions history view.
 * Uses TanStack Query via TransactionList component with infinite scroll.
 *
 * Phase 3 Migration: Verified TanStack Query integration
 * FR-010: System MUST migrate Transactions page to use TanStack Query
 *
 * @module app/transactions
 */

import React, { useState } from 'react';
import { View, Modal } from 'react-native';
import { TransactionList, TransactionDetail } from '@/components/features/transactions';
import { Transaction } from '@/core';
import { OfflineIndicator } from '@/components/shared';
import { ChunkErrorBoundary } from '@/core/routes';

export default function TransactionsScreen() {
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const handleTransactionPress = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowDetail(true);
  };

  const handleDetailClose = () => {
    setShowDetail(false);
    setSelectedTransaction(null);
  };

  return (
    <ChunkErrorBoundary>
      <View className="flex-1">
        <OfflineIndicator />
        <TransactionList onTransactionPress={handleTransactionPress} />

        {/* Transaction Detail Modal */}
        <Modal
          visible={showDetail}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={handleDetailClose}>
          {selectedTransaction && <TransactionDetail transactionId={selectedTransaction.id} />}
        </Modal>
      </View>
    </ChunkErrorBoundary>
  );
}
