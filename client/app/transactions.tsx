import React, { useState } from 'react';
import { View, Modal } from 'react-native';
import { TransactionList, TransactionDetail } from '@/components/pages/transactions';
import { Transaction } from '@/core';

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
    <View className="flex-1">
      <TransactionList onTransactionPress={handleTransactionPress} />

      {/* Transaction Detail Modal */}
      <Modal
        visible={showDetail}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleDetailClose}
      >
        {selectedTransaction && (
          <TransactionDetail transactionId={selectedTransaction.id} />
        )}
      </Modal>
    </View>
  );
}
