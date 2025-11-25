import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  initiateTransaction,
  confirmPayment,
  confirmDelivery,
  releaseFunds,
  openDispute,
  resolveDispute,
  getTransaction,
  getTransactions,
  getDisputedTransactions,
  InitiateTransactionRequest,
  ConfirmPaymentRequest,
  OpenDisputeRequest,
  ResolveDisputeRequest,
} from '@/lib/api/transactions';

/**
 * Hook for getting a single transaction
 */
export function useTransaction(id: string) {
  return useQuery({
    queryKey: ['transactions', id],
    queryFn: () => getTransaction(id),
    enabled: !!id,
    staleTime: 30000, // 30 seconds
    refetchInterval: (query) => {
      const transaction = query.state.data;
      // Auto-refetch for transactions that might change status
      if (transaction?.status === 'pending' || transaction?.status === 'delivered') {
        return 10000; // 10 seconds
      }
      return false; // Don't auto-refetch for completed transactions
    },
  });
}

/**
 * Hook for getting user's transactions
 */
export function useTransactions(
  role: 'buyer' | 'seller' | 'all' = 'all',
  page = 1,
  limit = 20
) {
  return useQuery({
    queryKey: ['transactions', 'list', role, page, limit],
    queryFn: () => getTransactions(role, page, limit),
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Hook for getting disputed transactions (admin only)
 */
export function useDisputedTransactions(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['transactions', 'disputed', page, limit],
    queryFn: () => getDisputedTransactions(page, limit),
    staleTime: 30000, // 30 seconds
    refetchInterval: 30000, // Auto-refetch every 30 seconds for admin dashboard
  });
}

/**
 * Hook for initiating a transaction
 */
export function useInitiateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: InitiateTransactionRequest) => initiateTransaction(data),
    onSuccess: () => {
      // Invalidate transactions list
      queryClient.invalidateQueries({ queryKey: ['transactions', 'list'] });
    },
  });
}

/**
 * Hook for confirming payment
 */
export function useConfirmPayment(transactionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ConfirmPaymentRequest) => confirmPayment(transactionId, data),
    onSuccess: () => {
      // Invalidate transaction and list queries
      queryClient.invalidateQueries({ queryKey: ['transactions', transactionId] });
      queryClient.invalidateQueries({ queryKey: ['transactions', 'list'] });
    },
  });
}

/**
 * Hook for confirming delivery (seller)
 */
export function useConfirmDelivery(transactionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => confirmDelivery(transactionId),
    onSuccess: () => {
      // Invalidate transaction and list queries
      queryClient.invalidateQueries({ queryKey: ['transactions', transactionId] });
      queryClient.invalidateQueries({ queryKey: ['transactions', 'list'] });
    },
  });
}

/**
 * Hook for releasing funds (buyer)
 */
export function useReleaseFunds(transactionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => releaseFunds(transactionId),
    onSuccess: () => {
      // Invalidate transaction and list queries
      queryClient.invalidateQueries({ queryKey: ['transactions', transactionId] });
      queryClient.invalidateQueries({ queryKey: ['transactions', 'list'] });
    },
  });
}

/**
 * Hook for opening a dispute
 */
export function useOpenDispute(transactionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: OpenDisputeRequest) => openDispute(transactionId, data),
    onSuccess: () => {
      // Invalidate transaction, list, and disputed queries
      queryClient.invalidateQueries({ queryKey: ['transactions', transactionId] });
      queryClient.invalidateQueries({ queryKey: ['transactions', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['transactions', 'disputed'] });
    },
  });
}

/**
 * Hook for resolving a dispute (admin only)
 */
export function useResolveDispute(transactionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ResolveDisputeRequest) => resolveDispute(transactionId, data),
    onSuccess: () => {
      // Invalidate transaction, list, and disputed queries
      queryClient.invalidateQueries({ queryKey: ['transactions', transactionId] });
      queryClient.invalidateQueries({ queryKey: ['transactions', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['transactions', 'disputed'] });
    },
  });
}
