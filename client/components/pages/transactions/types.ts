import { Transaction } from '@/core';

export interface TransactionDetailProps {
    transactionId: string;
}

export interface TransactionListProps {
    onTransactionPress: (transaction: Transaction) => void;
}
