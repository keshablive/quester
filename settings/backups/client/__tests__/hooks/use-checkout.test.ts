import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useCheckout } from '@/hooks/use-checkout';
import type { CheckoutState, PaymentMethod } from '@/lib/types/marketplace';

// Mock API client
jest.mock('@/lib/api-client', () => ({
  apiClient: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

import { apiClient } from '@/lib/api-client';

const mockListing = {
  id: 'listing-123',
  title: 'Advanced React Native Course',
  price: 99.99,
  seller: {
    id: 'seller-1',
    username: 'johndoe',
  },
};

const mockPaymentMethods: PaymentMethod[] = [
  { id: 'pm-1', type: 'points', label: 'Platform Points', isDefault: true },
  { id: 'pm-2', type: 'wallet', label: 'Wallet Balance', isDefault: false },
];

describe('useCheckout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with review step', () => {
      const { result } = renderHook(() => useCheckout(mockListing));

      expect(result.current.state.step).toBe('review');
      expect(result.current.state.listing).toEqual(mockListing);
    });

    it('should calculate initial total with platform fee', () => {
      const { result } = renderHook(() => useCheckout(mockListing));

      // Base price: 99.99, Platform fee 5%: 5.00, Total: 104.99
      expect(result.current.state.total).toBeCloseTo(104.99, 2);
      expect(result.current.state.platformFee).toBeCloseTo(5.00, 2);
    });

    it('should set default escrow period', () => {
      const { result } = renderHook(() => useCheckout(mockListing));

      expect(result.current.state.escrowPeriod).toBe(7); // 7 days default
    });

    it('should not have payment method initially', () => {
      const { result } = renderHook(() => useCheckout(mockListing));

      expect(result.current.state.paymentMethod).toBeUndefined();
    });
  });

  describe('Step Navigation', () => {
    it('should advance from review to payment', async () => {
      const { result } = renderHook(() => useCheckout(mockListing));

      await act(async () => {
        await result.current.nextStep();
      });

      expect(result.current.state.step).toBe('payment');
    });

    it('should advance from payment to confirm', async () => {
      const { result } = renderHook(() => useCheckout(mockListing));

      await act(async () => {
        await result.current.nextStep(); // to payment
        result.current.selectPaymentMethod(mockPaymentMethods[0]);
        await result.current.nextStep(); // to confirm
      });

      expect(result.current.state.step).toBe('confirm');
    });

    it('should go back to previous step', async () => {
      const { result } = renderHook(() => useCheckout(mockListing));

      await act(async () => {
        await result.current.nextStep(); // to payment
        await result.current.previousStep(); // back to review
      });

      expect(result.current.state.step).toBe('review');
    });

    it('should not go back from review step', async () => {
      const { result } = renderHook(() => useCheckout(mockListing));

      await act(async () => {
        await result.current.previousStep();
      });

      expect(result.current.state.step).toBe('review');
    });

    it('should not advance from payment without payment method', async () => {
      const { result } = renderHook(() => useCheckout(mockListing));

      await act(async () => {
        await result.current.nextStep(); // to payment
        await result.current.nextStep(); // try to advance
      });

      expect(result.current.state.step).toBe('payment');
      expect(result.current.state.error).toContain('payment method');
    });
  });

  describe('Payment Method Selection', () => {
    it('should select payment method', () => {
      const { result } = renderHook(() => useCheckout(mockListing));

      act(() => {
        result.current.selectPaymentMethod(mockPaymentMethods[0]);
      });

      expect(result.current.state.paymentMethod).toEqual(mockPaymentMethods[0]);
    });

    it('should allow changing payment method', () => {
      const { result } = renderHook(() => useCheckout(mockListing));

      act(() => {
        result.current.selectPaymentMethod(mockPaymentMethods[0]);
        result.current.selectPaymentMethod(mockPaymentMethods[1]);
      });

      expect(result.current.state.paymentMethod).toEqual(mockPaymentMethods[1]);
    });

    it('should validate sufficient points for points payment', () => {
      const insufficientPoints: PaymentMethod = {
        id: 'pm-1',
        type: 'points',
        label: 'Points (50 available)',
        isDefault: true,
      };

      const { result } = renderHook(() => useCheckout(mockListing));

      act(() => {
        result.current.selectPaymentMethod(insufficientPoints);
      });

      expect(result.current.canProceed()).toBe(false);
      expect(result.current.state.error).toContain('Insufficient points');
    });
  });

  describe('Purchase Processing', () => {
    it('should complete purchase successfully', async () => {
      (apiClient.post as jest.Mock).mockResolvedValue({
        success: true,
        transactionId: 'txn-123',
      });

      const { result } = renderHook(() => useCheckout(mockListing));

      await act(async () => {
        await result.current.nextStep(); // to payment
        result.current.selectPaymentMethod(mockPaymentMethods[0]);
        await result.current.nextStep(); // to confirm
      });

      // Start purchase but don't await immediately to check processing state
      act(() => {
        result.current.completePurchase();
      });

      // Should be in processing state immediately after starting
      await waitFor(() => {
        expect(result.current.state.step).toBe('processing');
      });

      // Then should transition to success
      await waitFor(() => {
        expect(result.current.state.step).toBe('success');
      });

      expect(apiClient.post).toHaveBeenCalledWith('/marketplace/purchase', {
        listingId: 'listing-123',
        paymentMethodId: 'pm-1',
        total: expect.any(Number),
        escrowPeriod: 7,
      });
    });

    it('should handle purchase failure', async () => {
      (apiClient.post as jest.Mock).mockRejectedValue(new Error('Payment failed'));

      const { result } = renderHook(() => useCheckout(mockListing));

      await act(async () => {
        await result.current.nextStep();
        result.current.selectPaymentMethod(mockPaymentMethods[0]);
        await result.current.nextStep();
        await result.current.completePurchase();
      });

      await waitFor(() => {
        expect(result.current.state.error).toBe('Payment failed');
      });

      expect(result.current.state.step).toBe('confirm'); // Stay on confirm step
    });

    it('should show processing state during purchase', async () => {
      (apiClient.post as jest.Mock).mockImplementation(() => {
        return new Promise((resolve) => setTimeout(() => resolve({ success: true }), 1000));
      });

      const { result } = renderHook(() => useCheckout(mockListing));

      await act(async () => {
        await result.current.nextStep();
        result.current.selectPaymentMethod(mockPaymentMethods[0]);
        await result.current.nextStep();
        result.current.completePurchase();
      });

      await waitFor(() => {
        expect(result.current.state.step).toBe('processing');
      });
    });

    it('should allow retrying after failure', async () => {
      (apiClient.post as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ success: true });

      const { result } = renderHook(() => useCheckout(mockListing));

      await act(async () => {
        await result.current.nextStep();
        result.current.selectPaymentMethod(mockPaymentMethods[0]);
        await result.current.nextStep();
        await result.current.completePurchase();
      });

      await waitFor(() => {
        expect(result.current.state.error).toBe('Network error');
      });

      // Retry
      await act(async () => {
        await result.current.completePurchase();
      });

      await waitFor(() => {
        expect(result.current.state.step).toBe('success');
      });
    });
  });

  describe('Progress Tracking', () => {
    it('should provide current step number', () => {
      const { result } = renderHook(() => useCheckout(mockListing));

      expect(result.current.currentStep).toBe(1);
    });

    it('should provide total steps count', () => {
      const { result } = renderHook(() => useCheckout(mockListing));

      expect(result.current.totalSteps).toBe(3);
    });

    it('should update step number as user advances', async () => {
      const { result } = renderHook(() => useCheckout(mockListing));

      await act(async () => {
        await result.current.nextStep();
      });

      expect(result.current.currentStep).toBe(2);

      await act(async () => {
        result.current.selectPaymentMethod(mockPaymentMethods[0]);
        await result.current.nextStep();
      });

      expect(result.current.currentStep).toBe(3);
    });

    it('should calculate progress percentage', () => {
      const { result } = renderHook(() => useCheckout(mockListing));

      expect(result.current.progress).toBeCloseTo(0.33, 2); // Step 1/3 = 33%
    });
  });

  describe('Validation', () => {
    it('should validate canProceed on review step', () => {
      const { result } = renderHook(() => useCheckout(mockListing));

      expect(result.current.canProceed()).toBe(true);
    });

    it('should validate canProceed on payment step with method', () => {
      const { result } = renderHook(() => useCheckout(mockListing));

      act(() => {
        result.current.selectPaymentMethod(mockPaymentMethods[0]);
      });

      expect(result.current.canProceed()).toBe(true);
    });

    it('should validate canProceed on payment step without method', async () => {
      const { result } = renderHook(() => useCheckout(mockListing));

      await act(async () => {
        await result.current.nextStep(); // to payment
      });

      expect(result.current.canProceed()).toBe(false);
    });

    it('should validate listing price is positive', () => {
      const invalidListing = { ...mockListing, price: -10 };

      const { result } = renderHook(() => useCheckout(invalidListing));

      expect(result.current.state.error).toContain('Invalid price');
    });

    it('should validate listing has required fields', () => {
      const invalidListing = { ...mockListing, seller: undefined };

      const { result } = renderHook(() => useCheckout(invalidListing as any));

      expect(result.current.state.error).toContain('Invalid listing');
    });
  });

  describe('Pricing Calculations', () => {
    it('should calculate platform fee as 5% of base price', () => {
      const { result } = renderHook(() => useCheckout(mockListing));

      const expectedFee = mockListing.price * 0.05;
      expect(result.current.state.platformFee).toBeCloseTo(expectedFee, 2);
    });

    it('should calculate total as base + fee', () => {
      const { result } = renderHook(() => useCheckout(mockListing));

      const expectedTotal = mockListing.price + result.current.state.platformFee;
      expect(result.current.state.total).toBeCloseTo(expectedTotal, 2);
    });

    it('should provide pricing breakdown', () => {
      const { result } = renderHook(() => useCheckout(mockListing));

      const breakdown = result.current.getPricingBreakdown();

      expect(breakdown.basePrice).toBe(99.99);
      expect(breakdown.platformFee).toBeCloseTo(5.00, 2);
      expect(breakdown.platformFeePercent).toBe(5);
      expect(breakdown.total).toBeCloseTo(104.99, 2);
      expect(breakdown.escrowPeriod).toBe(7);
      expect(breakdown.currency).toBe('USD');
    });

    it('should handle different price values', () => {
      const expensiveListing = { ...mockListing, price: 499.99 };
      const { result } = renderHook(() => useCheckout(expensiveListing));

      expect(result.current.state.platformFee).toBeCloseTo(25.00, 2);
      expect(result.current.state.total).toBeCloseTo(524.99, 2);
    });
  });

  describe('Reset Functionality', () => {
    it('should reset to initial state', async () => {
      const { result } = renderHook(() => useCheckout(mockListing));

      await act(async () => {
        await result.current.nextStep();
        result.current.selectPaymentMethod(mockPaymentMethods[0]);
        await result.current.nextStep();
        result.current.reset();
      });

      expect(result.current.state.step).toBe('review');
      expect(result.current.state.paymentMethod).toBeUndefined();
      expect(result.current.state.error).toBeUndefined();
    });

    it('should preserve listing data on reset', async () => {
      const { result } = renderHook(() => useCheckout(mockListing));

      await act(async () => {
        await result.current.nextStep();
        result.current.reset();
      });

      expect(result.current.state.listing).toEqual(mockListing);
    });
  });

  describe('Error Handling', () => {
    it('should clear errors when advancing steps', async () => {
      const { result } = renderHook(() => useCheckout(mockListing));

      act(() => {
        result.current.selectPaymentMethod({
          id: 'pm-1',
          type: 'points',
          label: 'Points (50 available)',
          isDefault: true,
        });
      });

      expect(result.current.state.error).toBeTruthy();

      await act(async () => {
        result.current.selectPaymentMethod(mockPaymentMethods[0]);
      });

      expect(result.current.state.error).toBeUndefined();
    });

    it('should handle network errors gracefully', async () => {
      (apiClient.post as jest.Mock).mockRejectedValue(new Error('Network request failed'));

      const { result } = renderHook(() => useCheckout(mockListing));

      await act(async () => {
        await result.current.nextStep();
        result.current.selectPaymentMethod(mockPaymentMethods[0]);
        await result.current.nextStep();
        await result.current.completePurchase();
      });

      await waitFor(() => {
        expect(result.current.state.error).toContain('Network');
      });
    });

    it('should handle API validation errors', async () => {
      (apiClient.post as jest.Mock).mockRejectedValue({
        response: { data: { error: 'Item no longer available' } },
      });

      const { result } = renderHook(() => useCheckout(mockListing));

      await act(async () => {
        await result.current.nextStep();
        result.current.selectPaymentMethod(mockPaymentMethods[0]);
        await result.current.nextStep();
        await result.current.completePurchase();
      });

      await waitFor(() => {
        expect(result.current.state.error).toContain('Item no longer available');
      });
    });
  });

  describe('Success Callback', () => {
    it('should call onSuccess callback after successful purchase', async () => {
      (apiClient.post as jest.Mock).mockResolvedValue({
        success: true,
        transactionId: 'txn-123',
      });

      const onSuccess = jest.fn();
      const { result } = renderHook(() => useCheckout(mockListing, { onSuccess }));

      await act(async () => {
        await result.current.nextStep();
        result.current.selectPaymentMethod(mockPaymentMethods[0]);
        await result.current.nextStep();
        await result.current.completePurchase();
      });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith({
          transactionId: 'txn-123',
          listingId: 'listing-123',
          total: expect.any(Number),
        });
      });
    });

    it('should call onError callback after failed purchase', async () => {
      (apiClient.post as jest.Mock).mockRejectedValue(new Error('Payment declined'));

      const onError = jest.fn();
      const { result } = renderHook(() => useCheckout(mockListing, { onError }));

      await act(async () => {
        await result.current.nextStep();
        result.current.selectPaymentMethod(mockPaymentMethods[0]);
        await result.current.nextStep();
        await result.current.completePurchase();
      });

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(expect.any(Error));
      });
    });
  });
});
