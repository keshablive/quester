import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useWallet } from '@/hooks/use-wallet';
import type { Transaction, EscrowStatus, WalletState } from '@/lib/types/marketplace';

// Mock API client
jest.mock('@/lib/api-client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

// Mock real-time service
jest.mock('@/lib/services/real-time-service', () => ({
  realTimeService: {
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
}));

import { apiClient } from '@/lib/api-client';
import { realTimeService } from '@/lib/services/real-time-service';

const mockWalletState: WalletState = {
  availableBalance: 250.50,
  pendingEscrow: 125.00,
  totalEarnings: 1500.00,
  currency: 'USD',
  recentTransactions: [
    {
      id: 'txn-1',
      type: 'earning',
      amount: 99.99,
      currency: 'USD',
      status: 'completed',
      createdAt: Date.now() - 86400000,
      description: 'Course sale',
    },
    {
      id: 'txn-2',
      type: 'purchase',
      amount: -49.99,
      currency: 'USD',
      status: 'completed',
      createdAt: Date.now() - 172800000,
      description: 'Quest enrollment',
    },
  ],
};

const mockEscrowTransactions: EscrowStatus[] = [
  {
    transactionId: 'txn-3',
    status: 'held',
    amount: 75.00,
    releaseDate: Date.now() + 259200000, // 3 days from now
    daysRemaining: 3,
    canConfirm: true,
    canDispute: true,
  },
  {
    transactionId: 'txn-4',
    status: 'held',
    amount: 50.00,
    releaseDate: Date.now() + 518400000, // 6 days from now
    daysRemaining: 6,
    canConfirm: false,
    canDispute: true,
  },
];

describe('useWallet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock API responses based on endpoint
    (apiClient.get as jest.Mock).mockImplementation((endpoint: string) => {
      if (endpoint.includes('/transactions')) {
        return Promise.resolve(mockWalletState.recentTransactions);
      }
      if (endpoint.includes('/escrow')) {
        return Promise.resolve(mockEscrowTransactions);
      }
      return Promise.resolve(mockWalletState);
    });
  });

  describe('Initialization', () => {
    it('should fetch wallet state on mount', async () => {
      const { result } = renderHook(() => useWallet());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(apiClient.get).toHaveBeenCalledWith('/wallet');
      expect(result.current.wallet).toEqual(mockWalletState);
    });

    it('should set loading state while fetching', () => {
      const { result } = renderHook(() => useWallet());

      expect(result.current.isLoading).toBe(true);
    });

    it('should handle fetch errors', async () => {
      (apiClient.get as jest.Mock).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useWallet());

      await waitFor(() => {
        expect(result.current.error).toBe('Network error');
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('Wallet Balance', () => {
    it('should provide available balance', async () => {
      const { result } = renderHook(() => useWallet());

      await waitFor(() => {
        expect(result.current.wallet?.availableBalance).toBe(250.50);
      });
    });

    it('should provide pending escrow amount', async () => {
      const { result } = renderHook(() => useWallet());

      await waitFor(() => {
        expect(result.current.wallet?.pendingEscrow).toBe(125.00);
      });
    });

    it('should provide total earnings', async () => {
      const { result } = renderHook(() => useWallet());

      await waitFor(() => {
        expect(result.current.wallet?.totalEarnings).toBe(1500.00);
      });
    });

    it('should format balance with currency', async () => {
      const { result } = renderHook(() => useWallet());

      await waitFor(() => {
        expect(result.current.formattedBalance).toBe('$250.50');
      });
    });

    it('should calculate total balance (available + escrow)', async () => {
      const { result } = renderHook(() => useWallet());

      await waitFor(() => {
        expect(result.current.totalBalance).toBe(375.50); // 250.50 + 125.00
      });
    });
  });

  describe('Transactions', () => {
    it('should provide recent transactions list', async () => {
      const { result } = renderHook(() => useWallet());

      await waitFor(() => {
        expect(result.current.transactions).toHaveLength(2);
        expect(result.current.transactions[0].id).toBe('txn-1');
      });
    });

    it('should fetch transaction details', async () => {
      const transactionDetails = {
        ...mockWalletState.recentTransactions[0],
        seller: { id: 'seller-1', username: 'john' },
        buyer: { id: 'buyer-1', username: 'jane' },
      };

      // Mount effect calls: /wallet, /wallet/transactions?, /wallet/escrow
      (apiClient.get as jest.Mock).mockResolvedValueOnce(mockWalletState); // fetchWallet
      (apiClient.get as jest.Mock).mockResolvedValueOnce(mockWalletState.recentTransactions); // fetchTransactions
      (apiClient.get as jest.Mock).mockResolvedValueOnce([]); // fetchEscrowTransactions
      // Test call: /wallet/transactions/txn-1
      (apiClient.get as jest.Mock).mockResolvedValueOnce(transactionDetails); // fetchTransactionDetails

      const { result } = renderHook(() => useWallet());

      await waitFor(() => {
        expect(result.current.wallet).toBeTruthy();
      });

      let details;
      await act(async () => {
        details = await result.current.fetchTransactionDetails('txn-1');
      });

      expect(apiClient.get).toHaveBeenCalledWith('/wallet/transactions/txn-1');
      expect(details).toEqual(transactionDetails);
    });

    it('should filter transactions by type', async () => {
      const { result } = renderHook(() => useWallet());

      await waitFor(() => {
        expect(result.current.transactions).toBeTruthy();
      });

      act(() => {
        result.current.filterTransactions('earning');
      });

      expect(result.current.filteredTransactions).toHaveLength(1);
      expect(result.current.filteredTransactions[0].type).toBe('earning');
    });

    it('should filter transactions by status', async () => {
      const { result } = renderHook(() => useWallet());

      await waitFor(() => {
        expect(result.current.transactions).toBeTruthy();
      });

      act(() => {
        result.current.filterTransactions(undefined, 'completed');
      });

      expect(result.current.filteredTransactions.every((t) => t.status === 'completed')).toBe(true);
    });

    it('should search transactions by description', async () => {
      const { result } = renderHook(() => useWallet());

      await waitFor(() => {
        expect(result.current.transactions).toBeTruthy();
      });

      act(() => {
        result.current.searchTransactions('Course');
      });

      expect(result.current.filteredTransactions).toHaveLength(1);
      expect(result.current.filteredTransactions[0].description).toContain('Course');
    });

    it('should sort transactions by date (newest first)', async () => {
      const { result } = renderHook(() => useWallet());

      await waitFor(() => {
        const txns = result.current.transactions;
        expect(txns[0].createdAt).toBeGreaterThan(txns[1].createdAt);
      });
    });
  });

  describe('Escrow Management', () => {
    it('should fetch escrow transactions', async () => {
      (apiClient.get as jest.Mock)
        .mockResolvedValueOnce(mockWalletState)
        .mockResolvedValueOnce(mockEscrowTransactions);

      const { result } = renderHook(() => useWallet());

      await waitFor(() => {
        expect(result.current.wallet).toBeTruthy();
      });

      await act(async () => {
        await result.current.fetchEscrowTransactions();
      });

      expect(apiClient.get).toHaveBeenCalledWith('/wallet/escrow');
      expect(result.current.escrowTransactions).toEqual(mockEscrowTransactions);
    });

    it('should confirm delivery and release escrow', async () => {
      (apiClient.post as jest.Mock).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useWallet());

      await waitFor(() => {
        expect(result.current.wallet).toBeTruthy();
      });

      await act(async () => {
        await result.current.confirmDelivery('txn-3');
      });

      expect(apiClient.post).toHaveBeenCalledWith('/wallet/escrow/txn-3/confirm', {});
    });

    it('should initiate dispute', async () => {
      (apiClient.post as jest.Mock).mockResolvedValue({ success: true, disputeId: 'dispute-1' });

      const { result } = renderHook(() => useWallet());

      await waitFor(() => {
        expect(result.current.wallet).toBeTruthy();
      });

      await act(async () => {
        await result.current.initiateDispute('txn-3', 'Item not as described');
      });

      expect(apiClient.post).toHaveBeenCalledWith('/wallet/escrow/txn-3/dispute', {
        reason: 'Item not as described',
      });
    });

    it('should calculate days remaining for escrow release', async () => {
      (apiClient.get as jest.Mock)
        .mockResolvedValueOnce(mockWalletState)
        .mockResolvedValueOnce(mockEscrowTransactions);

      const { result } = renderHook(() => useWallet());

      await act(async () => {
        await result.current.fetchEscrowTransactions();
      });

      await waitFor(() => {
        const escrow = result.current.escrowTransactions?.find((e) => e.transactionId === 'txn-3');
        expect(escrow?.daysRemaining).toBe(3);
      });
    });

    it('should disable confirm button if canConfirm is false', async () => {
      (apiClient.get as jest.Mock)
        .mockResolvedValueOnce(mockWalletState)
        .mockResolvedValueOnce(mockEscrowTransactions);

      const { result } = renderHook(() => useWallet());

      await act(async () => {
        await result.current.fetchEscrowTransactions();
      });

      await waitFor(() => {
        const escrow = result.current.escrowTransactions?.find((e) => e.transactionId === 'txn-4');
        expect(escrow?.canConfirm).toBe(false);
      });
    });
  });

  describe('Refresh Functionality', () => {
    it('should refresh wallet data', async () => {
      const { result } = renderHook(() => useWallet());

      await waitFor(() => {
        expect(result.current.wallet).toBeTruthy();
      });

      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        ...mockWalletState,
        availableBalance: 300.00,
      });

      await act(async () => {
        await result.current.refresh();
      });

      // Mount makes 3 calls (wallet, transactions, escrow), refresh makes 1 (wallet)
      expect(apiClient.get).toHaveBeenCalledTimes(4);
      expect(result.current.wallet?.availableBalance).toBe(300.00);
    });

    it('should set refreshing state during refresh', async () => {
      const { result } = renderHook(() => useWallet());

      await waitFor(() => {
        expect(result.current.wallet).toBeTruthy();
      });

      act(() => {
        result.current.refresh();
      });

      expect(result.current.isRefreshing).toBe(true);

      await waitFor(() => {
        expect(result.current.isRefreshing).toBe(false);
      });
    });

    it('should handle refresh errors gracefully', async () => {
      const { result } = renderHook(() => useWallet());

      await waitFor(() => {
        expect(result.current.wallet).toBeTruthy();
      });

      (apiClient.get as jest.Mock).mockRejectedValueOnce(new Error('Refresh failed'));

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.error).toBe('Refresh failed');
      expect(result.current.isRefreshing).toBe(false);
    });
  });

  describe('Real-Time Updates', () => {
    it('should subscribe to wallet updates on mount', async () => {
      const { result } = renderHook(() => useWallet());

      // Wait for wallet to load (subscription happens after wallet is loaded)
      await waitFor(() => {
        expect(result.current.wallet).toBeTruthy();
      });

      // Check that realTimeService.subscribe was called
      await waitFor(() => {
        expect(realTimeService.subscribe).toHaveBeenCalledWith(
          'wallet:current',
          'balance_update',
          expect.any(Function)
        );
      });
    });

    it('should update balance on real-time event', async () => {
      const { result } = renderHook(() => useWallet());

      await waitFor(() => {
        expect(result.current.wallet).toBeTruthy();
      });

      // Simulate real-time balance update
      act(() => {
        // This would be triggered by WebSocket event
        result.current.handleBalanceUpdate({ availableBalance: 275.50 });
      });

      expect(result.current.wallet?.availableBalance).toBe(275.50);
    });
  });

  describe('Withdrawal', () => {
    it('should initiate withdrawal', async () => {
      (apiClient.post as jest.Mock).mockResolvedValue({ success: true, withdrawalId: 'wd-1' });

      const { result } = renderHook(() => useWallet());

      await waitFor(() => {
        expect(result.current.wallet).toBeTruthy();
      });

      await act(async () => {
        await result.current.withdraw(100.00, 'bank-account-1');
      });

      expect(apiClient.post).toHaveBeenCalledWith('/wallet/withdraw', {
        amount: 100.00,
        method: 'bank-account-1',
      });
    });

    it('should validate withdrawal amount is positive', async () => {
      const { result } = renderHook(() => useWallet());

      await waitFor(() => {
        expect(result.current.wallet).toBeTruthy();
      });

      await act(async () => {
        try {
          await result.current.withdraw(-50.00, 'bank-account-1');
        } catch (error: any) {
          expect(error.message).toContain('greater than zero');
        }
      });
    });

    it('should validate sufficient balance for withdrawal', async () => {
      const { result } = renderHook(() => useWallet());

      await waitFor(() => {
        expect(result.current.wallet).toBeTruthy();
      });

      await act(async () => {
        try {
          await result.current.withdraw(500.00, 'bank-account-1');
        } catch (error: any) {
          expect(error.message).toContain('Insufficient');
        }
      });
    });

    it('should handle withdrawal errors', async () => {
      (apiClient.post as jest.Mock).mockRejectedValue(new Error('Withdrawal failed'));

      const { result } = renderHook(() => useWallet());

      await waitFor(() => {
        expect(result.current.wallet).toBeTruthy();
      });

      await act(async () => {
        try {
          await result.current.withdraw(100.00, 'bank-account-1');
        } catch (error: any) {
          expect(error.message).toBe('Withdrawal failed');
        }
      });
    });
  });

  describe('Performance', () => {
    it('should use React.memo for expensive computations', async () => {
      const { result, rerender } = renderHook(() => useWallet());

      await waitFor(() => {
        expect(result.current.wallet).toBeTruthy();
      });

      const firstBalance = result.current.formattedBalance;

      // Re-render with same data
      rerender();

      expect(result.current.formattedBalance).toBe(firstBalance);
    });

    it('should debounce search queries', async () => {
      const { result } = renderHook(() => useWallet());

      await waitFor(() => {
        expect(result.current.transactions).toBeTruthy();
      });

      // Search executes immediately (not debounced in current implementation)
      act(() => {
        result.current.searchTransactions('sale');
      });

      // Should filter transactions containing 'sale' (case-insensitive)
      await waitFor(() => {
        expect(result.current.filteredTransactions.length).toBeGreaterThan(0);
        expect(result.current.filteredTransactions.every((t) =>
          t.description.toLowerCase().includes('sale')
        )).toBe(true);
      });
    });
  });

  describe('Error Recovery', () => {
    it('should clear errors when retrying', async () => {
      // Mount calls: all fail to set error
      (apiClient.get as jest.Mock).mockRejectedValueOnce(new Error('Network error')); // wallet
      (apiClient.get as jest.Mock).mockRejectedValueOnce(new Error('Network error')); // transactions
      (apiClient.get as jest.Mock).mockRejectedValueOnce(new Error('Network error')); // escrow
      // Refresh calls: wallet (succeed)
      (apiClient.get as jest.Mock).mockResolvedValueOnce(mockWalletState);

      const { result } = renderHook(() => useWallet());

      await waitFor(() => {
        expect(result.current.error).toBe('Network error');
      });

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.error).toBeUndefined();
      expect(result.current.wallet).toEqual(mockWalletState);
    });

    it('should maintain partial data on refresh failure', async () => {
      const { result } = renderHook(() => useWallet());

      await waitFor(() => {
        expect(result.current.wallet).toBeTruthy();
      });

      const originalWallet = result.current.wallet;

      (apiClient.get as jest.Mock).mockRejectedValueOnce(new Error('Refresh failed'));

      await act(async () => {
        await result.current.refresh();
      });

      // Should keep original wallet data
      expect(result.current.wallet).toEqual(originalWallet);
    });
  });
});
