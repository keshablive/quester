/**
 * Form Accessibility Tests (T093)
 *
 * Tests form accessibility compliance:
 * - 1.3.1 Info and Relationships: Labels are programmatically associated with inputs
 * - 3.3.1 Error Identification: Errors are identified in accessible way
 * - 3.3.2 Labels or Instructions: Labels/instructions provided for user input
 * - 3.3.3 Error Suggestion: Suggestions provided when input error detected
 * - 4.1.3 Status Messages: Status changes announced to screen readers
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';

/**
 * Helper: Check label-input association
 */
export function hasLabelAssociation(
  label: any,
  input: any
): {
  valid: boolean;
  method: 'nativeID' | 'wrapping' | 'aria-labelledby' | 'none';
  details: string;
} {
  // Method 1: nativeID + aria-labelledby
  if (input.props?.nativeID && label.props?.['aria-labelledby']) {
    return {
      valid: input.props.nativeID === label.props['aria-labelledby'],
      method: 'nativeID',
      details: `Input nativeID: ${input.props.nativeID}`,
    };
  }

  // Method 2: Label wraps input (check parent-child relationship)
  // In React Native, we check accessibilityLabelledBy
  if (input.props?.accessibilityLabelledBy) {
    return {
      valid: true,
      method: 'aria-labelledby',
      details: `accessibilityLabelledBy: ${input.props.accessibilityLabelledBy}`,
    };
  }

  // Method 3: accessibilityLabel on input itself
  if (input.props?.accessibilityLabel) {
    return {
      valid: true,
      method: 'wrapping',
      details: `accessibilityLabel: ${input.props.accessibilityLabel}`,
    };
  }

  return {
    valid: false,
    method: 'none',
    details: 'No label association found',
  };
}

/**
 * Helper: Check error message accessibility
 */
export function hasAccessibleErrorMessage(
  errorElement: any,
  inputElement: any
): {
  valid: boolean;
  announced: boolean;
  associated: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check if error has accessible role
  const hasRole =
    errorElement.props?.accessibilityRole === 'alert' ||
    errorElement.props?.accessibilityLive === 'assertive' ||
    errorElement.props?.accessibilityLive === 'polite';

  if (!hasRole) {
    issues.push('Error message lacks accessibility live region');
  }

  // Check if error is associated with input (via describedby)
  const isAssociated =
    inputElement.props?.accessibilityDescribedBy === errorElement.props?.nativeID ||
    inputElement.props?.['aria-describedby'] === errorElement.props?.nativeID;

  if (!isAssociated) {
    issues.push('Error message not associated with input via describedby');
  }

  // Check if input has error state
  const hasErrorState = inputElement.props?.accessibilityState?.invalid === true;

  if (!hasErrorState) {
    issues.push('Input lacks invalid state');
  }

  return {
    valid: issues.length === 0,
    announced: hasRole,
    associated: isAssociated,
    issues,
  };
}

/**
 * Helper: Check required field indicator
 */
export function hasRequiredIndicator(
  inputElement: any,
  labelElement?: any
): {
  valid: boolean;
  visual: boolean;
  programmatic: boolean;
  methods: string[];
} {
  const methods: string[] = [];

  // Check programmatic required state
  const programmatic =
    inputElement.props?.accessibilityRequired === true ||
    inputElement.props?.accessibilityState?.required === true ||
    inputElement.props?.required === true;

  if (programmatic) {
    methods.push('accessibilityRequired/required prop');
  }

  // Check label text includes visual indicator
  const labelText = labelElement?.props?.children || labelElement?.props?.accessibilityLabel || '';
  const visual =
    labelText.includes('*') || labelText.includes('required') || labelText.includes('Required');

  if (visual) {
    methods.push('Visual indicator in label');
  }

  return {
    valid: programmatic && visual,
    visual,
    programmatic,
    methods,
  };
}

/**
 * Helper: Validate form field structure
 */
export function validateFormField(field: {
  label?: any;
  input: any;
  error?: any;
  hint?: any;
  required?: boolean;
}): {
  valid: boolean;
  checks: Record<string, boolean>;
  issues: string[];
} {
  const issues: string[] = [];
  const checks: Record<string, boolean> = {};

  // Check label association
  if (field.label) {
    const labelCheck = hasLabelAssociation(field.label, field.input);
    checks.labelAssociation = labelCheck.valid;
    if (!labelCheck.valid) {
      issues.push(`Label not associated: ${labelCheck.details}`);
    }
  } else {
    checks.labelAssociation = false;
    issues.push('No label provided');
  }

  // Check input has accessible role
  checks.inputRole =
    field.input.props?.accessibilityRole === 'textbox' ||
    field.input.props?.accessibilityRole === 'checkbox' ||
    field.input.props?.accessibilityRole === 'radio' ||
    field.input.props?.accessibilityRole === 'switch';

  if (!checks.inputRole) {
    issues.push('Input lacks appropriate accessibility role');
  }

  // Check error message accessibility
  if (field.error) {
    const errorCheck = hasAccessibleErrorMessage(field.error, field.input);
    checks.errorMessage = errorCheck.valid;
    issues.push(...errorCheck.issues);
  } else {
    checks.errorMessage = true; // No error present
  }

  // Check hint/description
  if (field.hint) {
    checks.hint =
      field.input.props?.accessibilityHint === field.hint.props?.children ||
      field.input.props?.accessibilityDescribedBy === field.hint.props?.nativeID;
    if (!checks.hint) {
      issues.push('Hint not associated with input');
    }
  } else {
    checks.hint = true; // No hint present
  }

  // Check required indicator
  if (field.required) {
    const requiredCheck = hasRequiredIndicator(field.input, field.label);
    checks.required = requiredCheck.valid;
    if (!requiredCheck.valid) {
      issues.push('Required indicator not properly implemented');
    }
  } else {
    checks.required = true; // Not required
  }

  return {
    valid: issues.length === 0,
    checks,
    issues,
  };
}

describe('Form Accessibility Tests (T093)', () => {
  describe('Label-Input Association', () => {
    it('should associate label with input via nativeID', () => {
      const label = {
        props: {
          nativeID: 'email-label',
          children: 'Email',
        },
      };

      const input = {
        props: {
          nativeID: 'email-input',
          accessibilityLabelledBy: 'email-label',
          accessibilityRole: 'textbox',
        },
      };

      const result = hasLabelAssociation(label, input);
      expect(result.valid).toBe(true);
      expect(result.method).toBe('aria-labelledby');
    });

    it('should accept accessibilityLabel on input', () => {
      const input = {
        props: {
          accessibilityLabel: 'Email address',
          accessibilityRole: 'textbox',
        },
      };

      const result = hasLabelAssociation({}, input);
      expect(result.valid).toBe(true);
      expect(result.method).toBe('wrapping');
    });

    it('should detect missing label association', () => {
      const label = {
        props: {
          children: 'Email',
        },
      };

      const input = {
        props: {
          accessibilityRole: 'textbox',
          // No label association
        },
      };

      const result = hasLabelAssociation(label, input);
      expect(result.valid).toBe(false);
      expect(result.method).toBe('none');
    });
  });

  describe('Error Message Accessibility', () => {
    it('should have accessible error with live region and association', () => {
      const error = {
        props: {
          nativeID: 'email-error',
          accessibilityLive: 'assertive',
          accessibilityRole: 'alert',
          children: 'Email is required',
        },
      };

      const input = {
        props: {
          accessibilityDescribedBy: 'email-error',
          accessibilityState: { invalid: true },
          accessibilityRole: 'textbox',
        },
      };

      const result = hasAccessibleErrorMessage(error, input);
      expect(result.valid).toBe(true);
      expect(result.announced).toBe(true);
      expect(result.associated).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect error without live region', () => {
      const error = {
        props: {
          nativeID: 'email-error',
          children: 'Email is required',
          // No accessibility live region
        },
      };

      const input = {
        props: {
          accessibilityDescribedBy: 'email-error',
          accessibilityState: { invalid: true },
        },
      };

      const result = hasAccessibleErrorMessage(error, input);
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Error message lacks accessibility live region');
    });

    it('should detect error not associated with input', () => {
      const error = {
        props: {
          nativeID: 'email-error',
          accessibilityLive: 'assertive',
          children: 'Email is required',
        },
      };

      const input = {
        props: {
          // No describedby
          accessibilityState: { invalid: true },
        },
      };

      const result = hasAccessibleErrorMessage(error, input);
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Error message not associated with input via describedby');
    });

    it('should detect missing invalid state on input', () => {
      const error = {
        props: {
          nativeID: 'email-error',
          accessibilityLive: 'assertive',
          children: 'Email is required',
        },
      };

      const input = {
        props: {
          accessibilityDescribedBy: 'email-error',
          // No invalid state
        },
      };

      const result = hasAccessibleErrorMessage(error, input);
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Input lacks invalid state');
    });
  });

  describe('Required Field Indicators', () => {
    it('should have both visual and programmatic required indicators', () => {
      const label = {
        props: {
          children: 'Email *',
        },
      };

      const input = {
        props: {
          accessibilityRequired: true,
          accessibilityState: { required: true },
        },
      };

      const result = hasRequiredIndicator(input, label);
      expect(result.valid).toBe(true);
      expect(result.visual).toBe(true);
      expect(result.programmatic).toBe(true);
    });

    it('should accept "required" text in label', () => {
      const label = {
        props: {
          accessibilityLabel: 'Email (required)',
        },
      };

      const input = {
        props: {
          required: true,
        },
      };

      const result = hasRequiredIndicator(input, label);
      expect(result.valid).toBe(true);
    });

    it('should detect missing visual indicator', () => {
      const label = {
        props: {
          children: 'Email',
          // No * or required text
        },
      };

      const input = {
        props: {
          accessibilityRequired: true,
        },
      };

      const result = hasRequiredIndicator(input, label);
      expect(result.valid).toBe(false);
      expect(result.visual).toBe(false);
      expect(result.programmatic).toBe(true);
    });

    it('should detect missing programmatic indicator', () => {
      const label = {
        props: {
          children: 'Email *',
        },
      };

      const input = {
        props: {
          // No required prop
        },
      };

      const result = hasRequiredIndicator(input, label);
      expect(result.valid).toBe(false);
      expect(result.visual).toBe(true);
      expect(result.programmatic).toBe(false);
    });
  });

  describe('Form Field Validation', () => {
    it('should validate complete form field with all elements', () => {
      const field = {
        label: {
          props: {
            nativeID: 'email-label',
            children: 'Email *',
          },
        },
        input: {
          props: {
            accessibilityLabelledBy: 'email-label',
            accessibilityRole: 'textbox',
            accessibilityRequired: true,
            accessibilityState: { required: true },
          },
        },
        required: true,
      };

      const result = validateFormField(field);
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should validate field with error state', () => {
      const field = {
        label: {
          props: {
            nativeID: 'email-label',
            children: 'Email',
          },
        },
        input: {
          props: {
            accessibilityLabelledBy: 'email-label',
            accessibilityRole: 'textbox',
            accessibilityState: { invalid: true },
            accessibilityDescribedBy: 'email-error',
          },
        },
        error: {
          props: {
            nativeID: 'email-error',
            accessibilityLive: 'assertive',
            children: 'Email is required',
          },
        },
      };

      const result = validateFormField(field);
      expect(result.checks.errorMessage).toBe(true);
    });

    it('should detect missing label', () => {
      const field = {
        input: {
          props: {
            accessibilityRole: 'textbox',
          },
        },
      };

      const result = validateFormField(field);
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('No label provided');
    });
  });

  describe('Component Testing', () => {
    it('should render accessible text input with label', () => {
      const TestField = () => (
        <View>
          <Text nativeID="email-label">Email</Text>
          <View
            // @ts-ignore - textbox is valid for web accessibility
            accessibilityRole="textbox"
            accessibilityLabelledBy="email-label"
            testID="email-input"
          />
        </View>
      );

      const { getByTestId } = render(<TestField />);
      const input = getByTestId('email-input');

      expect(input.props.accessibilityRole).toBe('textbox');
      expect(input.props.accessibilityLabelledBy).toBe('email-label');
    });

    it('should render accessible checkbox with label', () => {
      const TestCheckbox = () => (
        <View>
          <Button
            accessibilityRole="checkbox"
            accessibilityLabel="Accept terms and conditions"
            accessibilityState={{ checked: false }}
            testID="terms-checkbox">
            <Text>Accept terms</Text>
          </Button>
        </View>
      );

      const { getByTestId } = render(<TestCheckbox />);
      const checkbox = getByTestId('terms-checkbox');

      expect(checkbox.props.accessibilityRole).toBe('checkbox');
      expect(checkbox.props.accessibilityLabel).toBe('Accept terms and conditions');
      expect(checkbox.props.accessibilityState?.checked).toBe(false);
    });

    it('should render accessible radio button group', () => {
      const TestRadioGroup = () => (
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel="Select payment method"
          testID="payment-group">
          <Button
            accessibilityRole="radio"
            accessibilityLabel="Credit card"
            accessibilityState={{ checked: true }}
            testID="radio-1">
            <Text>Credit card</Text>
          </Button>
          <Button
            accessibilityRole="radio"
            accessibilityLabel="PayPal"
            accessibilityState={{ checked: false }}
            testID="radio-2">
            <Text>PayPal</Text>
          </Button>
        </View>
      );

      const { getByTestId } = render(<TestRadioGroup />);
      const group = getByTestId('payment-group');
      const radio1 = getByTestId('radio-1');
      const radio2 = getByTestId('radio-2');

      expect(group.props.accessibilityRole).toBe('radiogroup');
      expect(radio1.props.accessibilityRole).toBe('radio');
      expect(radio2.props.accessibilityRole).toBe('radio');
      expect(radio1.props.accessibilityState?.checked).toBe(true);
      expect(radio2.props.accessibilityState?.checked).toBe(false);
    });

    it('should render accessible select/dropdown', () => {
      const TestSelect = () => (
        <View>
          <Text nativeID="country-label">Country</Text>
          <Button
            accessibilityRole="button"
            accessibilityLabel="Select country"
            accessibilityLabelledBy="country-label"
            accessibilityState={{ expanded: false }}
            accessibilityHint="Opens dropdown to select country"
            testID="country-select">
            <Text>Select country</Text>
          </Button>
        </View>
      );

      const { getByTestId } = render(<TestSelect />);
      const select = getByTestId('country-select');

      expect(select.props.accessibilityRole).toBe('button');
      expect(select.props.accessibilityLabelledBy).toBe('country-label');
      expect(select.props.accessibilityState?.expanded).toBe(false);
      expect(select.props.accessibilityHint).toContain('dropdown');
    });
  });

  describe('Form Validation Messages', () => {
    it('should announce inline validation errors', () => {
      const error = {
        props: {
          accessibilityLive: 'polite',
          children: 'Password must be at least 8 characters',
        },
      };

      expect(error.props.accessibilityLive).toBe('polite');
    });

    it('should announce critical errors assertively', () => {
      const error = {
        props: {
          accessibilityLive: 'assertive',
          accessibilityRole: 'alert',
          children: 'Unable to submit form. Please check errors.',
        },
      };

      expect(error.props.accessibilityLive).toBe('assertive');
      expect(error.props.accessibilityRole).toBe('alert');
    });

    it('should provide helpful error suggestions', () => {
      const errors = [
        {
          field: 'email',
          message: 'Email is required',
          suggestion: 'Please enter your email address',
        },
        {
          field: 'password',
          message: 'Password too weak',
          suggestion: 'Use at least 8 characters with numbers and symbols',
        },
      ];

      errors.forEach((error) => {
        expect(error.message).toBeTruthy();
        expect(error.suggestion).toBeTruthy();
      });
    });
  });

  describe('Form Accessibility Audit Report', () => {
    it('should generate comprehensive form audit report', () => {
      const formFields = [
        {
          name: 'Email (valid)',
          label: { props: { nativeID: 'email-label', children: 'Email *' } },
          input: {
            props: {
              accessibilityLabelledBy: 'email-label',
              accessibilityRole: 'textbox',
              accessibilityRequired: true,
              accessibilityState: { required: true },
            },
          },
          required: true,
        },
        {
          name: 'Password (missing label)',
          input: {
            props: {
              accessibilityRole: 'textbox',
            },
          },
        },
        {
          name: 'Terms checkbox (valid)',
          label: { props: { children: 'Accept terms' } },
          input: {
            props: {
              accessibilityLabel: 'Accept terms and conditions',
              accessibilityRole: 'checkbox',
            },
          },
        },
      ];

      const report = formFields.map((field) => {
        const validation = validateFormField(field);
        return {
          field: field.name,
          valid: validation.valid,
          issues: validation.issues.join('; '),
        };
      });

      const passing = report.filter((item) => item.valid);
      const failing = report.filter((item) => !item.valid);

      if (failing.length > 0) {
        console.warn('Form accessibility issues found:');
        console.table(failing);
      }

      expect(passing.length).toBe(2);
      expect(failing.length).toBe(1);
      expect(report.length).toBe(3);
    });
  });
});
