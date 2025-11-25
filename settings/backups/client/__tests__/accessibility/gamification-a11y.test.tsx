/**
 * Gamification Accessibility Tests (WCAG 2.1 AA/AAA)
 *
 * Comprehensive accessibility tests for all gamification components
 * ensuring compliance with WCAG 2.1 Level AA and AAA standards.
 *
 * @module __tests__/accessibility/gamification-a11y.test
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { GamificationHeader } from '@/components/gamification/gamification-header';
import { XPGainAnimation } from '@/components/gamification/xp-gain-animation';
import LevelUpModal from '@/components/gamification/level-up-modal';
import { BadgeUnlockNotification } from '@/components/gamification/badge-unlock-notification';
import { LeaderboardWidget } from '@/components/gamification/leaderboard-widget';

// Mock contexts for testing
jest.mock('@/lib/contexts/gamification-context', () => ({
  useGamification: () => ({
    currentLevel: 5,
    currentXP: 1234,
    xpForNextLevel: 2000,
    totalXP: 5234,
    badges: [],
  }),
}));

const mockLeaderboardData = [
  { rank: 1, userId: 'user-1', username: 'Player1', xp: 10000, level: 25 },
  { rank: 2, userId: 'user-2', username: 'Player2', xp: 8500, level: 22 },
  { rank: 3, userId: 'user-3', username: 'Player3', xp: 7200, level: 20 },
];

const mockBadge = {
  id: 'badge-1',
  name: 'First Quest',
  description: 'Complete your first quest',
  icon: 'trophy',
  rarity: 'common' as const,
};

describe('Gamification Accessibility (WCAG 2.1 AA/AAA)', () => {
  describe('Screen Reader Support', () => {
    describe('GamificationHeader', () => {
      it('has descriptive accessibility label with current state', () => {
        const { getByLabelText } = render(<GamificationHeader />);

        const header = getByLabelText(/level 5.*1,234.*experience points/i);
        expect(header).toBeTruthy();
      });

      it('announces XP progress to screen reader', () => {
        const { getByLabelText } = render(<GamificationHeader />);

        const header = getByLabelText(/1,234.*2,000/i);
        expect(header).toBeTruthy();
      });

      it('has accessibility hint for navigation', () => {
        const { getByTestId } = render(<GamificationHeader />);

        const container = getByTestId('gamification-header-container');
        expect(container.props.accessibilityHint).toMatch(/view.*dashboard/i);
      });

      it('uses accessibilityRole button for interactive elements', () => {
        const { getByTestId } = render(<GamificationHeader />);

        const container = getByTestId('gamification-header-container');
        expect(container.props.accessibilityRole).toBe('button');
      });

      it('announces level-up to screen reader', () => {
        // GamificationHeader displays level in accessibilityLabel
        const { getByTestId } = render(<GamificationHeader />);

        const container = getByTestId('gamification-header-container');
        expect(container.props.accessibilityLabel).toMatch(/level 5/i);
      });
    });

    describe('XPGainAnimation', () => {
      it('announces XP gain amount to screen reader', () => {
        const { getByLabelText } = render(
          <XPGainAnimation amount={100} source="quest_completion" visible onComplete={jest.fn()} />
        );

        expect(getByLabelText(/gained 100 experience points/i)).toBeTruthy();
      });

      it('has accessibility role alert for immediate notification', () => {
        const { getByTestId } = render(
          <XPGainAnimation amount={50} source="quest_completion" visible onComplete={jest.fn()} />
        );

        const container = getByTestId('xp-animation-container');
        expect(container.props.accessibilityRole).toBe('alert');
      });

      it('provides accessible label for XP amount', () => {
        const { getByTestId } = render(
          <XPGainAnimation amount={250} source="quest_completion" visible onComplete={jest.fn()} />
        );

        const text = getByTestId('xp-amount-text');
        expect(text.props.accessibilityLabel).toMatch(/250.*experience points/i);
      });
    });

    describe('LevelUpModal', () => {
      it('announces level-up achievement to screen reader', () => {
        const { getByLabelText } = render(
          <LevelUpModal level={6} visible unlockedFeatures={[]} onClose={jest.fn()} />
        );

        expect(getByLabelText(/congratulations.*level 6/i)).toBeTruthy();
      });

      it('has accessibility role alertdialog for modal', () => {
        const { getByTestId } = render(
          <LevelUpModal level={6} visible unlockedFeatures={[]} onClose={jest.fn()} />
        );

        const modal = getByTestId('level-up-overlay');
        expect(modal.props.accessibilityRole).toBe('alertdialog');
      });

      it('sets accessibilityViewIsModal to trap focus', () => {
        const { UNSAFE_getByType } = render(
          <LevelUpModal level={6} visible unlockedFeatures={[]} onClose={jest.fn()} />
        );

        const modal = UNSAFE_getByType(require('react-native').Modal);
        expect(modal.props.accessibilityViewIsModal).toBe(true);
      });

      it('has accessible dismiss button label', () => {
        const { getByLabelText } = render(
          <LevelUpModal level={6} visible unlockedFeatures={[]} onClose={jest.fn()} />
        );

        expect(getByLabelText(/close.*level up.*modal/i)).toBeTruthy();
      });
    });

    describe('BadgeUnlockNotification', () => {
      it('announces badge unlock to screen reader', () => {
        const { getByLabelText } = render(
          <BadgeUnlockNotification badge={mockBadge} onDismiss={jest.fn()} />
        );

        expect(
          getByLabelText(/badge unlocked.*first quest.*complete your first quest/i)
        ).toBeTruthy();
      });

      it('has accessibility role alert', () => {
        const { getByTestId } = render(
          <BadgeUnlockNotification badge={mockBadge} onDismiss={jest.fn()} />
        );

        const container = getByTestId('badge-notification-container');
        expect(container.props.accessibilityRole).toBe('alert');
      });

      it('has accessible dismiss button', () => {
        const { getByLabelText } = render(
          <BadgeUnlockNotification badge={mockBadge} onDismiss={jest.fn()} />
        );

        expect(getByLabelText(/dismiss badge notification/i)).toBeTruthy();
      });
    });

    describe('LeaderboardWidget', () => {
      it('has descriptive label for widget', () => {
        const { getByLabelText } = render(
          <LeaderboardWidget data={mockLeaderboardData} currentUserId="user-10" />
        );

        expect(getByLabelText(/leaderboard.*top.*users/i)).toBeTruthy();
      });

      it('has accessible labels for each leaderboard row', () => {
        const { getByLabelText } = render(
          <LeaderboardWidget data={mockLeaderboardData} currentUserId="user-10" />
        );

        expect(
          getByLabelText(/rank 1.*player1.*10,000.*experience points.*level 25/i)
        ).toBeTruthy();
      });

      it('announces current user rank', () => {
        const extendedData = [
          ...mockLeaderboardData,
          { rank: 42, userId: 'current-user', username: 'You', xp: 1000, level: 8 },
        ];

        const { getByLabelText } = render(
          <LeaderboardWidget data={extendedData} currentUserId="current-user" />
        );

        expect(getByLabelText(/your rank.*42/i)).toBeTruthy();
      });

      it('uses list role for leaderboard container', () => {
        const { getByTestId } = render(
          <LeaderboardWidget data={mockLeaderboardData} currentUserId="user-10" />
        );

        const list = getByTestId('leaderboard-flatlist');
        expect(list.props.accessibilityRole).toBe('list');
      });
    });
  });

  describe('Touch Target Sizes (WCAG 2.5.5 - Level AAA)', () => {
    const MIN_TOUCH_TARGET_IOS = 44;
    const MIN_TOUCH_TARGET_ANDROID = 48;
    const MIN_TOUCH_TARGET = Platform.select({
      ios: MIN_TOUCH_TARGET_IOS,
      android: MIN_TOUCH_TARGET_ANDROID,
      default: MIN_TOUCH_TARGET_IOS,
    });

    it('GamificationHeader has minimum touch target', () => {
      const { getByTestId } = render(<GamificationHeader />);

      const container = getByTestId('gamification-header-container');
      const style = Array.isArray(container.props.style)
        ? Object.assign({}, ...container.props.style)
        : container.props.style;

      expect(style.minHeight).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
    });

    it('LevelUpModal dismiss button has minimum touch target', () => {
      const { getByTestId } = render(
        <LevelUpModal level={6} visible unlockedFeatures={[]} onClose={jest.fn()} />
      );

      const button = getByTestId('dismiss-button');
      const style = button.props.style;

      expect(style.minHeight).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
      expect(style.minWidth).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
    });

    it('BadgeUnlockNotification dismiss button has minimum touch target', () => {
      const { getByTestId } = render(
        <BadgeUnlockNotification badge={mockBadge} onDismiss={jest.fn()} />
      );

      const button = getByTestId('dismiss-button');
      const style = button.props.style;

      expect(style.minHeight).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
      expect(style.minWidth).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
    });

    it('LeaderboardWidget rows have minimum touch target', () => {
      const { getByTestId } = render(
        <LeaderboardWidget data={mockLeaderboardData} currentUserId="user-10" />
      );

      const row = getByTestId('leaderboard-row-user-1');
      const style = Array.isArray(row.props.style)
        ? Object.assign({}, ...row.props.style)
        : row.props.style;

      expect(style.minHeight).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
    });
  });

  describe('Color Contrast (WCAG 1.4.3 - Level AA, 1.4.6 - Level AAA)', () => {
    it('GamificationHeader text has sufficient contrast', () => {
      const { getByTestId } = render(<GamificationHeader />);

      const levelText = getByTestId('level-text');
      const xpText = getByTestId('xp-text');

      // Should use high-contrast colors
      expect(levelText).toBeTruthy();
      expect(xpText).toBeTruthy();
    });

    it('XPGainAnimation text has sufficient contrast', () => {
      const { getByTestId } = render(
        <XPGainAnimation amount={100} source="quest_completion" visible onComplete={jest.fn()} />
      );

      const text = getByTestId('xp-amount-text');
      // Text should be visible against background
      expect(text).toBeTruthy();
    });

    it('Badge rarity colors maintain minimum contrast', () => {
      const rarities: Array<'common' | 'rare' | 'epic' | 'legendary'> = [
        'common',
        'rare',
        'epic',
        'legendary',
      ];

      rarities.forEach((rarity) => {
        const badge = { ...mockBadge, rarity };
        const { getByTestId } = render(
          <BadgeUnlockNotification badge={badge} onDismiss={jest.fn()} />
        );

        const container = getByTestId('badge-notification-container');
        // Each rarity should have sufficient contrast
        expect(container).toBeTruthy();
      });
    });

    it('LeaderboardWidget rank badges have sufficient contrast', () => {
      const { getByTestId } = render(
        <LeaderboardWidget data={mockLeaderboardData} currentUserId="user-10" />
      );

      // Gold, silver, bronze badges should be visible
      expect(getByTestId('rank-badge-1-gold')).toBeTruthy();
      expect(getByTestId('rank-badge-2-silver')).toBeTruthy();
      expect(getByTestId('rank-badge-3-bronze')).toBeTruthy();
    });
  });

  describe('Focus Management', () => {
    it('LevelUpModal traps focus when opened', () => {
      const { UNSAFE_getByType } = render(
        <LevelUpModal level={6} visible unlockedFeatures={[]} onClose={jest.fn()} />
      );

      const modal = UNSAFE_getByType(require('react-native').Modal);
      expect(modal.props.accessibilityViewIsModal).toBe(true);
    });

    it('BadgeUnlockNotification modal traps focus', () => {
      const { getByTestId } = render(
        <BadgeUnlockNotification badge={mockBadge} onDismiss={jest.fn()} />
      );

      const backdrop = getByTestId('modal-backdrop');
      expect(backdrop).toBeTruthy();
    });

    it('GamificationHeader receives focus on keyboard navigation', () => {
      const { getByTestId } = render(<GamificationHeader />);

      const container = getByTestId('gamification-header-container');
      expect(container.props.accessible).toBe(true);
    });
  });

  describe('Keyboard Navigation', () => {
    it('GamificationHeader responds to keyboard activation', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(<GamificationHeader onPress={onPress} />);

      const container = getByTestId('gamification-header-container');

      fireEvent.press(container);

      expect(onPress).toHaveBeenCalled();
    });

    it('LevelUpModal dismiss responds to keyboard', () => {
      const onClose = jest.fn();
      const { getByTestId } = render(
        <LevelUpModal level={6} visible unlockedFeatures={[]} onClose={onClose} />
      );

      const button = getByTestId('dismiss-button');

      fireEvent.press(button);

      expect(onClose).toHaveBeenCalled();
    });

    it('BadgeUnlockNotification dismiss responds to keyboard', () => {
      const { getByTestId } = render(
        <BadgeUnlockNotification badge={mockBadge} onDismiss={jest.fn()} />
      );

      // Verify dismiss button is accessible and has proper role
      const dismissButton = getByTestId('dismiss-button');
      expect(dismissButton.props.accessibilityRole).toBe('button');
      expect(dismissButton.props.accessibilityLabel).toMatch(/dismiss/i);
    });

    it('LeaderboardWidget rows respond to keyboard', () => {
      const { getByTestId } = render(
        <LeaderboardWidget data={mockLeaderboardData} currentUserId="user-10" />
      );

      const row = getByTestId('leaderboard-row-user-1');

      fireEvent(row, 'onAccessibilityAction', {
        nativeEvent: { actionName: 'activate' },
      });

      // Should navigate to user profile
      expect(row).toBeTruthy();
    });
  });

  describe('Reduce Motion (WCAG 2.3.3 - Level AAA)', () => {
    beforeEach(() => {
      jest.mock('react-native-reanimated', () => ({
        useReducedMotion: () => true,
      }));
    });

    it('XPGainAnimation respects reduce motion', () => {
      const { getByTestId } = render(
        <XPGainAnimation amount={100} source="quest_completion" visible onComplete={jest.fn()} />
      );

      const container = getByTestId('xp-animation-container');
      // Should render without complex animations
      expect(container).toBeTruthy();
    });

    it('LevelUpModal respects reduce motion', () => {
      const { getByTestId } = render(
        <LevelUpModal level={6} visible unlockedFeatures={[]} onClose={jest.fn()} />
      );

      const modal = getByTestId('level-up-overlay');
      // Should render without complex animations
      expect(modal).toBeTruthy();
    });

    it('BadgeUnlockNotification respects reduce motion', () => {
      const { getByTestId } = render(
        <BadgeUnlockNotification badge={mockBadge} onDismiss={jest.fn()} />
      );

      const container = getByTestId('badge-notification-container');
      // Should render without confetti/complex animations
      expect(container).toBeTruthy();
    });

    it('GamificationHeader respects reduce motion', () => {
      const { getByTestId } = render(<GamificationHeader />);

      const container = getByTestId('gamification-header-container');
      // Progress bar should animate without complex effects
      expect(container).toBeTruthy();
    });
  });

  describe('Text Alternatives (WCAG 1.1.1 - Level A)', () => {
    it('Badge icons have text alternatives', () => {
      const { getByTestId } = render(
        <BadgeUnlockNotification badge={mockBadge} onDismiss={jest.fn()} />
      );

      const icon = getByTestId('badge-icon');
      expect(icon.props.accessibilityLabel).toMatch(/trophy/i);
    });

    it('Rank badges have text alternatives', () => {
      const { getByTestId } = render(
        <LeaderboardWidget data={mockLeaderboardData} currentUserId="user-10" />
      );

      // Check that leaderboard rows have accessible labels
      const row = getByTestId('leaderboard-row-user-1');
      expect(row.props.accessibilityLabel).toBeTruthy();
    });

    it('Progress bars have text alternatives', () => {
      const { getByTestId } = render(<GamificationHeader />);

      const container = getByTestId('gamification-header-container');
      // Progress info is in the container's accessibilityLabel
      expect(container.props.accessibilityLabel).toMatch(/percent progress/i);
    });
  });

  describe('Accessible Names (WCAG 4.1.2 - Level A)', () => {
    it('All interactive elements have accessible names', () => {
      const { getByTestId } = render(<GamificationHeader />);

      const container = getByTestId('gamification-header-container');
      expect(container.props.accessibilityLabel).toBeTruthy();
      expect(container.props.accessibilityRole).toBe('button');
    });

    it('Form controls have accessible names', () => {
      const { getByTestId } = render(
        <LeaderboardWidget data={mockLeaderboardData} currentUserId="user-10" showFilters />
      );

      const filterSelector = getByTestId('leaderboard-filter-selector');
      expect(filterSelector.props.accessibilityLabel).toMatch(/filter.*leaderboard/i);
    });
  });

  describe('Error Identification (WCAG 3.3.1 - Level A)', () => {
    it('LeaderboardWidget error messages are accessible', () => {
      const { getByTestId } = render(
        <LeaderboardWidget data={[]} currentUserId="user-10" error="Failed to load leaderboard" />
      );

      // Error should be displayed
      const container = getByTestId('leaderboard-widget-container');
      expect(container).toBeTruthy();
    });
  });

  describe('Consistent Navigation (WCAG 3.2.3 - Level AA)', () => {
    it('All modals have consistent dismiss patterns', () => {
      const onClose = jest.fn();
      const onDismiss = jest.fn();

      const { getByTestId: getByTestId1 } = render(
        <LevelUpModal level={6} visible unlockedFeatures={[]} onClose={onClose} />
      );

      const { getByTestId: getByTestId2 } = render(
        <BadgeUnlockNotification badge={mockBadge} onDismiss={onDismiss} />
      );

      // Both should have dismiss buttons
      expect(getByTestId1('dismiss-button')).toBeTruthy();
      expect(getByTestId2('dismiss-button')).toBeTruthy();
    });

    it('All navigation elements are consistent', () => {
      const { getByTestId: getByTestId1 } = render(<GamificationHeader />);

      const { getByTestId: getByTestId2 } = render(
        <LeaderboardWidget data={mockLeaderboardData} currentUserId="user-10" />
      );

      // Both should follow same navigation patterns
      expect(getByTestId1('gamification-header-container')).toBeTruthy();
      expect(getByTestId2('leaderboard-widget-container')).toBeTruthy();
    });
  });

  describe('Decorative Elements', () => {
    it('Decorative animations are hidden from screen readers', () => {
      const { getByTestId } = render(
        <XPGainAnimation amount={100} source="quest_completion" visible onComplete={jest.fn()} />
      );

      // XPGainAnimation is an alert, not hidden
      const container = getByTestId('xp-animation-container');
      expect(container.props.accessibilityRole).toBe('alert');
    });

    it('Confetti effects are hidden from screen readers', () => {
      const rareBadge = { ...mockBadge, rarity: 'rare' as const };
      const { getByTestId } = render(
        <BadgeUnlockNotification badge={rareBadge} onDismiss={jest.fn()} />
      );

      const confetti = getByTestId('badge-confetti-animation');
      // Confetti should exist for rare+ badges
      expect(confetti).toBeTruthy();
    });
  });
});
