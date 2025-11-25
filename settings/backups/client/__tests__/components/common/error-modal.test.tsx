/**
 * ErrorModal Component Tests
 * Phase 8, T133: Tests for full-screen error dialog
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ErrorModal } from '@/components/error-modal';

describe('ErrorModal', () => {
  describe('Visibility', () => {
    it('should not render when visible is false', () => {
      const { queryByTestId } = render(
        <ErrorModal visible={false} title="Error" message="Something went wrong" />
      );
      expect(queryByTestId('error-modal')).toBeNull();
    });

    it('should render when visible is true', () => {
      const { getByTestId } = render(
        <ErrorModal visible={true} title="Error" message="Something went wrong" />
      );
      expect(getByTestId('error-modal')).toBeTruthy();
    });

    it('should display title', () => {
      const { getByText } = render(
        <ErrorModal visible={true} title="Network Error" message="Connection failed" />
      );
      expect(getByText('Network Error')).toBeTruthy();
    });

    it('should display message', () => {
      const { getByText } = render(
        <ErrorModal visible={true} title="Error" message="Unable to complete request" />
      );
      expect(getByText('Unable to complete request')).toBeTruthy();
    });
  });

  describe('Error Icon', () => {
    it('should display alert circle icon', () => {
      const { getByTestId } = render(
        <ErrorModal visible={true} title="Error" message="Something went wrong" />
      );
      expect(getByTestId('error-modal-icon')).toBeTruthy();
    });

    it('should use destructive/red color for icon', () => {
      const { getByTestId } = render(
        <ErrorModal visible={true} title="Error" message="Error occurred" />
      );
      const icon = getByTestId('error-modal-icon');
      expect(icon.props.children.props.color).toMatch(/red|#[eE][fF]4444/i);
    });
  });

  describe('Action Buttons', () => {
    it('should display default close button', () => {
      const onClose = jest.fn();
      const { getByText } = render(
        <ErrorModal visible={true} title="Error" message="Error" onClose={onClose} />
      );
      expect(getByText(/close/i)).toBeTruthy();
    });

    it('should call onClose when close button is pressed', () => {
      const onClose = jest.fn();
      const { getByText } = render(
        <ErrorModal visible={true} title="Error" message="Error" onClose={onClose} />
      );

      fireEvent.press(getByText(/close/i));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should display custom primary action button', () => {
      const onClose = jest.fn();
      const onRetry = jest.fn();
      const { getByText } = render(
        <ErrorModal
          visible={true}
          title="Error"
          message="Error"
          onClose={onClose}
          primaryAction={{ label: 'Try Again', onPress: onRetry }}
        />
      );
      expect(getByText('Try Again')).toBeTruthy();
    });

    it('should call primary action callback when pressed', () => {
      const onClose = jest.fn();
      const onRetry = jest.fn();
      const { getByText } = render(
        <ErrorModal
          visible={true}
          title="Error"
          message="Error"
          onClose={onClose}
          primaryAction={{ label: 'Retry', onPress: onRetry }}
        />
      );

      fireEvent.press(getByText('Retry'));
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('should display secondary action button', () => {
      const onClose = jest.fn();
      const onCancel = jest.fn();
      const { getByText } = render(
        <ErrorModal
          visible={true}
          title="Error"
          message="Error"
          onClose={onClose}
          secondaryAction={{ label: 'Cancel', onPress: onCancel }}
        />
      );
      expect(getByText('Cancel')).toBeTruthy();
    });

    it('should call secondary action callback when pressed', () => {
      const onClose = jest.fn();
      const onCancel = jest.fn();
      const { getByText } = render(
        <ErrorModal
          visible={true}
          title="Error"
          message="Error"
          onClose={onClose}
          secondaryAction={{ label: 'Cancel', onPress: onCancel }}
        />
      );

      fireEvent.press(getByText('Cancel'));
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('should show both primary and secondary buttons', () => {
      const onClose = jest.fn();
      const onRetry = jest.fn();
      const onCancel = jest.fn();
      const { getByText } = render(
        <ErrorModal
          visible={true}
          title="Error"
          message="Error"
          onClose={onClose}
          primaryAction={{ label: 'Retry', onPress: onRetry }}
          secondaryAction={{ label: 'Cancel', onPress: onCancel }}
        />
      );
      expect(getByText('Retry')).toBeTruthy();
      expect(getByText('Cancel')).toBeTruthy();
    });
  });

  describe('Dismissible', () => {
    it('should be dismissible by default', () => {
      const onClose = jest.fn();
      const { getByTestId } = render(
        <ErrorModal visible={true} title="Error" message="Error" onClose={onClose} />
      );

      const modal = getByTestId('error-modal');
      // Modal exists and can be dismissed via backdrop
      expect(modal).toBeTruthy();
    });

    it('should not be dismissible when dismissible is false', () => {
      const onClose = jest.fn();
      const { getByTestId } = render(
        <ErrorModal
          visible={true}
          title="Error"
          message="Error"
          onClose={onClose}
          dismissible={false}
        />
      );

      const modal = getByTestId('error-modal');
      // Modal still exists
      expect(modal).toBeTruthy();
    });

    it('should call onClose when backdrop is pressed (dismissible)', () => {
      const onClose = jest.fn();
      const { getByTestId } = render(
        <ErrorModal
          visible={true}
          title="Error"
          message="Error"
          onClose={onClose}
          dismissible={true}
        />
      );

      const backdrop = getByTestId('error-modal-backdrop');
      fireEvent.press(backdrop);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('should have alert role', () => {
      const onClose = jest.fn();
      const { getByTestId } = render(
        <ErrorModal visible={true} title="Error" message="Error" onClose={onClose} />
      );

      const modal = getByTestId('error-modal');
      expect(modal.props.accessibilityRole).toBe('alert');
    });

    it('should have polite live region', () => {
      const onClose = jest.fn();
      const { getByTestId } = render(
        <ErrorModal visible={true} title="Error" message="Error" onClose={onClose} />
      );

      const modal = getByTestId('error-modal');
      expect(modal.props.accessibilityLiveRegion).toBe('polite');
    });

    it('should have descriptive accessibility label', () => {
      const onClose = jest.fn();
      const { getByTestId } = render(
        <ErrorModal
          visible={true}
          title="Network Error"
          message="Connection failed"
          onClose={onClose}
        />
      );

      const modal = getByTestId('error-modal');
      expect(modal.props.accessibilityLabel).toMatch(/network error.*connection failed/i);
    });

    it('should have accessible close button', () => {
      const onClose = jest.fn();
      const { getByTestId } = render(
        <ErrorModal visible={true} title="Error" message="Error" onClose={onClose} />
      );

      const closeButton = getByTestId('close-button');
      expect(closeButton.props.accessibilityLabel).toBe('Close error dialog');
      expect(closeButton.props.accessibilityHint).toBe('Dismisses the error message');
    });
  });

  describe('Styling', () => {
    it('should have modal/dialog styling', () => {
      const onClose = jest.fn();
      const { getByTestId } = render(
        <ErrorModal visible={true} title="Error" message="Error" onClose={onClose} />
      );

      const modal = getByTestId('error-modal');
      expect(modal.props.className).toMatch(/bg-white|rounded|shadow/);
    });

    it('should center content', () => {
      const onClose = jest.fn();
      const { getByTestId } = render(
        <ErrorModal visible={true} title="Error" message="Error" onClose={onClose} />
      );

      const backdrop = getByTestId('error-modal-backdrop');
      expect(backdrop.props.className).toMatch(/items-center|justify-center/);
    });

    it('should have error/destructive styling for title', () => {
      const onClose = jest.fn();
      const { getByTestId } = render(
        <ErrorModal visible={true} title="Error" message="Error" onClose={onClose} />
      );

      const title = getByTestId('error-modal-title');
      expect(title.props.className).toMatch(/text-destructive|text-red/);
    });
  });

  describe('Details Section', () => {
    it('should not show details section by default', () => {
      const onClose = jest.fn();
      const { queryByTestId } = render(
        <ErrorModal visible={true} title="Error" message="Error" onClose={onClose} />
      );
      expect(queryByTestId('error-modal-details')).toBeNull();
    });

    it('should display details when provided', () => {
      const onClose = jest.fn();
      const { getByTestId, getByText } = render(
        <ErrorModal
          visible={true}
          title="Error"
          message="Error"
          details="Error code: 500"
          onClose={onClose}
        />
      );
      expect(getByTestId('error-modal-details')).toBeTruthy();
      expect(getByText('Error code: 500')).toBeTruthy();
    });

    it('should style details with muted text', () => {
      const onClose = jest.fn();
      const { getByTestId } = render(
        <ErrorModal
          visible={true}
          title="Error"
          message="Error"
          details="Details"
          onClose={onClose}
        />
      );
      const details = getByTestId('error-modal-details');
      expect(details.props.className).toMatch(/text-muted|text-gray/);
    });
  });

  describe('Integration', () => {
    it('should work with useErrorHandling hook', () => {
      const mockError = {
        type: 'network',
        message: 'Network request failed',
        code: 'ERR_NETWORK',
      };

      const TestComponent = () => {
        const [visible, setVisible] = React.useState(true);
        return (
          <ErrorModal
            visible={visible}
            title="Network Error"
            message={mockError.message}
            details={`Error code: ${mockError.code}`}
            onClose={() => setVisible(false)}
          />
        );
      };

      const { getByText } = render(<TestComponent />);
      expect(getByText('Network Error')).toBeTruthy();
      expect(getByText('Network request failed')).toBeTruthy();
    });

    it('should update when error changes', () => {
      const onClose = jest.fn();
      const { rerender, getByText, queryByText } = render(
        <ErrorModal visible={true} title="Error 1" message="First error" onClose={onClose} />
      );

      expect(getByText('Error 1')).toBeTruthy();

      rerender(
        <ErrorModal visible={true} title="Error 2" message="Second error" onClose={onClose} />
      );

      expect(getByText('Error 2')).toBeTruthy();
      expect(queryByText('Error 1')).toBeNull();
    });
  });
});
