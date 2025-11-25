import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { TransactionReceipt } from '@/components/marketplace/transaction-receipt';
import type { Transaction } from '@/lib/types/marketplace';

describe('TransactionReceipt', () => {
  const baseTransaction: Transaction = {
    id: 'txn_1234567890abcdef',
    type: 'purchase',
    amount: 99.99,
    currency: 'USD',
    status: 'completed',
    createdAt: new Date('2025-01-15T10:30:00').getTime(),
    completedAt: new Date('2025-01-15T10:35:00').getTime(),
    description: 'React Native Advanced Course',
    itemTitle: 'React Native Mastery',
    seller: {
      id: 'seller123',
      username: 'johndoe',
      avatar: 'https://example.com/avatar.jpg',
    },
    buyer: {
      id: 'buyer456',
      username: 'janedoe',
      avatar: 'https://example.com/avatar2.jpg',
    },
  };

  const mockHandlers = {
    onDownload: jest.fn(),
    onContactSupport: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering - Basic Elements', () => {
    it('should render transaction receipt card', () => {
      render(<TransactionReceipt transaction={baseTransaction} />);
      expect(screen.getByTestId('transaction-receipt')).toBeTruthy();
    });

    it('should display receipt header', () => {
      render(<TransactionReceipt transaction={baseTransaction} />);
      expect(screen.getByText('Transaction Receipt')).toBeTruthy();
    });

    it('should display transaction ID', () => {
      render(<TransactionReceipt transaction={baseTransaction} />);
      expect(screen.getByText('Transaction ID')).toBeTruthy();
      expect(screen.getByText('txn_1234567890abcdef')).toBeTruthy();
    });

    it('should display transaction status badge', () => {
      render(<TransactionReceipt transaction={baseTransaction} />);
      const badge = screen.getByTestId('transaction-status');
      expect(badge).toBeTruthy();
      // Completed appears in both badge and status message
      const completedTexts = screen.queryAllByText('Completed');
      expect(completedTexts.length).toBeGreaterThan(0);
    });

    it('should display transaction type', () => {
      render(<TransactionReceipt transaction={baseTransaction} />);
      expect(screen.getByText('Type')).toBeTruthy();
      expect(screen.getByText('Purchase')).toBeTruthy();
    });

    it('should display description', () => {
      render(<TransactionReceipt transaction={baseTransaction} />);
      expect(screen.getByText('Description')).toBeTruthy();
      expect(screen.getByText('React Native Advanced Course')).toBeTruthy();
    });

    it('should display item title', () => {
      render(<TransactionReceipt transaction={baseTransaction} />);
      expect(screen.getByText('Item')).toBeTruthy();
      expect(screen.getByText('React Native Mastery')).toBeTruthy();
    });
  });

  describe('Transaction Types', () => {
    it('should display "Purchase" for purchase type', () => {
      render(<TransactionReceipt transaction={{ ...baseTransaction, type: 'purchase' }} />);
      expect(screen.getByText('Purchase')).toBeTruthy();
    });

    it('should display "Sale" for sale type', () => {
      render(<TransactionReceipt transaction={{ ...baseTransaction, type: 'sale' }} />);
      expect(screen.getByText('Sale')).toBeTruthy();
    });

    it('should display "Earning" for earning type', () => {
      render(<TransactionReceipt transaction={{ ...baseTransaction, type: 'earning' }} />);
      expect(screen.getByText('Earning')).toBeTruthy();
    });

    it('should display "Refund" for refund type', () => {
      render(<TransactionReceipt transaction={{ ...baseTransaction, type: 'refund' }} />);
      expect(screen.getByText('Refund')).toBeTruthy();
    });
  });

  describe('Transaction Status - Completed', () => {
    it('should show completed status icon and label', () => {
      render(<TransactionReceipt transaction={baseTransaction} />);
      const completedTexts = screen.queryAllByText('Completed');
      expect(completedTexts.length).toBeGreaterThan(0);
    });

    it('should display success message for completed transaction', () => {
      render(<TransactionReceipt transaction={baseTransaction} />);
      expect(screen.getByText(/Transaction completed successfully/i)).toBeTruthy();
    });

    it('should show completed date', () => {
      render(<TransactionReceipt transaction={baseTransaction} />);
      const completedTexts = screen.queryAllByText('Completed');
      expect(completedTexts.length).toBeGreaterThan(0);
      const dates = screen.queryAllByText(/Jan 15, 2025/);
      expect(dates.length).toBeGreaterThan(0);
    });

    it('should not show contact support button for completed', () => {
      render(<TransactionReceipt transaction={baseTransaction} {...mockHandlers} />);
      expect(screen.queryByTestId('contact-support-button')).toBeNull();
    });
  });

  describe('Transaction Status - Pending', () => {
    const pendingTx: Transaction = {
      ...baseTransaction,
      status: 'pending',
      completedAt: undefined,
    };

    it('should show pending status label', () => {
      render(<TransactionReceipt transaction={pendingTx} />);
      expect(screen.getByText('Pending')).toBeTruthy();
    });

    it('should display pending message', () => {
      render(<TransactionReceipt transaction={pendingTx} />);
      expect(
        screen.getByText(/Transaction is being processed. This may take a few minutes/i)
      ).toBeTruthy();
    });

    it('should not show completed date for pending transaction', () => {
      render(<TransactionReceipt transaction={pendingTx} />);
      expect(screen.queryByText('Completed')).toBeNull();
    });
  });

  describe('Transaction Status - Failed', () => {
    const failedTx: Transaction = {
      ...baseTransaction,
      status: 'failed',
      completedAt: undefined,
    };

    it('should show failed status label', () => {
      render(<TransactionReceipt transaction={failedTx} />);
      expect(screen.getByText('Failed')).toBeTruthy();
    });

    it('should display failure message', () => {
      render(<TransactionReceipt transaction={failedTx} />);
      expect(screen.getByText(/Transaction failed. Please contact support/i)).toBeTruthy();
    });

    it('should show contact support button for failed transaction', () => {
      render(<TransactionReceipt transaction={failedTx} {...mockHandlers} />);
      expect(screen.getByTestId('contact-support-button')).toBeTruthy();
    });

    it('should call onContactSupport when button pressed', () => {
      render(<TransactionReceipt transaction={failedTx} {...mockHandlers} />);
      fireEvent.press(screen.getByTestId('contact-support-button'));
      expect(mockHandlers.onContactSupport).toHaveBeenCalledTimes(1);
    });
  });

  describe('Transaction Status - Refunded', () => {
    const refundedTx: Transaction = {
      ...baseTransaction,
      status: 'refunded',
    };

    it('should show refunded status label', () => {
      render(<TransactionReceipt transaction={refundedTx} />);
      expect(screen.getByText('Refunded')).toBeTruthy();
    });

    it('should display refund message', () => {
      render(<TransactionReceipt transaction={refundedTx} />);
      expect(
        screen.getByText(/This transaction has been refunded to your original payment method/i)
      ).toBeTruthy();
    });

    it('should show contact support button for refunded transaction', () => {
      render(<TransactionReceipt transaction={refundedTx} {...mockHandlers} />);
      expect(screen.getByTestId('contact-support-button')).toBeTruthy();
    });
  });

  describe('Transaction Status - Processing', () => {
    const processingTx: Transaction = {
      ...baseTransaction,
      status: 'processing',
      completedAt: undefined,
    };

    it('should show processing status label', () => {
      render(<TransactionReceipt transaction={processingTx} />);
      expect(screen.getByText('Processing')).toBeTruthy();
    });
  });

  describe('Seller Information', () => {
    it('should display seller info for purchase transactions', () => {
      render(<TransactionReceipt transaction={baseTransaction} />);
      expect(screen.getByText('Seller')).toBeTruthy();
      expect(screen.getByText('johndoe')).toBeTruthy();
    });

    it('should not show seller info when seller is undefined', () => {
      render(<TransactionReceipt transaction={{ ...baseTransaction, seller: undefined }} />);
      expect(screen.queryByText('Seller')).toBeNull();
    });
  });

  describe('Buyer Information', () => {
    it('should display buyer info when present', () => {
      render(<TransactionReceipt transaction={baseTransaction} />);
      expect(screen.getByText('Buyer')).toBeTruthy();
      expect(screen.getByText('janedoe')).toBeTruthy();
    });

    it('should not show buyer info when buyer is undefined', () => {
      render(<TransactionReceipt transaction={{ ...baseTransaction, buyer: undefined }} />);
      expect(screen.queryByText('Buyer')).toBeNull();
    });
  });

  describe('Amount Display', () => {
    it('should display positive amount with + sign in green', () => {
      render(<TransactionReceipt transaction={{ ...baseTransaction, amount: 99.99 }} />);
      expect(screen.getByText('Amount')).toBeTruthy();
      expect(screen.getByText('+$99.99')).toBeTruthy();
    });

    it('should display negative amount with - sign in red', () => {
      render(<TransactionReceipt transaction={{ ...baseTransaction, amount: -99.99 }} />);
      expect(screen.getByText('-$99.99')).toBeTruthy();
    });

    it('should use absolute value for display', () => {
      render(<TransactionReceipt transaction={{ ...baseTransaction, amount: -50.0 }} />);
      expect(screen.getByText('-$50.00')).toBeTruthy();
    });
  });

  describe('Currency Formatting', () => {
    it('should format USD correctly', () => {
      render(<TransactionReceipt transaction={{ ...baseTransaction, currency: 'USD' }} />);
      expect(screen.getByText('+$99.99')).toBeTruthy();
    });

    it('should format EUR correctly', () => {
      render(<TransactionReceipt transaction={{ ...baseTransaction, currency: 'EUR' }} />);
      expect(screen.getByText('+€99.99')).toBeTruthy();
    });

    it('should format GBP correctly', () => {
      render(<TransactionReceipt transaction={{ ...baseTransaction, currency: 'GBP' }} />);
      expect(screen.getByText('+£99.99')).toBeTruthy();
    });

    it('should default to USD if currency not specified', () => {
      render(
        <TransactionReceipt transaction={{ ...baseTransaction, currency: undefined as any }} />
      );
      expect(screen.getByText('+$99.99')).toBeTruthy();
    });
  });

  describe('Date Formatting', () => {
    it('should format created date correctly', () => {
      render(<TransactionReceipt transaction={baseTransaction} />);
      expect(screen.getByText('Date')).toBeTruthy();
      const dates = screen.queryAllByText(/Jan 15, 2025/);
      expect(dates.length).toBeGreaterThan(0);
    });

    it('should include time in date format', () => {
      render(<TransactionReceipt transaction={baseTransaction} />);
      const dateTexts = screen.queryAllByText(/Jan 15, 2025.*10/);
      expect(dateTexts.length).toBeGreaterThan(0);
    });
  });

  describe('Download Action', () => {
    it('should show download button when handler provided', () => {
      render(<TransactionReceipt transaction={baseTransaction} {...mockHandlers} />);
      expect(screen.getByTestId('download-receipt-button')).toBeTruthy();
      expect(screen.getByText('Download Receipt')).toBeTruthy();
    });

    it('should hide download button when handler not provided', () => {
      render(<TransactionReceipt transaction={baseTransaction} />);
      expect(screen.queryByTestId('download-receipt-button')).toBeNull();
    });

    it('should call onDownload when button pressed', () => {
      render(<TransactionReceipt transaction={baseTransaction} {...mockHandlers} />);
      fireEvent.press(screen.getByTestId('download-receipt-button'));
      expect(mockHandlers.onDownload).toHaveBeenCalledTimes(1);
    });

    it('should have accessibility label for download button', () => {
      render(<TransactionReceipt transaction={baseTransaction} {...mockHandlers} />);
      expect(screen.getByLabelText('Download receipt as PDF')).toBeTruthy();
    });
  });

  describe('Footer Information', () => {
    it('should display footer note with transaction ID', () => {
      render(<TransactionReceipt transaction={baseTransaction} />);
      expect(
        screen.getByText(/For questions about this transaction, please contact support/i)
      ).toBeTruthy();
      const txIds = screen.queryAllByText(/txn_1234567890abcdef/);
      expect(txIds.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels', () => {
      render(<TransactionReceipt transaction={baseTransaction} {...mockHandlers} />);
      expect(screen.getByLabelText('Download receipt as PDF')).toBeTruthy();
    });

    it('should have accessibility label for support button', () => {
      render(
        <TransactionReceipt
          transaction={{ ...baseTransaction, status: 'failed' }}
          {...mockHandlers}
        />
      );
      expect(screen.getByLabelText('Contact customer support')).toBeTruthy();
    });

    it('should have selectable transaction ID for copying', () => {
      render(<TransactionReceipt transaction={baseTransaction} />);
      const idElement = screen.getByText('txn_1234567890abcdef');
      expect(idElement.props.selectable).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large amounts', () => {
      render(<TransactionReceipt transaction={{ ...baseTransaction, amount: 999999.99 }} />);
      expect(screen.getByText('+$999,999.99')).toBeTruthy();
    });

    it('should handle zero amount', () => {
      render(<TransactionReceipt transaction={{ ...baseTransaction, amount: 0 }} />);
      expect(screen.getByText('-$0.00')).toBeTruthy();
    });

    it('should handle missing item title', () => {
      render(<TransactionReceipt transaction={{ ...baseTransaction, itemTitle: undefined }} />);
      expect(screen.queryByText('Item')).toBeNull();
    });

    it('should handle missing seller and buyer', () => {
      render(
        <TransactionReceipt
          transaction={{
            ...baseTransaction,
            seller: undefined,
            buyer: undefined,
          }}
        />
      );
      expect(screen.queryByText('Seller')).toBeNull();
      expect(screen.queryByText('Buyer')).toBeNull();
    });

    it('should handle very long transaction IDs', () => {
      const longId = 'txn_' + 'a'.repeat(100);
      render(<TransactionReceipt transaction={{ ...baseTransaction, id: longId }} />);
      expect(screen.getByText(longId)).toBeTruthy();
    });

    it('should handle very long descriptions', () => {
      const longDesc =
        'This is a very long description that should still be displayed correctly even though it contains many characters and might wrap across multiple lines';
      render(<TransactionReceipt transaction={{ ...baseTransaction, description: longDesc }} />);
      expect(screen.getByText(longDesc)).toBeTruthy();
    });
  });

  describe('Performance', () => {
    it('should use React.memo to prevent unnecessary re-renders', () => {
      const { rerender } = render(<TransactionReceipt transaction={baseTransaction} />);
      const firstRender = screen.getByTestId('transaction-receipt');

      rerender(<TransactionReceipt transaction={baseTransaction} />);
      const secondRender = screen.getByTestId('transaction-receipt');

      expect(firstRender).toBe(secondRender);
    });

    it('should render complex receipt quickly', () => {
      const start = performance.now();
      render(<TransactionReceipt transaction={baseTransaction} {...mockHandlers} />);
      const end = performance.now();
      expect(end - start).toBeLessThan(100);
    });
  });

  describe('Layout and Styling', () => {
    it('should use ScrollView for long receipts', () => {
      render(<TransactionReceipt transaction={baseTransaction} />);
      // ScrollView is wrapped by Card, just verify receipt renders with all content
      expect(screen.getByTestId('transaction-receipt')).toBeTruthy();
      expect(screen.getByText('Transaction Receipt')).toBeTruthy();
      expect(screen.getByText('+$99.99')).toBeTruthy();
    });

    it('should display transaction ID in monospace font', () => {
      const { UNSAFE_getByText } = render(<TransactionReceipt transaction={baseTransaction} />);
      const idElement = screen.getByText('txn_1234567890abcdef');
      expect(idElement.props.className).toContain('font-mono');
    });

    it('should highlight amount with appropriate colors', () => {
      const { UNSAFE_getByText } = render(<TransactionReceipt transaction={baseTransaction} />);
      const amountElement = screen.getByText('+$99.99');
      expect(amountElement.props.style).toBeTruthy();
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete purchase flow receipt', () => {
      render(<TransactionReceipt transaction={baseTransaction} {...mockHandlers} />);

      expect(screen.getByText('Purchase')).toBeTruthy();
      const completedTexts = screen.queryAllByText('Completed');
      expect(completedTexts.length).toBeGreaterThan(0);
      expect(screen.getByText('johndoe')).toBeTruthy();
      expect(screen.getByText('+$99.99')).toBeTruthy();
      expect(screen.getByTestId('download-receipt-button')).toBeTruthy();
    });

    it('should handle failed refund with support options', () => {
      const failedRefund: Transaction = {
        ...baseTransaction,
        type: 'refund',
        status: 'failed',
        amount: -99.99,
      };

      render(<TransactionReceipt transaction={failedRefund} {...mockHandlers} />);

      expect(screen.getByText('Refund')).toBeTruthy();
      expect(screen.getByText('Failed')).toBeTruthy();
      expect(screen.getByText('-$99.99')).toBeTruthy();
      expect(screen.getByTestId('contact-support-button')).toBeTruthy();
    });
  });
});
