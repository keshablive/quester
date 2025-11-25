import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { PaymentGatewaySelector } from '@/components/marketplace/payment-gateway-selector';
import type { PaymentGateway } from '@/components/marketplace/payment-gateway-selector';

describe('PaymentGatewaySelector', () => {
  const mockProps = {
    selectedGateway: 'razorpay' as PaymentGateway,
    onSelectGateway: jest.fn(),
    amount: 99.99,
    currency: 'USD',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering - Basic Elements', () => {
    it('should render payment gateway selector', () => {
      render(<PaymentGatewaySelector {...mockProps} />);
      expect(screen.getByText('Select Payment Method')).toBeTruthy();
    });

    it('should display amount summary', () => {
      render(<PaymentGatewaySelector {...mockProps} />);
      expect(screen.getByText('Total Amount')).toBeTruthy();
      expect(screen.getByText('$99.99')).toBeTruthy();
    });

    it('should display escrow notice', () => {
      render(<PaymentGatewaySelector {...mockProps} />);
      expect(screen.getByText(/Funds will be held in escrow/i)).toBeTruthy();
    });

    it('should display all payment gateway options', () => {
      render(<PaymentGatewaySelector {...mockProps} />);
      expect(screen.getByText('Razorpay')).toBeTruthy();
      expect(screen.getByText('UPI')).toBeTruthy();
      expect(screen.getByText('Stripe')).toBeTruthy();
      expect(screen.getByText('PayPal')).toBeTruthy();
      expect(screen.getByText('Cryptocurrency')).toBeTruthy();
    });

    it('should display gateway descriptions', () => {
      render(<PaymentGatewaySelector {...mockProps} />);
      expect(screen.getByText(/Credit Card, Debit Card, UPI, Net Banking/i)).toBeTruthy();
      expect(screen.getByText(/Google Pay, PhonePe, Paytm, BHIM/i)).toBeTruthy();
      expect(screen.getByText(/International Cards, Apple Pay, Google Pay/i)).toBeTruthy();
    });

    it('should show "Coming Soon" for disabled gateways', () => {
      render(<PaymentGatewaySelector {...mockProps} />);
      const comingSoonBadges = screen.queryAllByText('Coming Soon');
      expect(comingSoonBadges.length).toBe(2); // PayPal and Crypto
    });
  });

  describe('Amount Formatting', () => {
    it('should format USD amounts correctly', () => {
      render(<PaymentGatewaySelector {...mockProps} currency="USD" amount={99.99} />);
      expect(screen.getByText('$99.99')).toBeTruthy();
    });

    it('should format INR amounts correctly', () => {
      render(<PaymentGatewaySelector {...mockProps} currency="INR" amount={5000} />);
      expect(screen.getByText('₹5,000')).toBeTruthy();
    });

    it('should format EUR amounts generically', () => {
      render(<PaymentGatewaySelector {...mockProps} currency="EUR" amount={100} />);
      expect(screen.getByText('EUR 100')).toBeTruthy();
    });

    it('should handle large amounts with comma separators', () => {
      render(<PaymentGatewaySelector {...mockProps} amount={10000} />);
      expect(screen.getByText('$10,000')).toBeTruthy();
    });

    it('should handle decimal amounts', () => {
      render(<PaymentGatewaySelector {...mockProps} amount={49.95} />);
      expect(screen.getByText('$49.95')).toBeTruthy();
    });
  });

  describe('Gateway Selection', () => {
    it('should call onSelectGateway when Razorpay is selected', () => {
      render(<PaymentGatewaySelector {...mockProps} selectedGateway="upi" />);
      fireEvent.press(screen.getByText('Razorpay'));
      expect(mockProps.onSelectGateway).toHaveBeenCalledWith('razorpay');
    });

    it('should call onSelectGateway when UPI is selected', () => {
      render(<PaymentGatewaySelector {...mockProps} />);
      fireEvent.press(screen.getByText('UPI'));
      expect(mockProps.onSelectGateway).toHaveBeenCalledWith('upi');
    });

    it('should call onSelectGateway when Stripe is selected', () => {
      render(<PaymentGatewaySelector {...mockProps} />);
      fireEvent.press(screen.getByText('Stripe'));
      expect(mockProps.onSelectGateway).toHaveBeenCalledWith('stripe');
    });

    it('should not call onSelectGateway for disabled gateways', () => {
      render(<PaymentGatewaySelector {...mockProps} />);
      fireEvent.press(screen.getByText('PayPal'));
      expect(mockProps.onSelectGateway).not.toHaveBeenCalled();
    });

    it('should not allow selecting cryptocurrency (disabled)', () => {
      render(<PaymentGatewaySelector {...mockProps} />);
      fireEvent.press(screen.getByText('Cryptocurrency'));
      expect(mockProps.onSelectGateway).not.toHaveBeenCalled();
    });
  });

  describe('Visual State - Selected Gateway', () => {
    it('should highlight Razorpay when selected', () => {
      render(<PaymentGatewaySelector {...mockProps} selectedGateway="razorpay" />);
      const razorpayCard = screen.getByTestId('gateway-razorpay');
      expect(razorpayCard.props.className).toContain('border-primary');
    });

    it('should highlight UPI when selected', () => {
      render(<PaymentGatewaySelector {...mockProps} selectedGateway="upi" />);
      const upiCard = screen.getByTestId('gateway-upi');
      expect(upiCard.props.className).toContain('border-primary');
    });

    it('should highlight Stripe when selected', () => {
      render(<PaymentGatewaySelector {...mockProps} selectedGateway="stripe" />);
      const stripeCard = screen.getByTestId('gateway-stripe');
      expect(stripeCard.props.className).toContain('border-primary');
    });

    it('should not highlight non-selected gateways', () => {
      render(<PaymentGatewaySelector {...mockProps} selectedGateway="razorpay" />);
      const upiCard = screen.getByTestId('gateway-upi');
      expect(upiCard.props.className).not.toContain('border-primary');
    });
  });

  describe('Gateway Badges', () => {
    it('should display "Popular" and "Instant" badges for Razorpay', () => {
      render(<PaymentGatewaySelector {...mockProps} />);
      expect(screen.getByText('Popular')).toBeTruthy();
      expect(screen.getByText('Instant')).toBeTruthy();
    });

    it('should display "Fastest" badge for UPI', () => {
      render(<PaymentGatewaySelector {...mockProps} />);
      expect(screen.getByText('Fastest')).toBeTruthy();
    });

    it('should display "International" badge for Stripe', () => {
      render(<PaymentGatewaySelector {...mockProps} />);
      expect(screen.getByText('International')).toBeTruthy();
    });
  });

  describe('Security Notice', () => {
    it('should display security notice with lock icon', () => {
      render(<PaymentGatewaySelector {...mockProps} />);
      expect(screen.getByText('🔒')).toBeTruthy();
    });

    it('should mention encryption in security notice', () => {
      render(<PaymentGatewaySelector {...mockProps} />);
      expect(
        screen.getByText(/Your payment is secured with industry-standard encryption/i)
      ).toBeTruthy();
    });

    it('should mention escrow in security notice', () => {
      render(<PaymentGatewaySelector {...mockProps} />);
      expect(screen.getByText(/Funds are held in escrow until you confirm delivery/i)).toBeTruthy();
    });
  });

  describe('Disabled Gateways', () => {
    it('should show PayPal as coming soon', () => {
      render(<PaymentGatewaySelector {...mockProps} />);
      expect(screen.getByText('PayPal')).toBeTruthy();
      expect(screen.getAllByText('Coming Soon').length).toBeGreaterThan(0);
    });

    it('should show Cryptocurrency as coming soon', () => {
      render(<PaymentGatewaySelector {...mockProps} />);
      expect(screen.getByText('Cryptocurrency')).toBeTruthy();
      expect(screen.getAllByText('Coming Soon').length).toBeGreaterThan(0);
    });

    it('should have reduced opacity for disabled gateways', () => {
      render(<PaymentGatewaySelector {...mockProps} />);
      const paypalCard = screen.getByTestId('gateway-paypal');
      expect(paypalCard.props.className).toContain('opacity-50');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero amount', () => {
      render(<PaymentGatewaySelector {...mockProps} amount={0} />);
      expect(screen.getByText('$0')).toBeTruthy();
    });

    it('should handle very large amounts', () => {
      render(<PaymentGatewaySelector {...mockProps} amount={999999.99} />);
      expect(screen.getByText('$999,999.99')).toBeTruthy();
    });

    it('should handle missing currency (defaults to generic)', () => {
      render(<PaymentGatewaySelector {...mockProps} currency="" />);
      expect(screen.getByText(/99\.99/)).toBeTruthy();
    });

    it('should allow switching between gateways', () => {
      const { rerender } = render(
        <PaymentGatewaySelector {...mockProps} selectedGateway="razorpay" />
      );

      fireEvent.press(screen.getByText('UPI'));
      expect(mockProps.onSelectGateway).toHaveBeenCalledWith('upi');

      rerender(<PaymentGatewaySelector {...mockProps} selectedGateway="upi" />);
      fireEvent.press(screen.getByText('Stripe'));
      expect(mockProps.onSelectGateway).toHaveBeenCalledWith('stripe');
    });
  });

  describe('Accessibility', () => {
    it('should have touchable elements for enabled gateways', () => {
      render(<PaymentGatewaySelector {...mockProps} />);
      const razorpayButton = screen.getByText('Razorpay').parent?.parent?.parent;
      expect(razorpayButton).toBeTruthy();
    });

    it('should disable interaction for coming soon gateways', () => {
      render(<PaymentGatewaySelector {...mockProps} />);
      const paypalCard = screen.getByTestId('gateway-paypal');
      expect(paypalCard.props.className).toContain('opacity-50');
    });

    it('should provide clear labels for all payment methods', () => {
      render(<PaymentGatewaySelector {...mockProps} />);
      expect(screen.getByText('Razorpay')).toBeTruthy();
      expect(screen.getByText('UPI')).toBeTruthy();
      expect(screen.getByText('Stripe')).toBeTruthy();
      expect(screen.getByText('PayPal')).toBeTruthy();
      expect(screen.getByText('Cryptocurrency')).toBeTruthy();
    });
  });

  describe('Performance', () => {
    it('should render quickly with multiple gateways', () => {
      const start = performance.now();
      render(<PaymentGatewaySelector {...mockProps} />);
      const end = performance.now();
      expect(end - start).toBeLessThan(100);
    });

    it('should handle rapid selection changes', () => {
      render(<PaymentGatewaySelector {...mockProps} />);

      fireEvent.press(screen.getByText('UPI'));
      fireEvent.press(screen.getByText('Stripe'));
      fireEvent.press(screen.getByText('Razorpay'));

      expect(mockProps.onSelectGateway).toHaveBeenCalledTimes(3);
    });
  });

  describe('Integration Scenarios', () => {
    it('should display complete payment selection interface', () => {
      render(<PaymentGatewaySelector {...mockProps} />);

      expect(screen.getByText('Total Amount')).toBeTruthy();
      expect(screen.getByText('$99.99')).toBeTruthy();
      expect(screen.getByText('Select Payment Method')).toBeTruthy();
      expect(screen.getByText('Razorpay')).toBeTruthy();
      expect(screen.getByText(/industry-standard encryption/i)).toBeTruthy();
    });

    it('should handle INR currency with large amount', () => {
      render(
        <PaymentGatewaySelector
          {...mockProps}
          currency="INR"
          amount={50000}
          selectedGateway="upi"
        />
      );

      expect(screen.getByText('₹50,000')).toBeTruthy();
      const upiCard = screen.getByTestId('gateway-upi');
      expect(upiCard.props.className).toContain('border-primary');
    });
  });
});
