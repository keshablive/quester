/**
 * useGamificationFeedback Hook Tests
 *
 * Tests the current implementation of the gamification feedback hook
 * which provides XP award animations, level-up modals, and accessibility announcements
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useGamificationFeedback } from '@/lib/hooks/use-gamification-feedback';

// Mock the gamification context
const mockIncrementPoints = jest.fn(() => Promise.resolve());
const mockRefresh = jest.fn(() => Promise.resolve());
const mockMetrics = { points: 0, level: 1, rank: 'Novice' };

jest.mock('@/lib/contexts/gamification-context', () => ({
  useGamification: jest.fn(() => ({
    incrementPoints: mockIncrementPoints,
    refresh: mockRefresh,
    metrics: mockMetrics,
  })),
}));

// Mock accessibility hook
const mockAnnounceForAccessibility = jest.fn();

jest.mock('@/lib/hooks/use-accessibility', () => ({
  useAccessibility: jest.fn(() => ({
    announceForAccessibility: mockAnnounceForAccessibility,
  })),
}));

describe('useGamificationFeedback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockMetrics.points = 0;
    mockMetrics.level = 1;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initialization', () => {
    it('initializes with default values', () => {
      const { result } = renderHook(() => useGamificationFeedback());

      expect(result.current.activeXPAnimation).toBeNull();
      expect(result.current.showLevelUpModal).toBe(false);
      expect(result.current.levelUpInfo).toBeNull();
    });

    it('provides all required methods', () => {
      const { result } = renderHook(() => useGamificationFeedback());

      expect(typeof result.current.awardXP).toBe('function');
      expect(typeof result.current.dismissXPAnimation).toBe('function');
      expect(typeof result.current.dismissLevelUpModal).toBe('function');
    });
  });

  describe('XP Award', () => {
    it('awards XP and shows animation', async () => {
      const { result } = renderHook(() => useGamificationFeedback());

      await act(async () => {
        result.current.awardXP(50, 'quest_completion');
        await jest.runOnlyPendingTimersAsync();
      });

      await waitFor(() => {
        expect(result.current.activeXPAnimation).toEqual({
          amount: 50,
          source: 'quest_completion',
        });
      });
    });

    it('calls incrementPoints with correct amount', async () => {
      const { result } = renderHook(() => useGamificationFeedback());

      await act(async () => {
        result.current.awardXP(100, 'course_completion');
        await jest.runOnlyPendingTimersAsync();
      });

      await waitFor(() => {
        expect(mockIncrementPoints).toHaveBeenCalledWith(100);
      });
    });

    it('announces XP gain for screen readers', async () => {
      const { result } = renderHook(() => useGamificationFeedback());

      await act(async () => {
        result.current.awardXP(25, 'daily_login');
        await jest.runOnlyPendingTimersAsync();
      });

      await waitFor(() => {
        expect(mockAnnounceForAccessibility).toHaveBeenCalledWith(
          expect.stringContaining('25 experience points')
        );
      });
    });

    it('ignores zero or negative amounts', async () => {
      const { result } = renderHook(() => useGamificationFeedback());

      await act(async () => {
        result.current.awardXP(0, 'other');
        result.current.awardXP(-10, 'other');
        await jest.runOnlyPendingTimersAsync();
      });

      expect(mockIncrementPoints).not.toHaveBeenCalled();
      expect(result.current.activeXPAnimation).toBeNull();
    });

    it('queues multiple XP awards', async () => {
      const { result } = renderHook(() => useGamificationFeedback());

      await act(async () => {
        result.current.awardXP(10, 'social_interaction');
        result.current.awardXP(20, 'marketplace_purchase');
        result.current.awardXP(30, 'quest_completion');
        await jest.runOnlyPendingTimersAsync();
      });

      // Should process first award
      await waitFor(() => {
        expect(mockIncrementPoints).toHaveBeenCalledWith(10);
      });
    });
  });

  describe('Level Up Detection', () => {
    it('shows level-up modal when crossing level threshold', async () => {
      mockMetrics.points = 95; // Close to level 2 (100 points)

      const { result } = renderHook(() => useGamificationFeedback());

      await act(async () => {
        result.current.awardXP(10, 'quest_completion'); // Will hit 105 points = level 2
        await jest.runOnlyPendingTimersAsync();
      });

      await waitFor(() => {
        expect(result.current.showLevelUpModal).toBe(true);
        expect(result.current.levelUpInfo).toEqual({
          level: 2,
          unlockedFeatures: ['Basic Badges'],
        });
      });
    });

    it('announces level-up for screen readers', async () => {
      mockMetrics.points = 95;

      const { result } = renderHook(() => useGamificationFeedback());

      await act(async () => {
        result.current.awardXP(10, 'quest_completion');
        await jest.runOnlyPendingTimersAsync();
      });

      await waitFor(() => {
        expect(mockAnnounceForAccessibility).toHaveBeenCalledWith(
          expect.stringContaining('level 2')
        );
      });
    });

    it('does not show level-up modal when not crossing threshold', async () => {
      mockMetrics.points = 50;

      const { result } = renderHook(() => useGamificationFeedback());

      await act(async () => {
        result.current.awardXP(10, 'quest_completion');
        await jest.runOnlyPendingTimersAsync();
      });

      await waitFor(() => {
        expect(result.current.showLevelUpModal).toBe(false);
        expect(result.current.levelUpInfo).toBeNull();
      });
    });
  });

  describe('Animation Dismissal', () => {
    it('dismisses XP animation', async () => {
      const { result } = renderHook(() => useGamificationFeedback());

      await act(async () => {
        result.current.awardXP(50, 'quest_completion');
        await jest.runOnlyPendingTimersAsync();
      });

      await waitFor(() => {
        expect(result.current.activeXPAnimation).not.toBeNull();
      });

      await act(async () => {
        result.current.dismissXPAnimation();
        await jest.advanceTimersByTimeAsync(100);
      });

      expect(result.current.activeXPAnimation).toBeNull();
    });

    it('dismisses level-up modal', async () => {
      mockMetrics.points = 95;

      const { result } = renderHook(() => useGamificationFeedback());

      await act(async () => {
        result.current.awardXP(10, 'quest_completion');
        await jest.runOnlyPendingTimersAsync();
      });

      await waitFor(() => {
        expect(result.current.showLevelUpModal).toBe(true);
      });

      act(() => {
        result.current.dismissLevelUpModal();
      });

      expect(result.current.showLevelUpModal).toBe(false);
      expect(result.current.levelUpInfo).toBeNull();
    });
  });

  describe('XP Sources', () => {
    it('handles quest_completion source', async () => {
      const { result } = renderHook(() => useGamificationFeedback());

      await act(async () => {
        result.current.awardXP(50, 'quest_completion');
        await jest.runOnlyPendingTimersAsync();
      });

      await waitFor(() => {
        expect(result.current.activeXPAnimation?.source).toBe('quest_completion');
      });
    });

    it('handles course_completion source', async () => {
      const { result } = renderHook(() => useGamificationFeedback());

      await act(async () => {
        result.current.awardXP(100, 'course_completion');
        await jest.runOnlyPendingTimersAsync();
      });

      await waitFor(() => {
        expect(result.current.activeXPAnimation?.source).toBe('course_completion');
      });
    });

    it('handles daily_login source', async () => {
      const { result } = renderHook(() => useGamificationFeedback());

      await act(async () => {
        result.current.awardXP(10, 'daily_login');
        await jest.runOnlyPendingTimersAsync();
      });

      await waitFor(() => {
        expect(result.current.activeXPAnimation?.source).toBe('daily_login');
      });
    });

    it('handles social_interaction source', async () => {
      const { result } = renderHook(() => useGamificationFeedback());

      await act(async () => {
        result.current.awardXP(5, 'social_interaction');
        await jest.runOnlyPendingTimersAsync();
      });

      await waitFor(() => {
        expect(result.current.activeXPAnimation?.source).toBe('social_interaction');
      });
    });

    it('handles marketplace_purchase source', async () => {
      const { result } = renderHook(() => useGamificationFeedback());

      await act(async () => {
        result.current.awardXP(20, 'marketplace_purchase');
        await jest.runOnlyPendingTimersAsync();
      });

      await waitFor(() => {
        expect(result.current.activeXPAnimation?.source).toBe('marketplace_purchase');
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles rapid successive XP awards', async () => {
      const { result } = renderHook(() => useGamificationFeedback());

      await act(async () => {
        for (let i = 0; i < 10; i++) {
          result.current.awardXP(5, 'other');
        }
        await jest.runOnlyPendingTimersAsync();
      });

      // Should process at least the first award
      await waitFor(() => {
        expect(mockIncrementPoints).toHaveBeenCalled();
      });
    });

    it('refreshes metrics after awarding XP', async () => {
      const { result } = renderHook(() => useGamificationFeedback());

      await act(async () => {
        result.current.awardXP(50, 'quest_completion');
        await jest.runOnlyPendingTimersAsync();
      });

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled();
      });
    });
  });
});
