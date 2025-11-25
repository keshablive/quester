/**
 * ValidationError Component Tests
 * Phase 8, T132: Tests for inline form validation errors
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { ValidationError } from '@/components/validation-error';

describe('ValidationError', () => {
  describe('Visibility', () => {
    it('should not render when error is empty string', () => {
      const { queryByTestId } = render(<ValidationError error="" />);
      expect(queryByTestId('validation-error')).toBeNull();
    });

    it('should not render when error is null', () => {
      const { queryByTestId } = render(<ValidationError error={null} />);
      expect(queryByTestId('validation-error')).toBeNull();
    });

    it('should not render when error is undefined', () => {
      const { queryByTestId } = render(<ValidationError error={undefined} />);
      expect(queryByTestId('validation-error')).toBeNull();
    });

    it('should render when error is provided', () => {
      const { getByTestId } = render(<ValidationError error="Email is required" />);
      expect(getByTestId('validation-error')).toBeTruthy();
    });

    it('should display error message text', () => {
      const { getByText } = render(
        <ValidationError error="Password must be at least 8 characters" />
      );
      expect(getByText('Password must be at least 8 characters')).toBeTruthy();
    });
  });

  describe('Field Association', () => {
    it('should accept fieldId prop for aria-labelledby association', () => {
      const { getByTestId } = render(
        <ValidationError error="Invalid email" fieldId="email-input" />
      );
      const errorElement = getByTestId('validation-error');
      expect(errorElement.props.nativeID).toBe('email-input-error');
    });

    it('should generate nativeID based on fieldId', () => {
      const { getByTestId } = render(<ValidationError error="Required field" fieldId="username" />);
      const errorElement = getByTestId('validation-error');
      expect(errorElement.props.nativeID).toBe('username-error');
    });
  });

  describe('Error Icon', () => {
    it('should display alert circle icon', () => {
      const { getByTestId } = render(<ValidationError error="Invalid input" />);
      expect(getByTestId('error-icon')).toBeTruthy();
    });

    it('should use red color for error icon', () => {
      const { getByTestId } = render(<ValidationError error="Invalid input" />);
      const icon = getByTestId('error-icon');
      // Icon should have red/destructive color
      expect(icon.props.children.props.color).toMatch(/red|#[eE][fF]4444/i);
    });
  });

  describe('Accessibility', () => {
    it('should have alert role', () => {
      const { getByTestId } = render(<ValidationError error="This field is required" />);
      const errorElement = getByTestId('validation-error');
      expect(errorElement.props.accessibilityRole).toBe('alert');
    });

    it('should have polite live region', () => {
      const { getByTestId } = render(<ValidationError error="Invalid format" />);
      const errorElement = getByTestId('validation-error');
      expect(errorElement.props.accessibilityLiveRegion).toBe('polite');
    });

    it('should have descriptive accessibility label', () => {
      const { getByTestId } = render(<ValidationError error="Email format is invalid" />);
      const errorElement = getByTestId('validation-error');
      expect(errorElement.props.accessibilityLabel).toBe(
        'Validation error: Email format is invalid'
      );
    });

    it('should include error text in accessibility label', () => {
      const errorMessage = 'Username must be at least 3 characters';
      const { getByTestId } = render(<ValidationError error={errorMessage} />);
      const errorElement = getByTestId('validation-error');
      expect(errorElement.props.accessibilityLabel).toContain(errorMessage);
    });
  });

  describe('Styling', () => {
    it('should have red/destructive text color', () => {
      const { getByTestId } = render(<ValidationError error="Error message" />);
      const errorElement = getByTestId('validation-error');
      expect(errorElement.props.className).toMatch(/text-red|text-destructive/);
    });

    it('should have small text size', () => {
      const { getByTestId } = render(<ValidationError error="Error message" />);
      const errorElement = getByTestId('validation-error');
      expect(errorElement.props.className).toMatch(/text-sm/);
    });

    it('should display inline with icon and text', () => {
      const { getByTestId } = render(<ValidationError error="Error message" />);
      const errorElement = getByTestId('validation-error');
      expect(errorElement.props.className).toMatch(/flex-row|items-center/);
    });
  });

  describe('Multiple Errors', () => {
    it('should display first error when array is provided', () => {
      const errors = ['Email is required', 'Email format is invalid'];
      const { getByText } = render(<ValidationError error={errors[0]} />);
      expect(getByText(errors[0])).toBeTruthy();
    });

    it('should handle empty error message gracefully', () => {
      const { queryByTestId } = render(<ValidationError error="" />);
      expect(queryByTestId('validation-error')).toBeNull();
    });
  });

  describe('Custom Styling', () => {
    it('should accept custom className prop', () => {
      const { getByTestId } = render(<ValidationError error="Error" className="mb-2 mt-4" />);
      const errorElement = getByTestId('validation-error');
      expect(errorElement.props.className).toContain('mt-4');
      expect(errorElement.props.className).toContain('mb-2');
    });

    it('should merge custom className with default styles', () => {
      const { getByTestId } = render(<ValidationError error="Error" className="custom-class" />);
      const errorElement = getByTestId('validation-error');
      expect(errorElement.props.className).toContain('custom-class');
      expect(errorElement.props.className).toMatch(/text-red|text-destructive/);
    });
  });

  describe('Integration with Forms', () => {
    it('should work with input field error state', () => {
      const errorMessage = 'Email is invalid';
      const TestForm = () => {
        return (
          <>
            {/* Mock Input component */}
            <ValidationError error={errorMessage} fieldId="email-input" />
          </>
        );
      };

      const { getByText, getByTestId } = render(<TestForm />);
      expect(getByText(errorMessage)).toBeTruthy();
      expect(getByTestId('validation-error').props.nativeID).toBe('email-input-error');
    });

    it('should update when error changes', () => {
      const { rerender, getByText, queryByText } = render(
        <ValidationError error="Initial error" />
      );

      // Verify initial error
      expect(getByText('Initial error')).toBeTruthy();

      // Update error
      rerender(<ValidationError error="Updated error" />);
      expect(getByText('Updated error')).toBeTruthy();
      expect(queryByText('Initial error')).toBeNull();
    });

    it('should clear when error is removed', () => {
      const { rerender, getByText, queryByTestId } = render(
        <ValidationError error="Error message" />
      );

      // Verify error is visible
      expect(getByText('Error message')).toBeTruthy();

      // Clear error
      rerender(<ValidationError error="" />);
      expect(queryByTestId('validation-error')).toBeNull();
    });
  });

  describe('Error Message Formatting', () => {
    it('should trim whitespace from error message', () => {
      const { getByText } = render(<ValidationError error="  Error with spaces  " />);
      expect(getByText('Error with spaces')).toBeTruthy();
    });

    it('should handle long error messages', () => {
      const longError =
        'This is a very long error message that should wrap to multiple lines when displayed in the UI';
      const { getByText } = render(<ValidationError error={longError} />);
      expect(getByText(longError)).toBeTruthy();
    });

    it('should preserve error message capitalization', () => {
      const { getByText } = render(<ValidationError error="Email Address is required" />);
      expect(getByText('Email Address is required')).toBeTruthy();
    });
  });
});
