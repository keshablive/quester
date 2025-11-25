import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import '@testing-library/jest-native/extend-expect';
import { CheckoutFlow } from '@/components/marketplace/checkout-flow';
import type { CheckoutState, PaymentMethod } from '@/lib/types/marketplace';

const mockListing = {
  id: 'listing-123',
  title: 'Advanced React Native Course',
  price: 99.99,
  seller: {
    id: 'seller-1',
    username: 'johndoe',
    avatar: '/avatars/john.png',
  },
};

const mockPaymentMethods: PaymentMethod[] = [
  { id: 'pm-1', type: 'points', label: 'Platform Points (1,500 available)', isDefault: true },
  { id: 'pm-2', type: 'card', label: 'Card ending in 4242', isDefault: false },
  { id: 'pm-3', type: 'wallet', label: 'Wallet Balance ($250.00)', isDefault: false },
];

describe('CheckoutFlow', () => {
  describe('Step 1: Review', () => {
    it('should render review step with listing details', () => {
      render(<CheckoutFlow listing={mockListing} onComplete={jest.fn()} />);

      expect(screen.getByText('Review Purchase')).toBeTruthy();
      expect(screen.getByText('Advanced React Native Course')).toBeTruthy();
      expect(screen.getByText('$99.99')).toBeTruthy();
      expect(screen.getByText('johndoe')).toBeTruthy();
    });

    it('should show Continue to Payment button', () => {
      render(<CheckoutFlow listing={mockListing} onComplete={jest.fn()} />);

      const button = screen.getByText('Continue to Payment');
      expect(button).toBeTruthy();
    });

    it('should navigate to payment step on continue', async () => {
      render(<CheckoutFlow listing={mockListing} onComplete={jest.fn()} />);

      const button = screen.getByText('Continue to Payment');
      fireEvent.press(button);

      await waitFor(() => {
        expect(screen.getByText('Select Payment Method')).toBeTruthy();
      });
    });

    it('should show pricing breakdown in review step', () => {
      render(<CheckoutFlow listing={mockListing} onComplete={jest.fn()} />);

      expect(screen.getByText('Item Price')).toBeTruthy();
      expect(screen.getByText('Platform Fee (5%)')).toBeTruthy();
      expect(screen.getByText('Total')).toBeTruthy();
    });
  });

  describe('Step 2: Payment', () => {
    it('should render payment methods', async () => {
      render(
        <CheckoutFlow
          listing={mockListing}
          paymentMethods={mockPaymentMethods}
          onComplete={jest.fn()}
        />
      );

      // Navigate to payment step
      fireEvent.press(screen.getByText('Continue to Payment'));

      await waitFor(() => {
        expect(screen.getByText('Platform Points (1,500 available)')).toBeTruthy();
        expect(screen.getByText('Card ending in 4242')).toBeTruthy();
        expect(screen.getByText('Wallet Balance ($250.00)')).toBeTruthy();
      });
    });

    it('should select default payment method initially', async () => {
      render(
        <CheckoutFlow
          listing={mockListing}
          paymentMethods={mockPaymentMethods}
          onComplete={jest.fn()}
        />
      );

      fireEvent.press(screen.getByText('Continue to Payment'));

      await waitFor(() => {
        const pointsMethod = screen.getByTestId('payment-method-pm-1');
        expect(pointsMethod.props.accessibilityState.selected).toBe(true);
      });
    });

    it('should allow selecting different payment method', async () => {
      render(
        <CheckoutFlow
          listing={mockListing}
          paymentMethods={mockPaymentMethods}
          onComplete={jest.fn()}
        />
      );

      fireEvent.press(screen.getByText('Continue to Payment'));

      await waitFor(() => {
        const cardMethod = screen.getByTestId('payment-method-pm-2');
        fireEvent.press(cardMethod);

        expect(cardMethod.props.accessibilityState.selected).toBe(true);
      });
    });

    it('should show Continue to Confirm button', async () => {
      render(<CheckoutFlow listing={mockListing} onComplete={jest.fn()} />);

      fireEvent.press(screen.getByText('Continue to Payment'));

      await waitFor(() => {
        expect(screen.getByText('Continue to Confirm')).toBeTruthy();
      });
    });

    it('should navigate to confirm step', async () => {
      render(<CheckoutFlow listing={mockListing} onComplete={jest.fn()} />);

      fireEvent.press(screen.getByText('Continue to Payment'));

      await waitFor(() => {
        fireEvent.press(screen.getByText('Continue to Confirm'));
      });

      await waitFor(() => {
        expect(screen.getByText('Confirm Purchase')).toBeTruthy();
      });
    });
  });

  describe('Step 3: Confirm', () => {
    it('should render confirmation summary', async () => {
      render(
        <CheckoutFlow
          listing={mockListing}
          paymentMethods={mockPaymentMethods}
          onComplete={jest.fn()}
        />
      );

      // Navigate to confirm step
      fireEvent.press(screen.getByText('Continue to Payment'));
      await waitFor(() => fireEvent.press(screen.getByText('Continue to Confirm')));

      await waitFor(() => {
        expect(screen.getByText('Confirm Purchase')).toBeTruthy();
        expect(screen.getByText('Advanced React Native Course')).toBeTruthy();
        expect(screen.getByText(/Platform Points/i)).toBeTruthy();
      });
    });

    it('should show escrow explanation', async () => {
      render(<CheckoutFlow listing={mockListing} onComplete={jest.fn()} />);

      fireEvent.press(screen.getByText('Continue to Payment'));
      await waitFor(() => fireEvent.press(screen.getByText('Continue to Confirm')));

      await waitFor(() => {
        expect(screen.getByText(/Buyer Protection/i)).toBeTruthy();
        expect(screen.getByText(/7-day escrow period/i)).toBeTruthy();
      });
    });

    it('should show Complete Purchase button', async () => {
      render(<CheckoutFlow listing={mockListing} onComplete={jest.fn()} />);

      fireEvent.press(screen.getByText('Continue to Payment'));
      await waitFor(() => fireEvent.press(screen.getByText('Continue to Confirm')));

      await waitFor(() => {
        expect(screen.getByText('Complete Purchase')).toBeTruthy();
      });
    });

    it('should call onComplete when purchase confirmed', async () => {
      const onComplete = jest.fn();
      render(<CheckoutFlow listing={mockListing} onComplete={onComplete} />);

      fireEvent.press(screen.getByText('Continue to Payment'));
      await waitFor(() => fireEvent.press(screen.getByText('Continue to Confirm')));
      await waitFor(() => fireEvent.press(screen.getByText('Complete Purchase')));

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalledWith({
          listingId: 'listing-123',
          paymentMethodId: 'pm-1',
          total: expect.any(Number),
        });
      });
    });
  });

  describe('Step 4: Processing', () => {
    it('should show processing state after purchase', async () => {
      render(<CheckoutFlow listing={mockListing} onComplete={jest.fn()} />);

      fireEvent.press(screen.getByText('Continue to Payment'));
      await waitFor(() => fireEvent.press(screen.getByText('Continue to Confirm')));

      const completeButton = await screen.findByText('Complete Purchase');
      fireEvent.press(completeButton);

      // Check processing state immediately after button press
      expect(screen.getByText(/Processing/i)).toBeTruthy();
      expect(screen.getByTestId('loading-spinner')).toBeTruthy();
    });

    it('should show success message after processing', async () => {
      render(<CheckoutFlow listing={mockListing} onComplete={jest.fn()} />);

      fireEvent.press(screen.getByText('Continue to Payment'));
      await waitFor(() => fireEvent.press(screen.getByText('Continue to Confirm')));
      await waitFor(() => fireEvent.press(screen.getByText('Complete Purchase')));

      await waitFor(
        () => {
          expect(screen.getByText(/Purchase Successful/i)).toBeTruthy();
          expect(screen.getByText(/Transaction Complete/i)).toBeTruthy();
        },
        { timeout: 3000 }
      );
    });
  });

  describe('Navigation', () => {
    it('should show Back button on all steps except review', async () => {
      render(<CheckoutFlow listing={mockListing} onComplete={jest.fn()} />);

      // Review step - no back button
      expect(screen.queryByText('Back')).toBeFalsy();

      // Payment step - has back button
      fireEvent.press(screen.getByText('Continue to Payment'));
      await waitFor(() => {
        expect(screen.getByText('Back')).toBeTruthy();
      });
    });

    it('should navigate back to previous step', async () => {
      render(<CheckoutFlow listing={mockListing} onComplete={jest.fn()} />);

      fireEvent.press(screen.getByText('Continue to Payment'));
      await waitFor(() => fireEvent.press(screen.getByText('Back')));

      await waitFor(() => {
        expect(screen.getByText('Review Purchase')).toBeTruthy();
      });
    });

    it('should show progress indicator', () => {
      render(<CheckoutFlow listing={mockListing} onComplete={jest.fn()} />);

      expect(screen.getByText('Step 1 of 3')).toBeTruthy();
    });

    it('should update progress as user advances', async () => {
      render(<CheckoutFlow listing={mockListing} onComplete={jest.fn()} />);

      fireEvent.press(screen.getByText('Continue to Payment'));

      await waitFor(() => {
        expect(screen.getByText('Step 2 of 3')).toBeTruthy();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error when payment processing fails', async () => {
      const onComplete = jest.fn().mockRejectedValue(new Error('Payment failed'));
      render(<CheckoutFlow listing={mockListing} onComplete={onComplete} />);

      fireEvent.press(screen.getByText('Continue to Payment'));
      await waitFor(() => fireEvent.press(screen.getByText('Continue to Confirm')));
      await waitFor(() => fireEvent.press(screen.getByText('Complete Purchase')));

      await waitFor(() => {
        expect(screen.getByText(/Payment failed/i)).toBeTruthy();
        expect(screen.getByText('Try Again')).toBeTruthy();
      });
    });

    it('should allow retrying after error', async () => {
      const onComplete = jest
        .fn()
        .mockRejectedValueOnce(new Error('Payment failed'))
        .mockResolvedValueOnce({ success: true });

      render(<CheckoutFlow listing={mockListing} onComplete={onComplete} />);

      fireEvent.press(screen.getByText('Continue to Payment'));
      await waitFor(() => fireEvent.press(screen.getByText('Continue to Confirm')));
      await waitFor(() => fireEvent.press(screen.getByText('Complete Purchase')));

      await waitFor(() => {
        fireEvent.press(screen.getByText('Try Again'));
      });

      await waitFor(() => {
        expect(screen.getByText(/Purchase Successful/i)).toBeTruthy();
      });
    });

    it('should validate sufficient points before allowing purchase', async () => {
      const insufficientPoints: PaymentMethod[] = [
        { id: 'pm-1', type: 'points', label: 'Platform Points (50 available)', isDefault: true },
      ];

      render(
        <CheckoutFlow
          listing={mockListing}
          paymentMethods={insufficientPoints}
          onComplete={jest.fn()}
        />
      );

      fireEvent.press(screen.getByText('Continue to Payment'));

      await waitFor(() => {
        expect(screen.getByText(/Insufficient points/i)).toBeTruthy();
        expect(screen.getByText('Continue to Confirm')).toBeDisabled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels for steps', () => {
      render(<CheckoutFlow listing={mockListing} onComplete={jest.fn()} />);

      expect(screen.getByLabelText('Step 1 of 3: Review Purchase')).toBeTruthy();
    });

    it('should announce step changes', async () => {
      render(<CheckoutFlow listing={mockListing} onComplete={jest.fn()} />);

      fireEvent.press(screen.getByText('Continue to Payment'));

      await waitFor(() => {
        expect(screen.getByLabelText('Step 2 of 3: Select Payment Method')).toBeTruthy();
      });
    });

    it('should have accessible payment method selection', async () => {
      render(
        <CheckoutFlow
          listing={mockListing}
          paymentMethods={mockPaymentMethods}
          onComplete={jest.fn()}
        />
      );

      fireEvent.press(screen.getByText('Continue to Payment'));

      await waitFor(() => {
        const pointsMethod = screen.getByTestId('payment-method-pm-1');
        expect(pointsMethod.props.accessibilityRole).toBe('radio');
        expect(pointsMethod.props.accessibilityState.selected).toBe(true);
      });
    });
  });
});
