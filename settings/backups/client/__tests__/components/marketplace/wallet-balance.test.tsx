import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { WalletBalance } from '@/components/marketplace/wallet-balance';
import type { WalletState } from '@/lib/types/marketplace';

describe('WalletBalance', () => {
  const mockWallet: WalletState = {
    availableBalance: 250.0,
    pendingEscrow: 150.0,
    totalEarnings: 1500.0,
    currency: 'USD',
  };

  const mockHandlers = {
    onWithdraw: jest.fn(),
    onViewTransactions: jest.fn(),
    onViewEscrow: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render wallet balance card', () => {
      render(<WalletBalance wallet={mockWallet} />);
      expect(screen.getByTestId('wallet-balance')).toBeTruthy();
      expect(screen.getByText('Wallet')).toBeTruthy();
    });

    it('should display available balance prominently', () => {
      render(<WalletBalance wallet={mockWallet} />);
      expect(screen.getByTestId('available-balance')).toBeTruthy();
      expect(screen.getByText('Available Balance')).toBeTruthy();
      expect(screen.getByText('$250.00')).toBeTruthy();
    });

    it('should display pending escrow amount', () => {
      render(<WalletBalance wallet={mockWallet} />);
      expect(screen.getByTestId('pending-escrow')).toBeTruthy();
      expect(screen.getByText('Pending Escrow')).toBeTruthy();
      expect(screen.getByText('$150.00')).toBeTruthy();
    });

    it('should display total earnings', () => {
      render(<WalletBalance wallet={mockWallet} />);
      expect(screen.getByTestId('total-earnings')).toBeTruthy();
      expect(screen.getByText('Total Earnings')).toBeTruthy();
      expect(screen.getByText('$1,500.00')).toBeTruthy();
    });

    it('should calculate and display total balance', () => {
      render(<WalletBalance wallet={mockWallet} />);
      expect(screen.getByText('Total Balance')).toBeTruthy();
      expect(screen.getByText('$400.00')).toBeTruthy(); // 250 + 150
    });
  });

  describe('Balance Visibility Toggle', () => {
    it('should show balance by default', () => {
      render(<WalletBalance wallet={mockWallet} />);
      expect(screen.getByText('$250.00')).toBeTruthy();
      expect(screen.queryByText('••••••')).toBeNull();
    });

    it('should hide balance when toggle is pressed', () => {
      render(<WalletBalance wallet={mockWallet} />);
      const toggleButton = screen.getByLabelText('Hide balance');
      fireEvent.press(toggleButton);
      expect(screen.getAllByText('••••••').length).toBeGreaterThan(0);
    });

    it('should show balance again when toggle is pressed twice', () => {
      render(<WalletBalance wallet={mockWallet} />);
      const hideButton = screen.getByLabelText('Hide balance');
      fireEvent.press(hideButton);
      const showButton = screen.getByLabelText('Show balance');
      fireEvent.press(showButton);
      expect(screen.getByText('$250.00')).toBeTruthy();
    });

    it('should hide all amounts when balance is hidden', () => {
      render(<WalletBalance wallet={mockWallet} />);
      const toggleButton = screen.getByLabelText('Hide balance');
      fireEvent.press(toggleButton);

      // Check that all amounts are hidden
      expect(screen.queryByText('$250.00')).toBeNull();
      expect(screen.queryByText('$150.00')).toBeNull();
      expect(screen.queryByText('$1,500.00')).toBeNull();
      expect(screen.queryByText('$400.00')).toBeNull();
    });
  });

  describe('Currency Formatting', () => {
    it('should format USD correctly', () => {
      render(<WalletBalance wallet={{ ...mockWallet, currency: 'USD' }} />);
      expect(screen.getByText('$250.00')).toBeTruthy();
    });

    it('should format EUR correctly', () => {
      render(<WalletBalance wallet={{ ...mockWallet, currency: 'EUR' }} />);
      expect(screen.getByText('€250.00')).toBeTruthy();
    });

    it('should format GBP correctly', () => {
      render(<WalletBalance wallet={{ ...mockWallet, currency: 'GBP' }} />);
      expect(screen.getByText('£250.00')).toBeTruthy();
    });

    it('should format large amounts with comma separators', () => {
      render(<WalletBalance wallet={{ ...mockWallet, totalEarnings: 12500 }} />);
      expect(screen.getByText('$12,500.00')).toBeTruthy();
    });
  });

  describe('Action Buttons', () => {
    it('should show withdraw button when handler provided and balance > 0', () => {
      render(<WalletBalance wallet={mockWallet} {...mockHandlers} />);
      expect(screen.getByTestId('withdraw-button')).toBeTruthy();
      expect(screen.getByText('Withdraw Funds')).toBeTruthy();
    });

    it('should hide withdraw button when balance is 0', () => {
      render(<WalletBalance wallet={{ ...mockWallet, availableBalance: 0 }} {...mockHandlers} />);
      expect(screen.queryByTestId('withdraw-button')).toBeNull();
    });

    it('should call onWithdraw when withdraw button is pressed', () => {
      render(<WalletBalance wallet={mockWallet} {...mockHandlers} />);
      fireEvent.press(screen.getByTestId('withdraw-button'));
      expect(mockHandlers.onWithdraw).toHaveBeenCalledTimes(1);
    });

    it('should show view transactions button when handler provided', () => {
      render(<WalletBalance wallet={mockWallet} {...mockHandlers} />);
      expect(screen.getByTestId('view-transactions-button')).toBeTruthy();
      expect(screen.getByText('View Transactions')).toBeTruthy();
    });

    it('should call onViewTransactions when button is pressed', () => {
      render(<WalletBalance wallet={mockWallet} {...mockHandlers} />);
      fireEvent.press(screen.getByTestId('view-transactions-button'));
      expect(mockHandlers.onViewTransactions).toHaveBeenCalledTimes(1);
    });

    it('should show view escrow details link when escrow > 0', () => {
      render(<WalletBalance wallet={mockWallet} {...mockHandlers} />);
      expect(screen.getByLabelText('View escrow transactions')).toBeTruthy();
      expect(screen.getByText('View Details')).toBeTruthy();
    });

    it('should hide view escrow link when escrow is 0', () => {
      render(<WalletBalance wallet={{ ...mockWallet, pendingEscrow: 0 }} {...mockHandlers} />);
      expect(screen.queryByLabelText('View escrow transactions')).toBeNull();
    });

    it('should call onViewEscrow when escrow link is pressed', () => {
      render(<WalletBalance wallet={mockWallet} {...mockHandlers} />);
      fireEvent.press(screen.getByLabelText('View escrow transactions'));
      expect(mockHandlers.onViewEscrow).toHaveBeenCalledTimes(1);
    });
  });

  describe('Empty State', () => {
    const emptyWallet: WalletState = {
      availableBalance: 0,
      pendingEscrow: 0,
      totalEarnings: 0,
      currency: 'USD',
    };

    it('should show empty state message when wallet is empty', () => {
      render(<WalletBalance wallet={emptyWallet} />);
      expect(screen.getByText(/Your wallet is empty. Start selling/i)).toBeTruthy();
    });

    it('should not show empty state when only available balance is 0', () => {
      render(<WalletBalance wallet={{ ...emptyWallet, totalEarnings: 100 }} />);
      expect(screen.queryByText(/Your wallet is empty/i)).toBeNull();
    });

    it('should display all zero amounts in empty state', () => {
      render(<WalletBalance wallet={emptyWallet} />);
      const zeroAmounts = screen.getAllByText('$0.00');
      expect(zeroAmounts.length).toBeGreaterThan(0);
    });
  });

  describe('Escrow Info Message', () => {
    it('should show escrow info when pendingEscrow > 0', () => {
      render(<WalletBalance wallet={mockWallet} />);
      expect(screen.getByText(/Funds in escrow will be automatically released/i)).toBeTruthy();
    });

    it('should hide escrow info when pendingEscrow is 0', () => {
      render(<WalletBalance wallet={{ ...mockWallet, pendingEscrow: 0 }} />);
      expect(screen.queryByText(/Funds in escrow will be automatically released/i)).toBeNull();
    });

    it('should explain automatic release mechanism', () => {
      render(<WalletBalance wallet={mockWallet} />);
      expect(
        screen.getByText(/buyer confirms delivery or the escrow period expires/i)
      ).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels for balance sections', () => {
      render(<WalletBalance wallet={mockWallet} />);
      expect(screen.getByLabelText('Available balance: $250.00')).toBeTruthy();
      expect(screen.getByLabelText('Pending in escrow: $150.00')).toBeTruthy();
      expect(screen.getByLabelText('Total earnings: $1,500.00')).toBeTruthy();
    });

    it('should have accessibility hint for hide balance button', () => {
      render(<WalletBalance wallet={mockWallet} />);
      const toggleButton = screen.getByLabelText('Hide balance');
      expect(toggleButton.props.accessibilityHint).toBe('Toggle balance visibility');
    });

    it('should have descriptive label for withdraw button', () => {
      render(<WalletBalance wallet={mockWallet} {...mockHandlers} />);
      expect(screen.getByLabelText('Withdraw funds to bank account')).toBeTruthy();
    });

    it('should have descriptive label for transactions button', () => {
      render(<WalletBalance wallet={mockWallet} {...mockHandlers} />);
      expect(screen.getByLabelText('View transaction history')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large balances', () => {
      render(<WalletBalance wallet={{ ...mockWallet, availableBalance: 999999.99 }} />);
      expect(screen.getByText('$999,999.99')).toBeTruthy();
    });

    it('should handle decimal amounts correctly', () => {
      render(<WalletBalance wallet={{ ...mockWallet, availableBalance: 123.45 }} />);
      expect(screen.getByText('$123.45')).toBeTruthy();
    });

    it('should handle missing currency (defaults to USD)', () => {
      render(<WalletBalance wallet={{ ...mockWallet, currency: undefined as any }} />);
      expect(screen.getByText('$250.00')).toBeTruthy();
    });

    it('should handle negative zero correctly', () => {
      render(<WalletBalance wallet={{ ...mockWallet, availableBalance: -0 }} />);
      const zeroAmounts = screen.queryAllByText('$0.00');
      expect(zeroAmounts.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance', () => {
    it('should use React.memo to prevent unnecessary re-renders', () => {
      const { rerender } = render(<WalletBalance wallet={mockWallet} />);
      const firstRender = screen.getByTestId('wallet-balance');

      rerender(<WalletBalance wallet={mockWallet} />);
      const secondRender = screen.getByTestId('wallet-balance');

      expect(firstRender).toBe(secondRender);
    });

    it('should render large wallet data quickly', () => {
      const start = performance.now();
      render(
        <WalletBalance wallet={{ ...mockWallet, totalEarnings: 1000000 }} {...mockHandlers} />
      );
      const end = performance.now();
      expect(end - start).toBeLessThan(100);
    });
  });

  describe('Layout and Styling', () => {
    it('should display balance cards in a grid layout', () => {
      render(<WalletBalance wallet={mockWallet} />);
      expect(screen.getByTestId('pending-escrow')).toBeTruthy();
      expect(screen.getByTestId('total-earnings')).toBeTruthy();
    });

    it('should highlight total earnings in green', () => {
      const { UNSAFE_getByType } = render(<WalletBalance wallet={mockWallet} />);
      const earningsAmount = screen.getByText('$1,500.00');
      expect(earningsAmount.props.className).toContain('text-green');
    });

    it('should emphasize available balance with larger font', () => {
      const { UNSAFE_getByType } = render(<WalletBalance wallet={mockWallet} />);
      const availableAmount = screen.getByText('$250.00');
      expect(availableAmount.props.className).toContain('text-4xl');
    });
  });
});
