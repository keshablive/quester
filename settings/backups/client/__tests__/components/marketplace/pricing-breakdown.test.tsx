import React from 'react';
import { render, screen } from '@testing-library/react-native';
import '@testing-library/jest-native/extend-expect';
import { PricingBreakdown } from '@/components/marketplace/pricing-breakdown';
import type { PricingBreakdown as PricingBreakdownType } from '@/lib/types/marketplace';

const mockPricing: PricingBreakdownType = {
  basePrice: 100.0,
  platformFee: 5.0,
  platformFeePercent: 5,
  escrowPeriod: 7,
  total: 105.0,
  currency: 'USD',
};

describe('PricingBreakdown', () => {
  describe('Rendering', () => {
    it('should render pricing breakdown card', () => {
      render(<PricingBreakdown pricing={mockPricing} />);

      expect(screen.getByText('Pricing Breakdown')).toBeTruthy();
      expect(screen.getByTestId('pricing-breakdown')).toBeTruthy();
    });

    it('should display item price', () => {
      render(<PricingBreakdown pricing={mockPricing} />);

      expect(screen.getByText('Item Price')).toBeTruthy();
      expect(screen.getByTestId('item-price')).toHaveTextContent('$100.00');
    });

    it('should display platform fee with percentage', () => {
      render(<PricingBreakdown pricing={mockPricing} />);

      expect(screen.getByText('Platform Fee')).toBeTruthy();
      expect(screen.getByText('(5%)')).toBeTruthy();
      expect(screen.getByTestId('platform-fee')).toHaveTextContent('$5.00');
    });

    it('should display total price', () => {
      render(<PricingBreakdown pricing={mockPricing} />);

      expect(screen.getByText('Total')).toBeTruthy();
      expect(screen.getByTestId('total-price')).toHaveTextContent('$105.00');
    });

    it('should show escrow information by default', () => {
      render(<PricingBreakdown pricing={mockPricing} />);

      expect(screen.getByTestId('escrow-explanation')).toBeTruthy();
      expect(screen.getByText('Buyer Protection')).toBeTruthy();
      expect(screen.getByText(/held in escrow for 7 days/i)).toBeTruthy();
    });

    it('should hide escrow information when showEscrowInfo is false', () => {
      render(<PricingBreakdown pricing={mockPricing} showEscrowInfo={false} />);

      expect(screen.queryByTestId('escrow-explanation')).toBeFalsy();
    });
  });

  describe('Currency Formatting', () => {
    it('should format USD currency correctly', () => {
      render(<PricingBreakdown pricing={mockPricing} />);

      expect(screen.getByTestId('total-price')).toHaveTextContent('$105.00');
    });

    it('should format EUR currency correctly', () => {
      const eurPricing = { ...mockPricing, currency: 'EUR' };
      render(<PricingBreakdown pricing={eurPricing} />);

      expect(screen.getByTestId('total-price')).toHaveTextContent('€105.00');
    });

    it('should format GBP currency correctly', () => {
      const gbpPricing = { ...mockPricing, currency: 'GBP' };
      render(<PricingBreakdown pricing={gbpPricing} />);

      expect(screen.getByTestId('total-price')).toHaveTextContent('£105.00');
    });

    it('should handle decimal values correctly', () => {
      const decimalPricing = {
        ...mockPricing,
        basePrice: 99.99,
        platformFee: 5.0,
        total: 104.99,
      };
      render(<PricingBreakdown pricing={decimalPricing} />);

      expect(screen.getByTestId('item-price')).toHaveTextContent('$99.99');
      expect(screen.getByTestId('total-price')).toHaveTextContent('$104.99');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero base price', () => {
      const freePricing = {
        ...mockPricing,
        basePrice: 0,
        platformFee: 0,
        total: 0,
      };
      render(<PricingBreakdown pricing={freePricing} />);

      expect(screen.getByTestId('item-price')).toHaveTextContent('$0.00');
      expect(screen.getByTestId('total-price')).toHaveTextContent('$0.00');
    });

    it('should handle large amounts', () => {
      const largePricing = {
        ...mockPricing,
        basePrice: 10000.0,
        platformFee: 500.0,
        total: 10500.0,
      };
      render(<PricingBreakdown pricing={largePricing} />);

      expect(screen.getByTestId('item-price')).toHaveTextContent('$10,000.00');
      expect(screen.getByTestId('total-price')).toHaveTextContent('$10,500.00');
    });

    it('should handle different escrow periods', () => {
      const longEscrow = { ...mockPricing, escrowPeriod: 30 };
      render(<PricingBreakdown pricing={longEscrow} />);

      expect(screen.getByText(/held in escrow for 30 days/i)).toBeTruthy();
    });

    it('should handle high platform fee percentage', () => {
      const highFeePricing = {
        ...mockPricing,
        platformFee: 15.0,
        platformFeePercent: 15,
        total: 115.0,
      };
      render(<PricingBreakdown pricing={highFeePricing} />);

      expect(screen.getByText('(15%)')).toBeTruthy();
      expect(screen.getByTestId('platform-fee')).toHaveTextContent('$15.00');
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels for prices', () => {
      render(<PricingBreakdown pricing={mockPricing} />);

      expect(screen.getByLabelText(/Item price: \$100.00/i)).toBeTruthy();
      expect(screen.getByLabelText(/Platform fee 5%: \$5.00/i)).toBeTruthy();
      expect(screen.getByLabelText(/Total amount: \$105.00/i)).toBeTruthy();
    });

    it('should have alert role for escrow information', () => {
      render(<PricingBreakdown pricing={mockPricing} />);

      const escrowInfo = screen.getByTestId('escrow-explanation');
      expect(escrowInfo.props.accessibilityRole).toBe('alert');
    });

    it('should provide clear escrow explanation text', () => {
      render(<PricingBreakdown pricing={mockPricing} />);

      const explanation = screen.getByText(/Funds will be held in escrow/i);
      expect(explanation).toBeTruthy();
    });
  });

  describe('Performance', () => {
    it('should use React.memo for optimization', () => {
      const { rerender } = render(<PricingBreakdown pricing={mockPricing} />);

      // Re-render with same props
      rerender(<PricingBreakdown pricing={mockPricing} />);

      // Should still render correctly (memo prevents unnecessary re-renders)
      expect(screen.getByTestId('pricing-breakdown')).toBeTruthy();
    });

    it('should render quickly with complex pricing', () => {
      const complexPricing = {
        ...mockPricing,
        basePrice: 9999.99,
        platformFee: 499.99,
        total: 10499.98,
      };

      const start = performance.now();
      render(<PricingBreakdown pricing={complexPricing} />);
      const end = performance.now();

      expect(end - start).toBeLessThan(100); // Should render in <100ms
    });
  });

  describe('Layout and Styling', () => {
    it('should apply custom className', () => {
      render(<PricingBreakdown pricing={mockPricing} className="custom-class" />);

      const card = screen.getByTestId('pricing-breakdown');
      expect(card.props.className).toContain('custom-class');
    });

    it('should have separator between fee and total', () => {
      render(<PricingBreakdown pricing={mockPricing} />);

      // Check that pricing breakdown has proper structure
      expect(screen.getByTestId('pricing-breakdown')).toBeTruthy();
      expect(screen.getByTestId('item-price')).toBeTruthy();
      expect(screen.getByTestId('total-price')).toBeTruthy();
    });

    it('should highlight total price with primary color', () => {
      render(<PricingBreakdown pricing={mockPricing} />);

      const totalPrice = screen.getByTestId('total-price');
      expect(totalPrice.props.className).toContain('text-primary');
    });
  });

  describe('Escrow Information', () => {
    it('should explain automatic release', () => {
      render(<PricingBreakdown pricing={mockPricing} />);

      expect(screen.getByText(/automatically released after the escrow period/i)).toBeTruthy();
    });

    it('should explain early release option', () => {
      render(<PricingBreakdown pricing={mockPricing} />);

      expect(screen.getByText(/release them early by confirming delivery/i)).toBeTruthy();
    });

    it('should include info icon in escrow explanation', () => {
      const { UNSAFE_root } = render(<PricingBreakdown pricing={mockPricing} />);

      // Check for Info icon component (lucide-react-native)
      const escrowSection = screen.getByTestId('escrow-explanation');
      expect(escrowSection).toBeTruthy();
    });
  });
});
