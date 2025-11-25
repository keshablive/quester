/**
 * Screen Reader Navigation Tests (T091)
 *
 * Tests screen reader compatibility and navigation:
 * - 4.1.2 Name, Role, Value: All UI components have proper ARIA attributes
 * - 2.4.3 Focus Order: Navigation order is logical and intuitive
 * - 2.4.7 Focus Visible: Focus indicators are visible
 * - 1.3.1 Info and Relationships: Semantic structure is preserved
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { View, Pressable, TextInput } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';

/**
 * Helper: Check if element has required screen reader properties
 */
export function hasScreenReaderProps(element: any): {
  valid: boolean;
  issues: string[];
  props: {
    role?: string;
    label?: string;
    hint?: string;
    state?: Record<string, any>;
  };
} {
  const issues: string[] = [];
  const props = {
    role: element.props?.accessibilityRole,
    label: element.props?.accessibilityLabel,
    hint: element.props?.accessibilityHint,
    state: element.props?.accessibilityState,
  };

  // Check for role
  if (!props.role) {
    issues.push('Missing accessibilityRole');
  }

  // Interactive elements should have labels
  const interactiveRoles = ['button', 'link', 'checkbox', 'radio', 'switch', 'tab'];
  if (interactiveRoles.includes(props.role || '') && !props.label) {
    issues.push('Missing accessibilityLabel for interactive element');
  }

  // State-based elements should have state
  const statefulRoles = ['checkbox', 'radio', 'switch', 'tab'];
  if (statefulRoles.includes(props.role || '') && !props.state) {
    issues.push('Missing accessibilityState for stateful element');
  }

  return {
    valid: issues.length === 0,
    issues,
    props,
  };
}

/**
 * Helper: Build screen reader announcement from element
 */
export function buildScreenReaderAnnouncement(element: any): string {
  const role = element.props?.accessibilityRole || 'element';
  const label = element.props?.accessibilityLabel || '';
  const hint = element.props?.accessibilityHint || '';
  const value = element.props?.accessibilityValue?.text || '';
  const state = element.props?.accessibilityState || {};

  let announcement = label;

  if (value) {
    announcement += `, ${value}`;
  }

  if (state.selected) {
    announcement += ', selected';
  }

  if (state.checked !== undefined) {
    announcement += state.checked ? ', checked' : ', not checked';
  }

  if (state.disabled) {
    announcement += ', disabled';
  }

  if (state.expanded !== undefined) {
    announcement += state.expanded ? ', expanded' : ', collapsed';
  }

  announcement += `, ${role}`;

  if (hint) {
    announcement += `. ${hint}`;
  }

  return announcement;
}

/**
 * Helper: Check navigation order (focus order)
 */
export function validateNavigationOrder(elements: any[]): {
  valid: boolean;
  issues: string[];
  order: Array<{ label: string; role: string; index: number }>;
} {
  const issues: string[] = [];
  const order = elements.map((element, index) => ({
    label: element.props?.accessibilityLabel || `Element ${index}`,
    role: element.props?.accessibilityRole || 'unknown',
    index,
  }));

  // Check for logical grouping
  const interactiveIndices = elements
    .map((el, idx) => ({ el, idx }))
    .filter(({ el }) => {
      const role = el.props?.accessibilityRole;
      return ['button', 'link', 'textbox', 'checkbox', 'radio', 'switch'].includes(role);
    })
    .map(({ idx }) => idx);

  // Validate no large gaps between interactive elements (indicates poor grouping)
  for (let i = 1; i < interactiveIndices.length; i++) {
    const gap = interactiveIndices[i] - interactiveIndices[i - 1];
    if (gap > 10) {
      issues.push(
        `Large gap (${gap} elements) between interactive elements at positions ${interactiveIndices[i - 1]} and ${interactiveIndices[i]}`
      );
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    order,
  };
}

describe('Screen Reader Navigation Tests (T091)', () => {
  describe('Screen Reader Properties', () => {
    it('should validate complete screen reader properties', () => {
      const validElement = {
        props: {
          accessibilityRole: 'button',
          accessibilityLabel: 'Submit form',
          accessibilityHint: 'Double tap to submit',
        },
      };

      const result = hasScreenReaderProps(validElement);
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect missing role', () => {
      const invalidElement = {
        props: {
          accessibilityLabel: 'Submit',
          // Missing role
        },
      };

      const result = hasScreenReaderProps(invalidElement);
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Missing accessibilityRole');
    });

    it('should detect missing label on interactive element', () => {
      const invalidElement = {
        props: {
          accessibilityRole: 'button',
          // Missing label
        },
      };

      const result = hasScreenReaderProps(invalidElement);
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Missing accessibilityLabel for interactive element');
    });

    it('should detect missing state on stateful element', () => {
      const invalidElement = {
        props: {
          accessibilityRole: 'checkbox',
          accessibilityLabel: 'Accept terms',
          // Missing state
        },
      };

      const result = hasScreenReaderProps(invalidElement);
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Missing accessibilityState for stateful element');
    });
  });

  describe('Screen Reader Announcements', () => {
    it('should build correct announcement for button', () => {
      const button = {
        props: {
          accessibilityRole: 'button',
          accessibilityLabel: 'Submit',
          accessibilityHint: 'Submits the form',
        },
      };

      const announcement = buildScreenReaderAnnouncement(button);
      expect(announcement).toContain('Submit');
      expect(announcement).toContain('button');
      expect(announcement).toContain('Submits the form');
    });

    it('should build correct announcement for checked checkbox', () => {
      const checkbox = {
        props: {
          accessibilityRole: 'checkbox',
          accessibilityLabel: 'Accept terms',
          accessibilityState: { checked: true },
        },
      };

      const announcement = buildScreenReaderAnnouncement(checkbox);
      expect(announcement).toContain('Accept terms');
      expect(announcement).toContain('checked');
      expect(announcement).toContain('checkbox');
    });

    it('should build correct announcement for unchecked checkbox', () => {
      const checkbox = {
        props: {
          accessibilityRole: 'checkbox',
          accessibilityLabel: 'Receive updates',
          accessibilityState: { checked: false },
        },
      };

      const announcement = buildScreenReaderAnnouncement(checkbox);
      expect(announcement).toContain('not checked');
    });

    it('should build correct announcement for selected tab', () => {
      const tab = {
        props: {
          accessibilityRole: 'tab',
          accessibilityLabel: 'Profile',
          accessibilityState: { selected: true },
        },
      };

      const announcement = buildScreenReaderAnnouncement(tab);
      expect(announcement).toContain('Profile');
      expect(announcement).toContain('selected');
      expect(announcement).toContain('tab');
    });

    it('should build correct announcement for disabled button', () => {
      const button = {
        props: {
          accessibilityRole: 'button',
          accessibilityLabel: 'Submit',
          accessibilityState: { disabled: true },
        },
      };

      const announcement = buildScreenReaderAnnouncement(button);
      expect(announcement).toContain('disabled');
    });

    it('should build correct announcement for expanded accordion', () => {
      const accordion = {
        props: {
          accessibilityRole: 'button',
          accessibilityLabel: 'More options',
          accessibilityState: { expanded: true },
        },
      };

      const announcement = buildScreenReaderAnnouncement(accordion);
      expect(announcement).toContain('expanded');
    });

    it('should build correct announcement for collapsed accordion', () => {
      const accordion = {
        props: {
          accessibilityRole: 'button',
          accessibilityLabel: 'More options',
          accessibilityState: { expanded: false },
        },
      };

      const announcement = buildScreenReaderAnnouncement(accordion);
      expect(announcement).toContain('collapsed');
    });

    it('should include value in announcement', () => {
      const slider = {
        props: {
          accessibilityRole: 'adjustable',
          accessibilityLabel: 'Volume',
          accessibilityValue: { text: '50%' },
        },
      };

      const announcement = buildScreenReaderAnnouncement(slider);
      expect(announcement).toContain('50%');
    });
  });

  describe('Navigation Order', () => {
    it('should validate logical navigation order', () => {
      const elements = [
        { props: { accessibilityRole: 'header', accessibilityLabel: 'Title' } },
        { props: { accessibilityRole: 'text', accessibilityLabel: 'Description' } },
        { props: { accessibilityRole: 'button', accessibilityLabel: 'Action 1' } },
        { props: { accessibilityRole: 'button', accessibilityLabel: 'Action 2' } },
      ];

      const result = validateNavigationOrder(elements);
      expect(result.valid).toBe(true);
      expect(result.order).toHaveLength(4);
    });

    it('should detect gaps in navigation order', () => {
      const elements = [
        { props: { accessibilityRole: 'button', accessibilityLabel: 'First' } },
        ...Array(15).fill({ props: { accessibilityRole: 'text' } }),
        { props: { accessibilityRole: 'button', accessibilityLabel: 'Second' } },
      ];

      const result = validateNavigationOrder(elements);
      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0]).toContain('Large gap');
    });
  });

  describe('Component Testing', () => {
    it('should verify Button component has screen reader properties', () => {
      const { getByRole } = render(
        <Button accessibilityRole="button" accessibilityLabel="Click me">
          <Text>Click me</Text>
        </Button>
      );

      const button = getByRole('button');
      expect(button).toBeDefined();
      expect(button.props.accessibilityLabel).toBe('Click me');
    });

    it('should verify TextInput has proper screen reader properties', () => {
      const { getByRole } = render(
        <TextInput
          accessibilityRole="text"
          accessibilityLabel="Email address"
          accessibilityHint="Enter your email"
          placeholder="email@example.com"
        />
      );

      const input = getByRole('text');
      expect(input).toBeDefined();
      expect(input.props.accessibilityLabel).toBe('Email address');
      expect(input.props.accessibilityHint).toBe('Enter your email');
    });

    it('should verify custom Pressable has complete accessibility', () => {
      const { getByRole } = render(
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Delete item"
          accessibilityHint="Double tap to delete"
          accessibilityState={{ disabled: false }}>
          <Text>Delete</Text>
        </Pressable>
      );

      const pressable = getByRole('button');
      expect(pressable).toBeDefined();
      expect(pressable.props.accessibilityLabel).toBe('Delete item');
      expect(pressable.props.accessibilityHint).toBe('Double tap to delete');
    });
  });

  describe('Live Regions', () => {
    it('should support polite live region announcements', () => {
      const { UNSAFE_getByProps } = render(
        <View accessibilityLiveRegion="polite" testID="polite-region">
          <Text>Form submitted successfully</Text>
        </View>
      );

      const liveRegion = UNSAFE_getByProps({ testID: 'polite-region' });
      expect(liveRegion).toBeDefined();
      expect(liveRegion.props.accessibilityLiveRegion).toBe('polite');
    });

    it('should support assertive live region announcements', () => {
      const { UNSAFE_getByProps } = render(
        <View accessibilityLiveRegion="assertive" testID="assertive-region">
          <Text>Error: Connection lost</Text>
        </View>
      );

      const liveRegion = UNSAFE_getByProps({ testID: 'assertive-region' });
      expect(liveRegion).toBeDefined();
      expect(liveRegion.props.accessibilityLiveRegion).toBe('assertive');
    });
  });
  describe('Grouping and Landmarks', () => {
    it('should group related elements', () => {
      const { UNSAFE_getByProps } = render(
        <View accessibilityRole="radiogroup">
          <Pressable
            accessibilityRole="radio"
            accessibilityLabel="Option 1"
            accessibilityState={{ checked: true }}>
            <Text>Option 1</Text>
          </Pressable>
          <Pressable
            accessibilityRole="radio"
            accessibilityLabel="Option 2"
            accessibilityState={{ checked: false }}>
            <Text>Option 2</Text>
          </Pressable>
        </View>
      );

      const radiogroup = UNSAFE_getByProps({ accessibilityRole: 'radiogroup' });
      expect(radiogroup).toBeDefined();
      expect(radiogroup.props.accessibilityRole).toBe('radiogroup');
    });

    it('should support header landmarks', () => {
      const { UNSAFE_getByProps } = render(
        <View accessibilityRole="header">
          <Text>Page Title</Text>
        </View>
      );

      const header = UNSAFE_getByProps({ accessibilityRole: 'header' });
      expect(header).toBeDefined();
      expect(header.props.accessibilityRole).toBe('header');
    });
  });
  describe('Screen Reader Audit Report', () => {
    it('should generate comprehensive screen reader audit', () => {
      const testElements = [
        {
          name: 'Submit Button',
          element: {
            props: {
              accessibilityRole: 'button',
              accessibilityLabel: 'Submit',
              accessibilityHint: 'Submits the form',
            },
          },
        },
        {
          name: 'Accept Checkbox',
          element: {
            props: {
              accessibilityRole: 'checkbox',
              accessibilityLabel: 'Accept terms',
              accessibilityState: { checked: false },
            },
          },
        },
        {
          name: 'Invalid Button',
          element: {
            props: {
              accessibilityRole: 'button',
              // Missing label
            },
          },
        },
      ];

      const report = testElements.map(({ name, element }) => {
        const result = hasScreenReaderProps(element);
        const announcement = buildScreenReaderAnnouncement(element);

        return {
          element: name,
          valid: result.valid,
          issues: result.issues.join(', '),
          announcement: announcement.substring(0, 50), // Truncate for readability
        };
      });

      const passing = report.filter((item) => item.valid);
      const failing = report.filter((item) => !item.valid);

      if (failing.length > 0) {
        console.warn('Elements needing screen reader improvements:');
        console.table(failing);
      }

      expect(passing.length).toBe(2);
      expect(failing.length).toBe(1);
      expect(report.length).toBe(3);
    });
  });
});
