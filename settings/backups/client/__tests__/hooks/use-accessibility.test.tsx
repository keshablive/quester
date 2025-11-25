/**
 * Tests for useAccessibility hook and utilities
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ReactNode } from 'react';

import {
  useScreenReader,
  useFontScale,
  useReduceMotion,
  useHighContrast,
  AccessibilityProvider,
  useAccessibility,
  formatAccessibleNumber,
  formatAccessibleDate,
  formatAccessibleTime,
} from '@/lib/hooks/use-accessibility';

describe('useAccessibility Hook Tests (T103)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();

    // Setup spies
    jest.spyOn(AccessibilityInfo, 'isScreenReaderEnabled').mockResolvedValue(false);
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    jest.spyOn(AccessibilityInfo, 'addEventListener').mockReturnValue({ remove: jest.fn() });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('useScreenReader', () => {
    it('should detect screen reader enabled state', async () => {
      jest.spyOn(AccessibilityInfo, 'isScreenReaderEnabled').mockResolvedValue(true);
      jest.spyOn(AccessibilityInfo, 'addEventListener').mockReturnValue({ remove: jest.fn() });

      const { result } = renderHook(() => useScreenReader());

      await waitFor(() => {
        expect(result.current.isScreenReaderEnabled).toBe(true);
      });
    });

    it('should detect screen reader disabled state', async () => {
      jest.spyOn(AccessibilityInfo, 'isScreenReaderEnabled').mockResolvedValue(false);
      jest.spyOn(AccessibilityInfo, 'addEventListener').mockReturnValue({ remove: jest.fn() });

      const { result } = renderHook(() => useScreenReader());

      await waitFor(() => {
        expect(result.current.isScreenReaderEnabled).toBe(false);
      });
    });

    it('should provide announceForAccessibility function', async () => {
      jest.spyOn(AccessibilityInfo, 'isScreenReaderEnabled').mockResolvedValue(true);
      jest.spyOn(AccessibilityInfo, 'addEventListener').mockReturnValue({ remove: jest.fn() });
      const announceSpy = jest
        .spyOn(AccessibilityInfo, 'announceForAccessibility')
        .mockImplementation(() => {});

      const { result } = renderHook(() => useScreenReader());

      await waitFor(() => {
        expect(result.current.isScreenReaderEnabled).toBe(true);
      });

      act(() => {
        result.current.announceForAccessibility('Test announcement');
      });

      expect(announceSpy).toHaveBeenCalledWith('Test announcement');
    });

    it('should listen for screen reader changes', async () => {
      let changeHandler: ((enabled: boolean) => void) | null = null;

      jest.spyOn(AccessibilityInfo, 'isScreenReaderEnabled').mockResolvedValue(false);
      jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation((event, handler) => {
        if (event === 'screenReaderChanged') {
          changeHandler = handler;
        }
        return { remove: jest.fn() };
      });

      const { result } = renderHook(() => useScreenReader());

      await waitFor(() => {
        expect(result.current.isScreenReaderEnabled).toBe(false);
      });

      // Simulate screen reader being enabled
      act(() => {
        changeHandler?.(true);
      });

      expect(result.current.isScreenReaderEnabled).toBe(true);
    });
  });
  describe('useFontScale', () => {
    it('should return system font scale by default', () => {
      const { result } = renderHook(() => useFontScale());

      // System font scale from useWindowDimensions (can vary)
      expect(result.current.fontScale).toBeGreaterThan(0);
    });
    it('should allow setting font scale override', async () => {
      const { result } = renderHook(() => useFontScale());

      await act(async () => {
        await result.current.setFontScaleOverride(1.5);
      });

      expect(result.current.fontScale).toBe(1.5);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@accessibility/font_scale_override',
        '1.5'
      );
    });

    it('should persist font scale override', async () => {
      // Set initial override
      await AsyncStorage.setItem('@accessibility/font_scale_override', '1.3');

      const { result } = renderHook(() => useFontScale());

      await waitFor(() => {
        expect(result.current.fontScale).toBe(1.3);
      });
    });

    it('should clear font scale override when set to null', async () => {
      const { result } = renderHook(() => useFontScale());

      // Set override
      await act(async () => {
        await result.current.setFontScaleOverride(1.5);
      });

      expect(result.current.fontScale).toBe(1.5);

      // Clear override
      await act(async () => {
        await result.current.setFontScaleOverride(null);
      });
      expect(result.current.fontScale).toBeGreaterThan(0); // Back to system default
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@accessibility/font_scale_override');
    });
  });

  describe('useReduceMotion', () => {
    it('should detect reduce motion system preference', async () => {
      (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValue(true);
      (AccessibilityInfo.addEventListener as jest.Mock).mockReturnValue({ remove: jest.fn() });

      const { result } = renderHook(() => useReduceMotion());

      await waitFor(() => {
        expect(result.current.prefersReducedMotion).toBe(true);
      });
    });

    it('should allow setting reduce motion override', async () => {
      (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValue(false);
      (AccessibilityInfo.addEventListener as jest.Mock).mockReturnValue({ remove: jest.fn() });

      const { result } = renderHook(() => useReduceMotion());

      await act(async () => {
        await result.current.setPrefersReducedMotionOverride(true);
      });

      expect(result.current.prefersReducedMotion).toBe(true);
    });

    it('should listen for reduce motion changes', async () => {
      let changeHandler: ((enabled: boolean) => void) | null = null;

      (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValue(false);
      (AccessibilityInfo.addEventListener as jest.Mock).mockImplementation((event, handler) => {
        if (event === 'reduceMotionChanged') {
          changeHandler = handler;
        }
        return { remove: jest.fn() };
      });

      const { result } = renderHook(() => useReduceMotion());

      await waitFor(() => {
        expect(result.current.prefersReducedMotion).toBe(false);
      });

      // Simulate reduce motion being enabled
      act(() => {
        changeHandler?.(true);
      });

      expect(result.current.prefersReducedMotion).toBe(true);
    });
  });

  describe('useHighContrast', () => {
    it('should default to false', async () => {
      const { result } = renderHook(() => useHighContrast());

      await waitFor(() => {
        expect(result.current.prefersHighContrast).toBe(false);
      });
    });

    it('should allow setting high contrast preference', async () => {
      const { result } = renderHook(() => useHighContrast());

      await act(async () => {
        await result.current.setPrefersHighContrastOverride(true);
      });

      expect(result.current.prefersHighContrast).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@accessibility/high_contrast_override',
        'true'
      );
    });

    it('should persist high contrast preference', async () => {
      await AsyncStorage.setItem('@accessibility/high_contrast_override', 'true');

      const { result } = renderHook(() => useHighContrast());

      await waitFor(() => {
        expect(result.current.prefersHighContrast).toBe(true);
      });
    });
  });

  describe('AccessibilityProvider', () => {
    it('should provide accessibility context', async () => {
      (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockResolvedValue(true);
      (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValue(false);
      (AccessibilityInfo.addEventListener as jest.Mock).mockReturnValue({ remove: jest.fn() });

      const wrapper = ({ children }: { children: ReactNode }) => (
        <AccessibilityProvider>{children}</AccessibilityProvider>
      );

      const { result } = renderHook(() => useAccessibility(), { wrapper });

      await waitFor(() => {
        expect(result.current.isScreenReaderEnabled).toBe(true);
      });

      expect(result.current.prefersReducedMotion).toBe(false);
      expect(result.current.fontScale).toBeGreaterThan(0);
    });

    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const originalError = console.error;
      console.error = jest.fn();

      expect(() => {
        renderHook(() => useAccessibility());
      }).toThrow('useAccessibility must be used within AccessibilityProvider');

      console.error = originalError;
    });

    it('should provide getAccessibilityLabel utility', async () => {
      (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockResolvedValue(true);
      (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValue(false);
      (AccessibilityInfo.addEventListener as jest.Mock).mockReturnValue({ remove: jest.fn() });

      const wrapper = ({ children }: { children: ReactNode }) => (
        <AccessibilityProvider>{children}</AccessibilityProvider>
      );

      const { result } = renderHook(() => useAccessibility(), { wrapper });

      const label = result.current.getAccessibilityLabel('Submit', 'Tap to submit form');
      expect(label).toBe('Submit. Tap to submit form');

      const labelWithoutHint = result.current.getAccessibilityLabel('Cancel');
      expect(labelWithoutHint).toBe('Cancel');
    });
  });

  describe('formatAccessibleNumber', () => {
    it('should format small numbers', () => {
      expect(formatAccessibleNumber(42)).toBe('42');
      expect(formatAccessibleNumber(999)).toBe('999');
    });

    it('should format thousands', () => {
      expect(formatAccessibleNumber(1000)).toBe('1 thousand');
      expect(formatAccessibleNumber(1234)).toBe('1 thousand 234');
      expect(formatAccessibleNumber(5000)).toBe('5 thousand');
    });

    it('should format millions', () => {
      expect(formatAccessibleNumber(1000000)).toBe('1 million');
      expect(formatAccessibleNumber(1234000)).toBe('1 million 234 thousand');
      expect(formatAccessibleNumber(5000000)).toBe('5 million');
    });
  });

  describe('formatAccessibleDate', () => {
    it('should format date with full weekday and month names', () => {
      const date = new Date('2025-01-15');
      const formatted = formatAccessibleDate(date);

      expect(formatted).toContain('January');
      expect(formatted).toContain('15');
      expect(formatted).toContain('2025');
    });
  });

  describe('formatAccessibleTime', () => {
    it('should format morning time', () => {
      const date = new Date('2025-01-15T09:30:00');
      const formatted = formatAccessibleTime(date);

      expect(formatted).toBe('9:30 AM');
    });

    it('should format afternoon time', () => {
      const date = new Date('2025-01-15T14:30:00');
      const formatted = formatAccessibleTime(date);

      expect(formatted).toBe('2:30 PM');
    });

    it('should format midnight', () => {
      const date = new Date('2025-01-15T00:00:00');
      const formatted = formatAccessibleTime(date);

      expect(formatted).toBe('12:00 AM');
    });

    it('should format noon', () => {
      const date = new Date('2025-01-15T12:00:00');
      const formatted = formatAccessibleTime(date);

      expect(formatted).toBe('12:00 PM');
    });
  });

  describe('Integration Tests', () => {
    it('should handle all accessibility preferences together', async () => {
      (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockResolvedValue(true);
      (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValue(true);
      (AccessibilityInfo.addEventListener as jest.Mock).mockReturnValue({ remove: jest.fn() });

      const wrapper = ({ children }: { children: ReactNode }) => (
        <AccessibilityProvider>{children}</AccessibilityProvider>
      );

      const { result } = renderHook(() => useAccessibility(), { wrapper });

      await waitFor(() => {
        expect(result.current.isScreenReaderEnabled).toBe(true);
        expect(result.current.prefersReducedMotion).toBe(true);
      });

      // Set font scale override
      await act(async () => {
        await result.current.setFontScaleOverride(1.5);
      });

      expect(result.current.fontScale).toBe(1.5);

      // Set high contrast
      await act(async () => {
        await result.current.setPrefersHighContrastOverride(true);
      });

      expect(result.current.prefersHighContrast).toBe(true);
    });

    it('should announce for accessibility', async () => {
      (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockResolvedValue(true);
      (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValue(false);
      (AccessibilityInfo.addEventListener as jest.Mock).mockReturnValue({ remove: jest.fn() });

      const wrapper = ({ children }: { children: ReactNode }) => (
        <AccessibilityProvider>{children}</AccessibilityProvider>
      );

      const { result } = renderHook(() => useAccessibility(), { wrapper });

      await waitFor(() => {
        expect(result.current.isScreenReaderEnabled).toBe(true);
      });

      act(() => {
        result.current.announceForAccessibility('Form submitted successfully');
      });

      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
        'Form submitted successfully'
      );
    });
  });
});
