import { announceForAccessibility } from '@/lib/accessibility/announcements';

describe('Accessibility Announcements', () => {
  it('calls AccessibilityInfo.announceForAccessibility with the message', () => {
    const message = 'Test announcement';
    
    // Mock is already set up in jest.setup.js
    announceForAccessibility(message);
    
    // Verify the mock was called
    const AccessibilityInfo = require('react-native').AccessibilityInfo;
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(message);
  });

  it('handles empty messages gracefully', () => {
    announceForAccessibility('');
    
    const AccessibilityInfo = require('react-native').AccessibilityInfo;
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('');
  });
});
