/**
 * EscrowStatus Component Tests
 *
 * Comprehensive tests for the EscrowStatus component covering:
 * - Status badge rendering for all transaction states
 * - Timeline display
 * - Date formatting
 * - Auto-release countdown
 * - Escrow protection notice
 * - Edge cases
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { EscrowStatus, TransactionStatus } from '@/components/marketplace/escrow-status';

describe('EscrowStatus', () => {
  const mockDates = {
    escrowHeldAt: '2025-11-10T10:00:00Z',
    deliveryConfirmedAt: '2025-11-12T14:30:00Z',
    fundsReleasedAt: '2025-11-15T09:00:00Z',
    autoReleaseDate: '2025-11-20T00:00:00Z',
    disputeOpenedAt: '2025-11-13T16:00:00Z',
  };

  // ============================================================================
  // Status Badge Rendering Tests
  // ============================================================================

  describe('Status Badge Rendering', () => {
    it('should render "Initiated" status correctly', () => {
      render(<EscrowStatus status="initiated" />);

      expect(screen.getByText('Initiated')).toBeTruthy();
      expect(screen.getByText('Transaction has been created')).toBeTruthy();
    });

    it('should render "Payment Pending" status correctly', () => {
      render(<EscrowStatus status="pending" />);

      expect(screen.getByText('Payment Pending')).toBeTruthy();
      expect(screen.getByText('Waiting for payment confirmation')).toBeTruthy();
    });

    it('should render "Funds in Escrow" status correctly', () => {
      render(<EscrowStatus status="escrow_held" escrowHeldAt={mockDates.escrowHeldAt} />);

      expect(screen.getByText('Funds in Escrow')).toBeTruthy();
      expect(screen.getByText('Payment received and held securely')).toBeTruthy();
    });

    it('should render "Delivery Confirmed" status correctly', () => {
      render(
        <EscrowStatus
          status="delivered"
          deliveryConfirmedAt={mockDates.deliveryConfirmedAt}
          autoReleaseDate={mockDates.autoReleaseDate}
        />
      );

      expect(screen.getAllByText('Delivery Confirmed').length).toBeGreaterThan(0);
      expect(screen.getByText('Seller confirmed delivery')).toBeTruthy();
    });

    it('should render "Funds Released" status correctly', () => {
      render(<EscrowStatus status="released" fundsReleasedAt={mockDates.fundsReleasedAt} />);

      expect(screen.getByText('Funds Released')).toBeTruthy();
      expect(screen.getByText('Payment released to seller')).toBeTruthy();
    });

    it('should render "Under Dispute" status correctly', () => {
      render(<EscrowStatus status="disputed" disputeOpenedAt={mockDates.disputeOpenedAt} />);

      expect(screen.getByText('Under Dispute')).toBeTruthy();
      expect(screen.getByText('Dispute opened, under review')).toBeTruthy();
    });

    it('should render "Refunded" status correctly', () => {
      render(<EscrowStatus status="refunded" />);

      expect(screen.getByText('Refunded')).toBeTruthy();
      expect(screen.getByText('Payment refunded to buyer')).toBeTruthy();
    });

    it('should render "Cancelled" status correctly', () => {
      render(<EscrowStatus status="cancelled" />);

      expect(screen.getByText('Cancelled')).toBeTruthy();
      expect(screen.getByText('Transaction cancelled')).toBeTruthy();
    });

    it('should render "Failed" status correctly', () => {
      render(<EscrowStatus status="failed" />);

      expect(screen.getByText('Failed')).toBeTruthy();
      expect(screen.getByText('Payment failed')).toBeTruthy();
    });
  });

  // ============================================================================
  // Auto-Release Countdown Tests
  // ============================================================================

  describe('Auto-Release Countdown', () => {
    it('should show auto-release countdown for delivered status', () => {
      // Set auto-release date to 3 days from now
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);

      render(
        <EscrowStatus
          status="delivered"
          deliveryConfirmedAt={mockDates.deliveryConfirmedAt}
          autoReleaseDate={futureDate.toISOString()}
        />
      );

      expect(screen.getByText(/Auto-release in \d+ days?/)).toBeTruthy();
    });

    it('should not show auto-release countdown when date has passed', () => {
      // Set auto-release date to past
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      render(<EscrowStatus status="delivered" autoReleaseDate={pastDate.toISOString()} />);

      expect(screen.queryByText(/Auto-release in/)).toBeNull();
    });

    it('should not show auto-release countdown for non-delivered status', () => {
      render(<EscrowStatus status="escrow_held" autoReleaseDate={mockDates.autoReleaseDate} />);

      expect(screen.queryByText(/Auto-release in/)).toBeNull();
    });

    it('should use singular "day" for one day remaining', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      render(<EscrowStatus status="delivered" autoReleaseDate={tomorrow.toISOString()} />);

      expect(screen.getByText(/Auto-release in 1 day/)).toBeTruthy();
    });

    it('should use plural "days" for multiple days', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      render(<EscrowStatus status="delivered" autoReleaseDate={futureDate.toISOString()} />);

      expect(screen.getByText(/Auto-release in 5 days/)).toBeTruthy();
    });
  });

  // ============================================================================
  // Escrow Protection Notice Tests
  // ============================================================================

  describe('Escrow Protection Notice', () => {
    it('should show protection notice for escrow_held status', () => {
      render(<EscrowStatus status="escrow_held" />);

      expect(screen.getByText('Your payment is protected')).toBeTruthy();
      expect(screen.getByText(/Funds are held securely/)).toBeTruthy();
    });

    it('should show protection notice for delivered status', () => {
      render(<EscrowStatus status="delivered" />);

      expect(screen.getByText('Your payment is protected')).toBeTruthy();
    });

    it('should not show protection notice for released status', () => {
      render(<EscrowStatus status="released" />);

      expect(screen.queryByText('Your payment is protected')).toBeNull();
    });

    it('should not show protection notice for cancelled status', () => {
      render(<EscrowStatus status="cancelled" />);

      expect(screen.queryByText('Your payment is protected')).toBeNull();
    });
  });

  // ============================================================================
  // Timeline Tests
  // ============================================================================

  describe('Timeline', () => {
    it('should show timeline when showTimeline is true', () => {
      render(
        <EscrowStatus status="released" showTimeline={true} escrowHeldAt={mockDates.escrowHeldAt} />
      );

      expect(screen.getByText('Transaction Timeline')).toBeTruthy();
    });

    it('should not show timeline when showTimeline is false', () => {
      render(
        <EscrowStatus
          status="released"
          showTimeline={false}
          escrowHeldAt={mockDates.escrowHeldAt}
        />
      );

      expect(screen.queryByText('Transaction Timeline')).toBeNull();
    });

    it('should show timeline by default', () => {
      render(<EscrowStatus status="released" escrowHeldAt={mockDates.escrowHeldAt} />);

      expect(screen.getByText('Transaction Timeline')).toBeTruthy();
    });

    it('should show escrow held event in timeline', () => {
      render(<EscrowStatus status="escrow_held" escrowHeldAt={mockDates.escrowHeldAt} />);

      expect(screen.getByText('Funds Held in Escrow')).toBeTruthy();
    });

    it('should show delivery confirmed event in timeline', () => {
      render(
        <EscrowStatus status="delivered" deliveryConfirmedAt={mockDates.deliveryConfirmedAt} />
      );

      expect(screen.getAllByText('Delivery Confirmed').length).toBeGreaterThan(0);
    });

    it('should show funds released event in timeline', () => {
      render(<EscrowStatus status="released" fundsReleasedAt={mockDates.fundsReleasedAt} />);

      expect(screen.getByText('Funds Released to Seller')).toBeTruthy();
    });

    it('should show dispute event in timeline', () => {
      render(<EscrowStatus status="disputed" disputeOpenedAt={mockDates.disputeOpenedAt} />);

      expect(screen.getByText('Dispute Opened')).toBeTruthy();
    });

    it('should show auto-release scheduled in timeline for delivered status', () => {
      render(<EscrowStatus status="delivered" autoReleaseDate={mockDates.autoReleaseDate} />);

      expect(screen.getByText('Auto-release Scheduled')).toBeTruthy();
    });

    it('should not show auto-release scheduled when funds already released', () => {
      render(
        <EscrowStatus
          status="released"
          fundsReleasedAt={mockDates.fundsReleasedAt}
          autoReleaseDate={mockDates.autoReleaseDate}
        />
      );

      expect(screen.queryByText('Auto-release Scheduled')).toBeNull();
    });
  });

  // ============================================================================
  // Date Formatting Tests
  // ============================================================================

  describe('Date Formatting', () => {
    it('should format dates in timeline correctly', () => {
      render(<EscrowStatus status="escrow_held" escrowHeldAt={mockDates.escrowHeldAt} />);

      // Date should be formatted like "Nov 10, 2025, 10:00 AM"
      expect(screen.getByText(/Nov 10, 2025/)).toBeTruthy();
    });

    it('should handle invalid date strings gracefully', () => {
      expect(() =>
        render(<EscrowStatus status="escrow_held" escrowHeldAt="invalid-date" />)
      ).not.toThrow();
    });

    it('should handle missing dates gracefully', () => {
      expect(() => render(<EscrowStatus status="escrow_held" />)).not.toThrow();
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle all timeline events together', () => {
      render(
        <EscrowStatus
          status="released"
          escrowHeldAt={mockDates.escrowHeldAt}
          deliveryConfirmedAt={mockDates.deliveryConfirmedAt}
          fundsReleasedAt={mockDates.fundsReleasedAt}
        />
      );

      expect(screen.getByText('Funds Held in Escrow')).toBeTruthy();
      expect(screen.getByText('Delivery Confirmed')).toBeTruthy();
      expect(screen.getByText('Funds Released to Seller')).toBeTruthy();
    });

    it('should handle zero days until auto-release', () => {
      const today = new Date();
      today.setHours(23, 59, 59);

      render(<EscrowStatus status="delivered" autoReleaseDate={today.toISOString()} />);

      // Should not crash
      expect(screen.getByText('Delivery Confirmed')).toBeTruthy();
    });

    it('should handle very old dates', () => {
      const oldDate = '2020-01-01T00:00:00Z';

      expect(() =>
        render(<EscrowStatus status="released" escrowHeldAt={oldDate} fundsReleasedAt={oldDate} />)
      ).not.toThrow();
    });

    it('should handle future dates for historical events', () => {
      const futureDate = '2030-12-31T23:59:59Z';

      expect(() =>
        render(<EscrowStatus status="escrow_held" escrowHeldAt={futureDate} />)
      ).not.toThrow();
    });
  });

  // ============================================================================
  // Accessibility Tests
  // ============================================================================

  describe('Accessibility', () => {
    it('should have accessible status label', () => {
      render(<EscrowStatus status="escrow_held" />);

      const statusLabel = screen.getByText('Funds in Escrow');
      expect(statusLabel).toBeTruthy();
    });

    it('should have accessible timeline section', () => {
      render(<EscrowStatus status="escrow_held" escrowHeldAt={mockDates.escrowHeldAt} />);

      const timeline = screen.getByText('Transaction Timeline');
      expect(timeline).toBeTruthy();
    });

    it('should have accessible protection notice', () => {
      render(<EscrowStatus status="escrow_held" />);

      const protectionNotice = screen.getByText('Your payment is protected');
      expect(protectionNotice).toBeTruthy();
    });
  });

  // ============================================================================
  // Performance Tests
  // ============================================================================

  describe('Performance', () => {
    it('should render within acceptable time', () => {
      const startTime = Date.now();
      render(<EscrowStatus status="escrow_held" />);
      const renderTime = Date.now() - startTime;

      expect(renderTime).toBeLessThan(50);
    });

    it('should handle rapid status changes', () => {
      const statuses: TransactionStatus[] = [
        'initiated',
        'pending',
        'escrow_held',
        'delivered',
        'released',
      ];

      const { rerender } = render(<EscrowStatus status="initiated" />);

      statuses.forEach((status) => {
        rerender(<EscrowStatus status={status} />);
      });

      expect(screen.getByText('Funds Released')).toBeTruthy();
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('Integration', () => {
    it('should show complete transaction flow', () => {
      render(
        <EscrowStatus
          status="released"
          showTimeline={true}
          escrowHeldAt={mockDates.escrowHeldAt}
          deliveryConfirmedAt={mockDates.deliveryConfirmedAt}
          fundsReleasedAt={mockDates.fundsReleasedAt}
        />
      );

      // Status card
      expect(screen.getByText('Funds Released')).toBeTruthy();

      // Timeline events
      expect(screen.getByText('Transaction Timeline')).toBeTruthy();
      expect(screen.getByText('Funds Held in Escrow')).toBeTruthy();
      expect(screen.getByText('Delivery Confirmed')).toBeTruthy();
      expect(screen.getByText('Funds Released to Seller')).toBeTruthy();
    });

    it('should show dispute flow', () => {
      render(
        <EscrowStatus
          status="disputed"
          showTimeline={true}
          escrowHeldAt={mockDates.escrowHeldAt}
          disputeOpenedAt={mockDates.disputeOpenedAt}
        />
      );

      // Status
      expect(screen.getByText('Under Dispute')).toBeTruthy();

      // Timeline
      expect(screen.getByText('Funds Held in Escrow')).toBeTruthy();
      expect(screen.getByText('Dispute Opened')).toBeTruthy();
    });
  });
});
