import { setAccessibilityFocus, isScreenReaderEnabled, isReduceMotionEnabled } from '@/lib/accessibility/focus';
import { AccessibilityInfo } from 'react-native';

// Mock AccessibilityInfo
jest.mock('react-native', () => ({
  AccessibilityInfo: {
    isScreenReaderEnabled: jest.fn(() => Promise.resolve(false)),
    isReduceMotionEnabled: jest.fn(() => Promise.resolve(false)),
    setAccessibilityFocus: jest.fn(),
    announceForAccessibility: jest.fn(),
  },
  findNodeHandle: jest.fn((ref) => (ref ? 123 : null)),
}));

describe('Accessibility Focus Helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sets accessibility focus when ref is valid', () => {
    const mockRef = { current: {} };
    setAccessibilityFocus(mockRef);

    expect(AccessibilityInfo.setAccessibilityFocus).toHaveBeenCalledWith(123);
  });

  it('does not call setAccessibilityFocus when ref is null', () => {
    const findNodeHandle = require('react-native').findNodeHandle;
    findNodeHandle.mockReturnValueOnce(null);

    setAccessibilityFocus(null);

    expect(AccessibilityInfo.setAccessibilityFocus).not.toHaveBeenCalled();
  });

  it('checks if screen reader is enabled', async () => {
    const result = await isScreenReaderEnabled();
    expect(typeof result).toBe('boolean');
    expect(AccessibilityInfo.isScreenReaderEnabled).toHaveBeenCalled();
  });

  it('checks if reduce motion is enabled', async () => {
    const result = await isReduceMotionEnabled();
    expect(typeof result).toBe('boolean');
    expect(AccessibilityInfo.isReduceMotionEnabled).toHaveBeenCalled();
  });
});
