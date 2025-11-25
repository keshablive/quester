import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/api-client';
import { realTimeService } from '@/lib/services/real-time-service';
import type { WalletState, Transaction, EscrowStatus } from '@/lib/types/marketplace';

interface UseWalletOptions {
  userId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface TransactionFilters {
  type?: Transaction['type'];
  status?: Transaction['status'];
  search?: string;
}

interface UseWalletReturn {
  // State
  wallet: WalletState | null;
  transactions: Transaction[] | null;
  escrowTransactions: EscrowStatus[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  
  // Computed
  availableBalance: number;
  pendingEscrow: number;
  totalEarnings: number;
  totalBalance: number;
  formattedBalance: string;
  
  // Actions
  refresh: () => Promise<void>;
  fetchTransactions: (filters?: TransactionFilters) => Promise<void>;
  fetchTransactionDetails: (transactionId: string) => Promise<Transaction | null>;
  fetchEscrowTransactions: () => Promise<void>;
  confirmDelivery: (escrowId: string) => Promise<void>;
  initiateDispute: (escrowId: string, reason: string) => Promise<void>;
  withdraw: (amount: number, method: string) => Promise<void>;
  clearError: () => void;
}

export function useWallet({
  userId,
  autoRefresh = false,
  refreshInterval = 30000,
}: UseWalletOptions = {}): UseWalletReturn {
  // State
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [transactions, setTransactions] = useState<Transaction[] | null>(null); // null until loaded
  const [_filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [escrowTransactions, setEscrowTransactions] = useState<EscrowStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null | undefined>(undefined);

  // Computed values
  const availableBalance = wallet?.availableBalance ?? 0;
  const pendingEscrow = wallet?.pendingEscrow ?? 0;
  const totalEarnings = wallet?.totalEarnings ?? 0;
  const totalBalance = availableBalance + pendingEscrow;
  
  const formattedBalance = useMemo(() => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: wallet?.currency || 'USD',
    }).format(availableBalance);
  }, [availableBalance, wallet?.currency]);

  // Fetch wallet data
  const fetchWallet = useCallback(async () => {
    try {
      const endpoint = userId ? `/wallet/${userId}` : '/wallet';
      const data = await apiClient.get<WalletState>(endpoint);
      setWallet(data);
      // Populate transactions from recent transactions if available
      if (data.recentTransactions && data.recentTransactions.length > 0) {
        setTransactions(data.recentTransactions);
      }
      setError(undefined);
      return data;
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Failed to fetch wallet data');
      // Don't throw - preserve existing data
      return null;
    }
  }, [userId]);

  // Refresh (public API)
  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const result = await fetchWallet();
      if (result) {
        setError(undefined);
      }
    } catch (err) {
      // Error already set by fetchWallet
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchWallet]);

  // Fetch transactions with optional filters
  const fetchTransactions = useCallback(async (filters?: TransactionFilters) => {
    try {
      const params = new URLSearchParams();
      if (filters?.type) params.append('type', filters.type);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.search) params.append('search', filters.search);

      const endpoint = userId
        ? `/wallet/${userId}/transactions?${params}`
        : `/wallet/transactions?${params}`;
      
      const data = await apiClient.get<Transaction[]>(endpoint);
      setTransactions(data);
      setFilteredTransactions(data);
      setError(undefined);
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Failed to fetch transactions');
      throw error;
    }
  }, [userId]);

  // Fetch single transaction details
  const fetchTransactionDetails = useCallback(async (transactionId: string): Promise<Transaction | null> => {
    try {
      const data = await apiClient.get<Transaction>(`/wallet/transactions/${transactionId}`);
      return data;
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Failed to fetch transaction details');
      return null;
    }
  }, []);

  // Fetch escrow transactions
  const fetchEscrowTransactions = useCallback(async () => {
    try {
      const endpoint = userId
        ? `/wallet/${userId}/escrow`
        : `/wallet/escrow`;
      
      const data = await apiClient.get<EscrowStatus[]>(endpoint);
      setEscrowTransactions(data);
      setError(null);
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Failed to fetch escrow transactions');
      throw error;
    }
  }, [userId]);

  // Confirm delivery (buyer action)
  const confirmDelivery = useCallback(async (escrowId: string) => {
    try {
      await apiClient.post(`/wallet/escrow/${escrowId}/confirm`, {});
      
      // Refresh data
      await Promise.all([
        fetchWallet(),
        fetchEscrowTransactions(),
      ]);
      
      setError(null);
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Failed to confirm delivery');
      throw error;
    }
  }, [fetchWallet, fetchEscrowTransactions]);

  // Initiate dispute
  const initiateDispute = useCallback(async (escrowId: string, reason: string) => {
    try {
      await apiClient.post(`/wallet/escrow/${escrowId}/dispute`, { reason });
      
      // Refresh data
      await fetchEscrowTransactions();
      
      setError(null);
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Failed to initiate dispute');
      throw error;
    }
  }, [fetchEscrowTransactions]);

  // Withdraw funds
  const withdraw = useCallback(async (amount: number, method: string) => {
    // Validation
    if (amount <= 0) {
      const err = new Error('Withdrawal amount must be greater than zero');
      setError(err.message);
      throw err;
    }

    if (amount > availableBalance) {
      const err = new Error('Insufficient balance');
      setError(err.message);
      throw err;
    }

    try {
      await apiClient.post('/wallet/withdraw', {
        amount,
        method,
      });
      
      // Refresh wallet data
      await fetchWallet();
      
      setError(null);
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Failed to withdraw funds');
      throw error;
    }
  }, [availableBalance, fetchWallet]);

  // Clear error
  const clearError = useCallback(() => {
    setError(undefined);
  }, []);

  // Expose handleBalanceUpdate for testing
  const handleBalanceUpdate = useCallback((data: Partial<WalletState>) => {
    setWallet((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        ...data,
      };
    });
  }, []);

  // Initial load
  useEffect(() => {
    let mounted = true;

    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          fetchWallet(),
          fetchTransactions(),
          fetchEscrowTransactions(),
        ]);
      } catch (err) {
        // Error already set by individual functions
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadInitialData();

    return () => {
      mounted = false;
    };
  }, [fetchWallet, fetchTransactions, fetchEscrowTransactions]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refresh();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refresh]);

  // Real-time balance updates
  useEffect(() => {
    if (!wallet) return;

    const channel = userId ? `wallet:${userId}` : 'wallet:current';

    // Subscribe to balance updates
    realTimeService.subscribe(channel, 'balance_update', handleBalanceUpdate);

    return () => {
      realTimeService.unsubscribe(channel, 'balance_update', handleBalanceUpdate);
    };
  }, [wallet, userId, handleBalanceUpdate]);

  return {
    // State
    wallet,
    transactions,
    escrowTransactions,
    isLoading,
    isRefreshing,
    error: error || null,
    
    // Computed
    availableBalance,
    pendingEscrow,
    totalEarnings,
    totalBalance,
    formattedBalance,
    
    // Actions
    refresh,
    fetchTransactions,
    fetchTransactionDetails,
    fetchEscrowTransactions,
    confirmDelivery,
    initiateDispute,
    withdraw,
    clearError,
  };
}
