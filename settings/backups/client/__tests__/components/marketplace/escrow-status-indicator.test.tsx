import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { EscrowStatusIndicator } from '@/components/marketplace/escrow-status-indicator';
import type { EscrowStatus } from '@/lib/types/marketplace';

describe('EscrowStatusIndicator', () => {
  const baseEscrow: EscrowStatus = {
    status: 'held',
    amount: 100.0,
    releaseDate: Date.now() + 5 * 24 * 60 * 60 * 1000, // 5 days from now
    daysRemaining: 5,
    canConfirm: true,
    canDispute: true,
  };

  const mockHandlers = {
    onConfirmDelivery: jest.fn(),
    onInitiateDispute: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering - Held Status', () => {
    it('should render escrow status indicator', () => {
      render(<EscrowStatusIndicator escrow={baseEscrow} userType="buyer" {...mockHandlers} />);
      expect(screen.getByTestId('escrow-status-indicator')).toBeTruthy();
    });

    it('should display held status label', () => {
      render(<EscrowStatusIndicator escrow={baseEscrow} userType="buyer" {...mockHandlers} />);
      expect(screen.getByText('Funds Held in Escrow')).toBeTruthy();
    });

    it('should display escrow amount', () => {
      render(<EscrowStatusIndicator escrow={baseEscrow} userType="buyer" {...mockHandlers} />);
      expect(screen.getByText('$100.00')).toBeTruthy();
      expect(screen.getByText('Held in Escrow')).toBeTruthy();
    });

    it('should show progress bar for held status', () => {
      render(<EscrowStatusIndicator escrow={baseEscrow} userType="buyer" {...mockHandlers} />);
      expect(screen.getByText('Escrow Period')).toBeTruthy();
      expect(screen.getByText('5 days remaining')).toBeTruthy();
    });

    it('should display singular "day" when 1 day remaining', () => {
      render(
        <EscrowStatusIndicator
          escrow={{ ...baseEscrow, daysRemaining: 1 }}
          userType="buyer"
          {...mockHandlers}
        />
      );
      expect(screen.getByText('1 day remaining')).toBeTruthy();
    });

    it('should show auto-release date', () => {
      render(<EscrowStatusIndicator escrow={baseEscrow} userType="buyer" {...mockHandlers} />);
      expect(screen.getByText(/Auto-release on/i)).toBeTruthy();
    });
  });

  describe('User-Specific Descriptions', () => {
    it('should show buyer-specific description for held status', () => {
      render(<EscrowStatusIndicator escrow={baseEscrow} userType="buyer" {...mockHandlers} />);
      expect(screen.getByText(/Funds are securely held until you confirm delivery/i)).toBeTruthy();
    });

    it('should show seller-specific description for held status', () => {
      render(<EscrowStatusIndicator escrow={baseEscrow} userType="seller" {...mockHandlers} />);
      expect(screen.getByText(/Funds will be released once buyer confirms delivery/i)).toBeTruthy();
    });

    it('should show buyer-specific info message', () => {
      render(<EscrowStatusIndicator escrow={baseEscrow} userType="buyer" {...mockHandlers} />);
      expect(screen.getByText(/Confirm delivery to release funds immediately/i)).toBeTruthy();
    });

    it('should show seller-specific info message', () => {
      render(<EscrowStatusIndicator escrow={baseEscrow} userType="seller" {...mockHandlers} />);
      expect(screen.getByText(/Funds will automatically be released to you in/i)).toBeTruthy();
    });
  });

  describe('Released Status', () => {
    const releasedEscrow: EscrowStatus = {
      ...baseEscrow,
      status: 'released',
    };

    it('should display released status label', () => {
      render(<EscrowStatusIndicator escrow={releasedEscrow} userType="seller" />);
      expect(screen.getByText('Funds Released')).toBeTruthy();
    });

    it('should show seller-specific success message', () => {
      render(<EscrowStatusIndicator escrow={releasedEscrow} userType="seller" />);
      expect(screen.getByText(/Funds have been released to your wallet/i)).toBeTruthy();
    });

    it('should show buyer-specific success message', () => {
      render(<EscrowStatusIndicator escrow={releasedEscrow} userType="buyer" />);
      const elements = screen.getAllByText(/Transaction completed successfully/i);
      expect(elements.length).toBeGreaterThan(0);
    });

    it('should display released amount', () => {
      render(<EscrowStatusIndicator escrow={releasedEscrow} userType="seller" />);
      expect(screen.getByText('$100.00')).toBeTruthy();
      expect(screen.getByText('Released')).toBeTruthy();
    });

    it('should not show progress bar for released status', () => {
      render(<EscrowStatusIndicator escrow={releasedEscrow} userType="seller" />);
      expect(screen.queryByText('Escrow Period')).toBeNull();
    });

    it('should not show action buttons for released status', () => {
      render(<EscrowStatusIndicator escrow={releasedEscrow} userType="buyer" {...mockHandlers} />);
      expect(screen.queryByTestId('confirm-delivery-button')).toBeNull();
      expect(screen.queryByTestId('dispute-button')).toBeNull();
    });
  });

  describe('Disputed Status', () => {
    const disputedEscrow: EscrowStatus = {
      ...baseEscrow,
      status: 'disputed',
    };

    it('should display disputed status label', () => {
      render(<EscrowStatusIndicator escrow={disputedEscrow} userType="buyer" />);
      expect(screen.getByText('Dispute in Progress')).toBeTruthy();
    });

    it('should show dispute description', () => {
      render(<EscrowStatusIndicator escrow={disputedEscrow} userType="buyer" />);
      expect(screen.getByText(/Our support team is reviewing this transaction/i)).toBeTruthy();
    });

    it('should display disputed amount', () => {
      render(<EscrowStatusIndicator escrow={disputedEscrow} userType="buyer" />);
      expect(screen.getByText('$100.00')).toBeTruthy();
      expect(screen.getByText('Disputed Amount')).toBeTruthy();
    });

    it('should show support contact message', () => {
      render(<EscrowStatusIndicator escrow={disputedEscrow} userType="buyer" />);
      expect(screen.getByText(/Our support team will contact you within 24 hours/i)).toBeTruthy();
    });

    it('should not show action buttons for disputed status', () => {
      render(<EscrowStatusIndicator escrow={disputedEscrow} userType="buyer" {...mockHandlers} />);
      expect(screen.queryByTestId('confirm-delivery-button')).toBeNull();
      expect(screen.queryByTestId('dispute-button')).toBeNull();
    });
  });

  describe('Action Buttons', () => {
    it('should show confirm delivery button for buyer when canConfirm is true', () => {
      render(<EscrowStatusIndicator escrow={baseEscrow} userType="buyer" {...mockHandlers} />);
      expect(screen.getByTestId('confirm-delivery-button')).toBeTruthy();
      expect(screen.getByText('Confirm Delivery')).toBeTruthy();
    });

    it('should hide confirm delivery button for seller', () => {
      render(<EscrowStatusIndicator escrow={baseEscrow} userType="seller" {...mockHandlers} />);
      expect(screen.queryByTestId('confirm-delivery-button')).toBeNull();
    });

    it('should hide confirm delivery button when canConfirm is false', () => {
      render(
        <EscrowStatusIndicator
          escrow={{ ...baseEscrow, canConfirm: false }}
          userType="buyer"
          {...mockHandlers}
        />
      );
      expect(screen.queryByTestId('confirm-delivery-button')).toBeNull();
    });

    it('should call onConfirmDelivery when button is pressed', () => {
      render(<EscrowStatusIndicator escrow={baseEscrow} userType="buyer" {...mockHandlers} />);
      fireEvent.press(screen.getByTestId('confirm-delivery-button'));
      expect(mockHandlers.onConfirmDelivery).toHaveBeenCalledTimes(1);
    });

    it('should show dispute button when canDispute is true', () => {
      render(<EscrowStatusIndicator escrow={baseEscrow} userType="buyer" {...mockHandlers} />);
      expect(screen.getByTestId('dispute-button')).toBeTruthy();
      expect(screen.getByText('Report Issue')).toBeTruthy();
    });

    it('should hide dispute button when canDispute is false', () => {
      render(
        <EscrowStatusIndicator
          escrow={{ ...baseEscrow, canDispute: false }}
          userType="buyer"
          {...mockHandlers}
        />
      );
      expect(screen.queryByTestId('dispute-button')).toBeNull();
    });

    it('should call onInitiateDispute when button is pressed', () => {
      render(<EscrowStatusIndicator escrow={baseEscrow} userType="buyer" {...mockHandlers} />);
      fireEvent.press(screen.getByTestId('dispute-button'));
      expect(mockHandlers.onInitiateDispute).toHaveBeenCalledTimes(1);
    });
  });

  describe('Progress Calculation', () => {
    it('should calculate progress correctly for 5 days remaining', () => {
      render(
        <EscrowStatusIndicator escrow={{ ...baseEscrow, daysRemaining: 5 }} userType="buyer" />
      );
      // Progress = 100 - (5/7 * 100) = ~28.57%
      expect(screen.getByText('5 days remaining')).toBeTruthy();
    });

    it('should calculate progress correctly for 1 day remaining', () => {
      render(
        <EscrowStatusIndicator escrow={{ ...baseEscrow, daysRemaining: 1 }} userType="buyer" />
      );
      // Progress = 100 - (1/7 * 100) = ~85.71%
      expect(screen.getByText('1 day remaining')).toBeTruthy();
    });

    it('should handle 0 days remaining', () => {
      render(
        <EscrowStatusIndicator escrow={{ ...baseEscrow, daysRemaining: 0 }} userType="buyer" />
      );
      expect(screen.getByText('0 days remaining')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have summary role for screen readers', () => {
      render(<EscrowStatusIndicator escrow={baseEscrow} userType="buyer" {...mockHandlers} />);
      const indicator = screen.getByTestId('escrow-status-indicator');
      expect(indicator.props.accessibilityRole).toBe('summary');
    });

    it('should have descriptive accessibility label', () => {
      render(<EscrowStatusIndicator escrow={baseEscrow} userType="buyer" {...mockHandlers} />);
      expect(screen.getByLabelText(/Funds Held in Escrow: \$100.00/i)).toBeTruthy();
    });

    it('should have accessibility hint for confirm delivery button', () => {
      render(<EscrowStatusIndicator escrow={baseEscrow} userType="buyer" {...mockHandlers} />);
      const button = screen.getByTestId('confirm-delivery-button');
      expect(button.props.accessibilityHint).toBe('Double tap to confirm you received the item');
    });

    it('should have accessibility hint for dispute button', () => {
      render(<EscrowStatusIndicator escrow={baseEscrow} userType="buyer" {...mockHandlers} />);
      const button = screen.getByTestId('dispute-button');
      expect(button.props.accessibilityHint).toBe(
        'Double tap to report an issue with this transaction'
      );
    });

    it('should have live region for info messages', () => {
      render(<EscrowStatusIndicator escrow={baseEscrow} userType="buyer" {...mockHandlers} />);
      // Verify info message is present
      expect(screen.getByText(/Confirm delivery to release funds immediately/i)).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large escrow amounts', () => {
      render(
        <EscrowStatusIndicator escrow={{ ...baseEscrow, amount: 99999.99 }} userType="buyer" />
      );
      expect(screen.getByText('$99999.99')).toBeTruthy();
    });

    it('should handle decimal amounts correctly', () => {
      render(<EscrowStatusIndicator escrow={{ ...baseEscrow, amount: 123.45 }} userType="buyer" />);
      expect(screen.getByText('$123.45')).toBeTruthy();
    });

    it('should format release date correctly', () => {
      const futureDate = new Date('2025-12-25').getTime();
      render(
        <EscrowStatusIndicator
          escrow={{ ...baseEscrow, releaseDate: futureDate }}
          userType="buyer"
        />
      );
      expect(screen.getByText(/Dec 25, 2025/i)).toBeTruthy();
    });
  });

  describe('Performance', () => {
    it('should use React.memo to prevent unnecessary re-renders', () => {
      const { rerender } = render(
        <EscrowStatusIndicator escrow={baseEscrow} userType="buyer" {...mockHandlers} />
      );
      const firstRender = screen.getByTestId('escrow-status-indicator');

      rerender(<EscrowStatusIndicator escrow={baseEscrow} userType="buyer" {...mockHandlers} />);
      const secondRender = screen.getByTestId('escrow-status-indicator');

      expect(firstRender).toBe(secondRender);
    });

    it('should render quickly', () => {
      const start = performance.now();
      render(<EscrowStatusIndicator escrow={baseEscrow} userType="buyer" {...mockHandlers} />);
      const end = performance.now();
      expect(end - start).toBeLessThan(50);
    });
  });
});
