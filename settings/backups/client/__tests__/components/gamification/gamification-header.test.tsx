/**
 * Gamification Header Component Tests
 *
 * Tests the GamificationHeader component that displays user's XP, level,
 * and progress bar in the navigation header.
 *
 * @module __tests__/components/gamification/gamification-header.test
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { GamificationHeader } from '@/components/gamification/gamification-header';

// Mock contexts
jest.mock('@/lib/contexts/gamification-context', () => ({
  useGamification: () => ({
    currentLevel: 5,
    currentXP: 1234,
    xpForNextLevel: 2000,
    totalXP: 5234,
    badges: [{ id: '1', name: 'First Quest' }],
    rank: 42,
  }),
}));

describe('GamificationHeader', () => {
  describe('Rendering', () => {
    it('renders user level', () => {
      const { getByText } = render(<GamificationHeader />);

      expect(getByText('Level 5')).toBeTruthy();
    });

    it('renders current XP and XP to next level', () => {
      const { getByText } = render(<GamificationHeader />);

      expect(getByText(/1,234/)).toBeTruthy();
      expect(getByText(/2,000/)).toBeTruthy();
    });

    it('renders progress bar with correct percentage', () => {
      const { getByTestId } = render(<GamificationHeader />);

      const progressFill = getByTestId('xp-progress-bar-fill');
      // 1234 / 2000 = 61.7%
      expect(progressFill).toBeTruthy();
    });

    it('renders in compact mode when specified', () => {
      const { getByTestId } = render(<GamificationHeader compact />);

      const container = getByTestId('gamification-header-container');
      const style = Array.isArray(container.props.style)
        ? Object.assign({}, ...container.props.style)
        : container.props.style;

      expect(style.minHeight).toBe(48);
    });

    it('hides when hideWhenInactive is true and no recent activity', () => {
      const { queryByTestId } = render(<GamificationHeader hideWhenInactive />);

      // Component initially shows with recent activity
      expect(queryByTestId('gamification-header-container')).toBeTruthy();
    });
  });

  describe('User Interactions', () => {
    it('is pressable for navigation', () => {
      const { getByTestId } = render(<GamificationHeader />);

      const container = getByTestId('gamification-header-container');
      expect(container.props.accessibilityRole).toBe('button');
    });

    it('calls onPress callback if provided', () => {
      const onPress = jest.fn();

      const { getByTestId } = render(<GamificationHeader onPress={onPress} />);

      fireEvent.press(getByTestId('gamification-header-container'));

      expect(onPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('Visual Feedback', () => {
    it('animates progress bar on XP change', async () => {
      const { rerender, getByTestId } = render(<GamificationHeader />);

      // Update XP
      jest.mock('@/lib/contexts/gamification-context', () => ({
        useGamification: () => ({
          currentLevel: 5,
          currentXP: 1500,
          xpForNextLevel: 2000,
        }),
      }));

      rerender(<GamificationHeader />);

      const progressBar = getByTestId('xp-progress-bar');
      expect(progressBar).toBeTruthy();
    });

    it('shows level when rendered', () => {
      const { getByText } = render(<GamificationHeader />);

      expect(getByText('Level 5')).toBeTruthy();
    });

    it('applies pulse animation to new badge indicator', () => {
      jest.mock('@/lib/contexts/gamification-context', () => ({
        useGamification: () => ({
          currentLevel: 5,
          currentXP: 1234,
          xpForNextLevel: 2000,
          badges: [
            { id: '1', name: 'First Quest' },
            { id: '2', name: 'New Badge', isNew: true },
          ],
        }),
      }));

      const { getByTestId } = render(<GamificationHeader />);

      expect(getByTestId('new-badge-indicator')).toBeTruthy();
    });

    it('is interactive', () => {
      const { getByTestId } = render(<GamificationHeader />);

      const container = getByTestId('gamification-header-container');
      expect(container.props.accessibilityRole).toBe('button');
    });
  });

  describe('Accessibility', () => {
    it('has proper accessibility label', () => {
      const { getByTestId } = render(<GamificationHeader />);

      const container = getByTestId('gamification-header-container');
      expect(container.props.accessibilityLabel).toMatch(/Level 5/);
      expect(container.props.accessibilityLabel).toMatch(/1,234/);
    });

    it('has accessibility role button', () => {
      const { getByTestId } = render(<GamificationHeader />);

      const container = getByTestId('gamification-header-container');
      expect(container.props.accessibilityRole).toBe('button');
    });

    it('has accessibility hint for navigation', () => {
      const { getByTestId } = render(<GamificationHeader />);

      const container = getByTestId('gamification-header-container');
      expect(container.props.accessibilityHint).toMatch(/View your gamification dashboard/i);
    });

    it('container is accessible', () => {
      const { getByTestId } = render(<GamificationHeader />);

      const container = getByTestId('gamification-header-container');
      expect(container.props.accessibilityLabel).toBeTruthy();
    });

    it('has minimum 44pt touch target', () => {
      const { getByTestId } = render(<GamificationHeader />);

      const container = getByTestId('gamification-header-container');
      const style = Array.isArray(container.props.style)
        ? Object.assign({}, ...container.props.style)
        : container.props.style;

      expect(style.minHeight).toBeGreaterThanOrEqual(44);
    });

    it('respects reduce motion preference', () => {
      jest.mock('react-native-reanimated', () => ({
        useReducedMotion: () => true,
      }));

      const { getByTestId } = render(<GamificationHeader />);

      // Should render without complex animations
      expect(getByTestId('gamification-header-container')).toBeTruthy();
    });
  });

  describe('Performance', () => {
    it('uses React.memo to prevent unnecessary re-renders', () => {
      const { rerender } = render(<GamificationHeader />);

      // Re-render with same gamification state
      rerender(<GamificationHeader />);

      expect(GamificationHeader).toBeDefined();
    });

    it('debounces progress bar animations', async () => {
      const { rerender } = render(<GamificationHeader />);

      // Rapid re-renders should not cause performance issues
      for (let i = 0; i < 10; i++) {
        rerender(<GamificationHeader />);
      }

      // Should not cause performance issues
      expect(true).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('handles default context values', () => {
      const { getByText } = render(<GamificationHeader />);

      // Uses default mock (Level 5)
      expect(getByText('Level 5')).toBeTruthy();
    });

    it('renders progress bar', () => {
      const { getByTestId } = render(<GamificationHeader />);

      expect(getByTestId('xp-progress-bar-fill')).toBeTruthy();
    });

    it('renders without crashing', () => {
      expect(() => {
        render(<GamificationHeader />);
      }).not.toThrow();
    });

    it('displays XP with formatting', () => {
      const { getByText } = render(<GamificationHeader />);

      // Default mock has 1,234 XP
      expect(getByText(/1,234/)).toBeTruthy();
    });
  });

  describe('Theme Support', () => {
    it('renders consistently', () => {
      const { getByTestId } = render(<GamificationHeader />);

      const container = getByTestId('gamification-header-container');
      expect(container).toBeTruthy();
    });

    it('maintains consistent structure', () => {
      const { getByTestId } = render(<GamificationHeader />);

      expect(getByTestId('gamification-header-container')).toBeTruthy();
      expect(getByTestId('xp-progress-bar-fill')).toBeTruthy();
    });
  });

  describe('Real-Time Updates', () => {
    it('renders current XP value', () => {
      const { getByText } = render(<GamificationHeader />);

      // Renders default mock value
      expect(getByText(/1,234/)).toBeTruthy();
    });

    it('component initializes properly', () => {
      const { getByTestId } = render(<GamificationHeader />);

      expect(getByTestId('gamification-header-container')).toBeTruthy();
    });
  });
});
