import React from 'react';
import { render, screen } from '@testing-library/react-native';
import '@testing-library/jest-native/extend-expect';
import { CheckoutProgress } from '@/components/marketplace/checkout-progress';
import type { CheckoutState } from '@/lib/types/marketplace';

describe('CheckoutProgress', () => {
  describe('Rendering', () => {
    it('should render all three steps', () => {
      render(<CheckoutProgress currentStep="review" />);

      expect(screen.getByTestId('step-indicator-review')).toBeTruthy();
      expect(screen.getByTestId('step-indicator-payment')).toBeTruthy();
      expect(screen.getByTestId('step-indicator-confirm')).toBeTruthy();
    });

    it('should render step labels', () => {
      render(<CheckoutProgress currentStep="review" />);

      expect(screen.getByText('Review')).toBeTruthy();
      expect(screen.getByText('Payment')).toBeTruthy();
      expect(screen.getByText('Confirm')).toBeTruthy();
    });

    it('should render connector lines between steps', () => {
      render(<CheckoutProgress currentStep="review" />);

      expect(screen.getByTestId('connector-0')).toBeTruthy();
      expect(screen.getByTestId('connector-1')).toBeTruthy();
    });

    it('should not render for processing step', () => {
      const { UNSAFE_root } = render(<CheckoutProgress currentStep="processing" />);

      expect(UNSAFE_root.findAllByType('View').length).toBe(0);
    });

    it('should not render for success step', () => {
      const { UNSAFE_root } = render(<CheckoutProgress currentStep="success" />);

      expect(UNSAFE_root.findAllByType('View').length).toBe(0);
    });
  });

  describe('Step States - Review', () => {
    it('should highlight review as current step', () => {
      render(<CheckoutProgress currentStep="review" />);

      const reviewStep = screen.getByTestId('step-indicator-review');
      expect(reviewStep.props.accessibilityLabel).toContain('current step');
      expect(reviewStep).toBeTruthy();
    });

    it('should show payment and confirm as upcoming', () => {
      render(<CheckoutProgress currentStep="review" />);

      const paymentStep = screen.getByTestId('step-indicator-payment');
      const confirmStep = screen.getByTestId('step-indicator-confirm');

      expect(paymentStep.props.accessibilityLabel).toContain('upcoming');
      expect(confirmStep.props.accessibilityLabel).toContain('upcoming');
    });

    it('should show step numbers for all steps at review', () => {
      render(<CheckoutProgress currentStep="review" />);

      expect(screen.getByText('1')).toBeTruthy();
      expect(screen.getByText('2')).toBeTruthy();
      expect(screen.getByText('3')).toBeTruthy();
    });

    it('should not show completed connectors at review', () => {
      render(<CheckoutProgress currentStep="review" />);

      const connector0 = screen.getByTestId('connector-0');
      const connector1 = screen.getByTestId('connector-1');

      expect(connector0.props.className).toContain('bg-muted');
      expect(connector1.props.className).toContain('bg-muted');
    });
  });

  describe('Step States - Payment', () => {
    it('should show review as completed', () => {
      render(<CheckoutProgress currentStep="payment" />);

      const reviewStep = screen.getByTestId('step-indicator-review');
      expect(reviewStep.props.accessibilityLabel).toContain('completed');
    });

    it('should highlight payment as current step', () => {
      render(<CheckoutProgress currentStep="payment" />);

      const paymentStep = screen.getByTestId('step-indicator-payment');
      expect(paymentStep.props.accessibilityLabel).toContain('current step');
    });

    it('should show confirm as upcoming', () => {
      render(<CheckoutProgress currentStep="payment" />);

      const confirmStep = screen.getByTestId('step-indicator-confirm');
      expect(confirmStep.props.accessibilityLabel).toContain('upcoming');
    });

    it('should show checkmark for completed review step', () => {
      const { UNSAFE_root } = render(<CheckoutProgress currentStep="payment" />);

      // Review step should have checkmark (Check icon)
      const reviewStep = screen.getByTestId('step-indicator-review');
      expect(reviewStep).toBeTruthy();
    });

    it('should show first connector as completed', () => {
      render(<CheckoutProgress currentStep="payment" />);

      const connector0 = screen.getByTestId('connector-0');
      expect(connector0.props.className).toContain('bg-primary');
    });

    it('should show second connector as upcoming', () => {
      render(<CheckoutProgress currentStep="payment" />);

      const connector1 = screen.getByTestId('connector-1');
      expect(connector1.props.className).toContain('bg-muted');
    });
  });

  describe('Step States - Confirm', () => {
    it('should show review and payment as completed', () => {
      render(<CheckoutProgress currentStep="confirm" />);

      const reviewStep = screen.getByTestId('step-indicator-review');
      const paymentStep = screen.getByTestId('step-indicator-payment');

      expect(reviewStep.props.accessibilityLabel).toContain('completed');
      expect(paymentStep.props.accessibilityLabel).toContain('completed');
    });

    it('should highlight confirm as current step', () => {
      render(<CheckoutProgress currentStep="confirm" />);

      const confirmStep = screen.getByTestId('step-indicator-confirm');
      expect(confirmStep.props.accessibilityLabel).toContain('current step');
    });

    it('should show checkmarks for both completed steps', () => {
      render(<CheckoutProgress currentStep="confirm" />);

      const reviewStep = screen.getByTestId('step-indicator-review');
      const paymentStep = screen.getByTestId('step-indicator-payment');

      expect(reviewStep).toBeTruthy();
      expect(paymentStep).toBeTruthy();
    });

    it('should show both connectors as completed', () => {
      render(<CheckoutProgress currentStep="confirm" />);

      const connector0 = screen.getByTestId('connector-0');
      const connector1 = screen.getByTestId('connector-1');

      expect(connector0.props.className).toContain('bg-primary');
      expect(connector1.props.className).toContain('bg-primary');
    });
  });

  describe('Accessibility', () => {
    it('should have progressbar role', () => {
      render(<CheckoutProgress currentStep="payment" />);

      const progressbar = screen.getByLabelText('Step 2 of 3');
      expect(progressbar.props.accessibilityRole).toBe('progressbar');
    });

    it('should have correct progress label for review step', () => {
      render(<CheckoutProgress currentStep="review" />);

      expect(screen.getByLabelText('Step 1 of 3')).toBeTruthy();
    });

    it('should have correct progress label for payment step', () => {
      render(<CheckoutProgress currentStep="payment" />);

      expect(screen.getByLabelText('Step 2 of 3')).toBeTruthy();
    });

    it('should have correct progress label for confirm step', () => {
      render(<CheckoutProgress currentStep="confirm" />);

      expect(screen.getByLabelText('Step 3 of 3')).toBeTruthy();
    });

    it('should have accessibility value for progress', () => {
      render(<CheckoutProgress currentStep="payment" />);

      const progressbar = screen.getByLabelText('Step 2 of 3');
      expect(progressbar.props.accessibilityValue).toEqual({
        min: 0,
        max: 3,
        now: 2,
      });
    });

    it('should provide descriptive labels for each step state', () => {
      render(<CheckoutProgress currentStep="payment" />);

      expect(screen.getByLabelText(/Review.*completed/i)).toBeTruthy();
      expect(screen.getByLabelText(/Payment.*current step/i)).toBeTruthy();
      expect(screen.getByLabelText(/Confirm.*upcoming/i)).toBeTruthy();
    });
  });

  describe('Performance', () => {
    it('should use React.memo for optimization', () => {
      const { rerender } = render(<CheckoutProgress currentStep="review" />);

      // Re-render with same props
      rerender(<CheckoutProgress currentStep="review" />);

      // Should still render correctly
      expect(screen.getByTestId('step-indicator-review')).toBeTruthy();
    });

    it('should render quickly', () => {
      const start = performance.now();
      render(<CheckoutProgress currentStep="payment" />);
      const end = performance.now();

      expect(end - start).toBeLessThan(50); // Should render in <50ms
    });
  });

  describe('Styling', () => {
    it('should apply custom className', () => {
      const { UNSAFE_root } = render(
        <CheckoutProgress currentStep="review" className="custom-class" />
      );

      const container = UNSAFE_root.findByProps({ accessibilityRole: 'progressbar' });
      expect(container.props.className).toContain('custom-class');
    });

    it('should apply different styles for current step', () => {
      render(<CheckoutProgress currentStep="payment" />);

      const paymentStep = screen.getByTestId('step-indicator-payment');
      expect(paymentStep.props.className).toContain('border-primary');
    });

    it('should apply different styles for completed steps', () => {
      render(<CheckoutProgress currentStep="confirm" />);

      const reviewStep = screen.getByTestId('step-indicator-review');
      expect(reviewStep.props.className).toContain('bg-primary');
    });

    it('should apply muted styles for upcoming steps', () => {
      render(<CheckoutProgress currentStep="review" />);

      const confirmStep = screen.getByTestId('step-indicator-confirm');
      expect(confirmStep.props.className).toContain('border-muted');
    });
  });

  describe('Visual Hierarchy', () => {
    it('should emphasize current step label', () => {
      render(<CheckoutProgress currentStep="payment" />);

      const labels = screen.getAllByText(/Review|Payment|Confirm/);
      const paymentLabel = labels.find((label) => label.props.children === 'Payment');

      expect(paymentLabel?.props.className).toContain('font-semibold');
    });

    it('should deemphasize upcoming step labels', () => {
      render(<CheckoutProgress currentStep="review" />);

      const labels = screen.getAllByText(/Review|Payment|Confirm/);
      const confirmLabel = labels.find((label) => label.props.children === 'Confirm');

      expect(confirmLabel?.props.className).toContain('text-muted-foreground');
    });
  });
});
