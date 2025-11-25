# Accessibility Testing Guide

**Version**: 1.0  
**Last Updated**: November 14, 2025  
**WCAG Standard**: 2.1 Level AA

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Automated Testing](#automated-testing)
4. [Manual Testing Procedures](#manual-testing-procedures)
5. [Screen Reader Testing](#screen-reader-testing)
6. [Keyboard Navigation Testing](#keyboard-navigation-testing)
7. [Visual Testing](#visual-testing)
8. [Common Issues and Fixes](#common-issues-and-fixes)
9. [WCAG 2.1 Level AA Compliance Checklist](#wcag-21-level-aa-compliance-checklist)
10. [Resources](#resources)

---

## Overview

This guide provides comprehensive instructions for testing the accessibility of the Quester application. Our goal is to achieve **WCAG 2.1 Level AA compliance** across all features and platforms (iOS, Android, Web).

### Accessibility Standards

- **WCAG 2.1 Level AA**: Industry standard for web and mobile accessibility
- **Platform Guidelines**:
  - iOS: Human Interface Guidelines - Accessibility
  - Android: Material Design - Accessibility
  - Web: WAI-ARIA Authoring Practices

### Testing Scope

- ✅ Screen reader compatibility (TalkBack, VoiceOver)
- ✅ Keyboard navigation (web platform)
- ✅ Color contrast (4.5:1 for normal text, 3:1 for large text)
- ✅ Touch target sizes (44x44pt minimum)
- ✅ Form accessibility (labels, error messages)
- ✅ Dynamic content announcements
- ✅ Focus management
- ✅ Text scaling support (up to 200%)
- ✅ High contrast mode support
- ✅ Reduced motion support

---

## Quick Start

### Prerequisites

```bash
# Install dependencies
cd client
npm install

# Ensure test environment is set up
npm run test:setup
```

### Run All Accessibility Tests

```bash
# Run automated test suite
npm test -- __tests__/accessibility/

# Run specific test suites
npm test -- __tests__/accessibility/color-contrast.test.ts
npm test -- __tests__/accessibility/touch-targets.test.tsx
npm test -- __tests__/accessibility/screen-reader-navigation.test.tsx
npm test -- __tests__/accessibility/keyboard-navigation.test.ts
npm test -- __tests__/accessibility/form-accessibility.test.tsx
```

### Expected Results

- ✅ All 132 tests should pass
- ⚠️ Warning messages document known accessibility improvements needed
- ❌ Any failures require immediate attention

---

## Automated Testing

### Test Suites Overview

| Test Suite | File | Tests | Coverage |
|------------|------|-------|----------|
| Color Contrast | `color-contrast.test.ts` | 25 | Verify WCAG AA color ratios (4.5:1, 3:1) |
| Touch Targets | `touch-targets.test.tsx` | 18 | Ensure 44x44pt minimum size |
| Screen Reader | `screen-reader-navigation.test.tsx` | 22 | Validate accessibility labels and roles |
| Keyboard Nav | `keyboard-navigation.test.ts` | 20 | Test tab order and focus management |
| Form Accessibility | `form-accessibility.test.tsx` | 27 | Verify label associations, error announcements |
| Hook Testing | `use-accessibility.test.tsx` | 20 | Test accessibility utilities |

### Running Tests

```bash
# All accessibility tests
npm test -- __tests__/accessibility/

# Watch mode for development
npm test -- __tests__/accessibility/ --watch

# Generate coverage report
npm test -- __tests__/accessibility/ --coverage

# Silent mode (summary only)
npm test -- __tests__/accessibility/ --silent
```

### Interpreting Results

**Passing Test**:
```
✓ should meet WCAG AA standards for primary button (5 ms)
```

**Documented Warning** (Expected):
```
console.warn
  Touch targets needing adjustment:
  Small Chip: 32x32px (needs to be 44x44px)
```
→ These are documented improvements, not critical failures.

**Failure** (Requires Fix):
```
✕ should have sufficient contrast for text on background
  Expected: 4.5
  Received: 3.2
```
→ This must be fixed before release.

---

## Manual Testing Procedures

### General Testing Workflow

1. **Enable Accessibility Features**
   - Turn on screen reader (TalkBack/VoiceOver)
   - Enable high contrast mode
   - Set text size to 200%
   - Enable reduce motion (if testing animations)

2. **Navigate Through App**
   - Start from home screen
   - Navigate to each feature area
   - Complete common workflows

3. **Document Findings**
   - Take screenshots/recordings
   - Note any issues with context
   - Rate severity (Critical, High, Medium, Low)

4. **Verify Fixes**
   - Re-test after implementing fixes
   - Update documentation

### Testing Checklist

#### Navigation
- [ ] Bottom tab bar is fully accessible
- [ ] Quick actions menu can be navigated
- [ ] Feature discovery carousel works with screen reader
- [ ] Global search can be operated without sight
- [ ] Back navigation announces correctly

#### Authentication
- [ ] Sign in form has proper labels
- [ ] Password visibility toggle announces state
- [ ] Validation errors are announced
- [ ] Loading states are announced
- [ ] 2FA flow is fully accessible

#### Gamification
- [ ] XP gains are announced
- [ ] Level-ups are announced with details
- [ ] Badge notifications are accessible
- [ ] Leaderboard can be navigated
- [ ] Progress indicators announce percentage

#### Forms
- [ ] All inputs have associated labels
- [ ] Required fields are identified
- [ ] Error messages are announced
- [ ] Validation works with screen reader
- [ ] Submit buttons are clearly labeled

#### Dynamic Content
- [ ] Notifications announce when received
- [ ] Loading states are announced
- [ ] Error messages are announced
- [ ] Success messages are announced
- [ ] Modal appearances are announced

---

## Screen Reader Testing

### TalkBack Testing (Android)

#### Setup

1. **Enable TalkBack**:
   ```
   Settings > Accessibility > TalkBack > Toggle On
   ```
   
2. **TalkBack Shortcuts**:
   - Swipe right: Next element
   - Swipe left: Previous element
   - Double tap: Activate element
   - Two finger swipe down: Read from top
   - Two finger swipe right: Read from current position
   - Swipe up then down: First element
   - Swipe down then up: Last element

3. **Volume Keys**:
   - Both volume keys: Pause/resume TalkBack
   - Volume up + down: TalkBack settings

#### Testing Procedure

1. **Navigation Test**:
   ```
   1. Launch app
   2. Swipe right through all elements on home screen
   3. Verify each element announces correctly:
      - Role (button, heading, link, etc.)
      - Label (descriptive name)
      - State (selected, disabled, etc.)
      - Hint (optional, what happens when activated)
   ```

2. **Interaction Test**:
   ```
   1. Navigate to a button
   2. Double tap to activate
   3. Verify action occurs
   4. Verify success/error is announced
   ```

3. **Form Test**:
   ```
   1. Navigate to sign-in form
   2. Verify input labels are announced
   3. Enter text (TalkBack keyboard)
   4. Verify error messages are announced
   5. Submit form and verify loading announcement
   ```

4. **Dynamic Content Test**:
   ```
   1. Gain XP (complete an action)
   2. Verify announcement: "You gained X experience points..."
   3. Level up
   4. Verify announcement: "Congratulations! You reached level X..."
   ```

#### Expected Announcements

| Element | Expected Announcement |
|---------|----------------------|
| Home tab | "Home, tab, 1 of 4" |
| Primary button | "Sign in, button" |
| Text input | "Email address, edit box" |
| Checkbox (unchecked) | "Remember me, checkbox, not checked" |
| Checkbox (checked) | "Remember me, checkbox, checked" |
| Loading state | "Signing in, please wait" |
| Error message | "Error: Email and password are required" |
| Success notification | "New notification: Badge earned. You earned the Quick Learner badge" |

### VoiceOver Testing (iOS)

#### Setup

1. **Enable VoiceOver**:
   ```
   Settings > Accessibility > VoiceOver > Toggle On
   ```
   
   Or use Siri: "Hey Siri, turn on VoiceOver"

2. **VoiceOver Gestures**:
   - Swipe right: Next element
   - Swipe left: Previous element
   - Double tap: Activate element
   - Two finger swipe up: Read all from top
   - Two finger swipe down: Read all from current position
   - Three finger swipe left/right: Navigate pages
   - Rotor: Two finger rotation (adjust navigation mode)

3. **Rotor Settings**:
   - Enable: Headings, Links, Buttons, Form Controls, Landmarks

#### Testing Procedure

1. **Rotor Navigation Test**:
   ```
   1. Open rotor (two finger rotation)
   2. Select "Headings"
   3. Swipe down to navigate between headings
   4. Verify all section headings are accessible
   ```

2. **Button Test**:
   ```
   1. Open rotor
   2. Select "Buttons"
   3. Swipe down to jump between buttons
   4. Verify all buttons have clear labels
   ```

3. **Form Controls Test**:
   ```
   1. Open rotor
   2. Select "Form Controls"
   3. Swipe down to navigate inputs
   4. Verify label association works
   ```

4. **Trait Verification**:
   ```
   For each element, verify VoiceOver announces:
   - Element label
   - Element trait (button, heading, selected, etc.)
   - Hint (if provided)
   - Value (for inputs, sliders)
   ```

#### Expected Announcements

| Element | Expected Announcement |
|---------|----------------------|
| Screen title | "Home, heading" |
| Tab button | "Home, tab, 1 of 4, selected" |
| Action button | "Sign in, button" |
| Text field | "Email, text field" |
| Toggle switch | "Remember me, switch, on" |
| Progress bar | "Loading, progress, 50 percent" |
| Alert | "Error, Invalid email or password" |

---

## Keyboard Navigation Testing

**Platform**: Web only (Expo Web builds)

### Setup

1. Build web version:
   ```bash
   cd client
   npm run web
   ```

2. Open in browser: `http://localhost:8081`

3. Ensure focus indicators are visible (CSS `:focus-visible`)

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Tab | Navigate to next focusable element |
| Shift + Tab | Navigate to previous focusable element |
| Enter | Activate focused button/link |
| Space | Activate focused button/checkbox |
| Escape | Close modal, go back |
| Arrow Up/Down | Navigate radio groups, select options |
| Arrow Left/Right | Navigate tabs, sliders |
| Home | Jump to first item in list |
| End | Jump to last item in list |

### Testing Procedure

1. **Tab Order Test**:
   ```
   1. Press Tab repeatedly
   2. Verify focus moves in logical order:
      - Top to bottom
      - Left to right
      - Matches visual layout
   3. Verify focus indicator is visible
   4. Verify no keyboard traps (can always tab away)
   ```

2. **Focus Indicator Test**:
   ```
   1. Tab through all interactive elements
   2. Verify each element shows clear focus indicator:
      - Outline or border
      - Color change
      - Shadow or highlight
   3. Verify focus indicator has sufficient contrast (3:1)
   ```

3. **Modal Test**:
   ```
   1. Open modal (click button or use shortcut)
   2. Verify focus moves to modal
   3. Tab through modal elements
   4. Verify focus stays within modal (focus trap)
   5. Press Escape
   6. Verify modal closes
   7. Verify focus returns to trigger element
   ```

4. **Form Test**:
   ```
   1. Tab to first input
   2. Type text
   3. Tab to next input
   4. Verify label is announced (by screen reader if enabled)
   5. Tab to submit button
   6. Press Enter
   7. Verify form submits
   ```

5. **Radio Group Test**:
   ```
   1. Tab to radio group
   2. Use Arrow Up/Down to change selection
   3. Verify selection changes
   4. Verify only selected radio is in tab order
   ```

6. **Tab List Test**:
   ```
   1. Tab to tab list
   2. Use Arrow Left/Right to change tabs
   3. Verify tab changes
   4. Verify tab panel updates
   ```

### Common Keyboard Issues

| Issue | Fix |
|-------|-----|
| No focus indicator | Add `:focus-visible` styles |
| Wrong tab order | Use `tabIndex` attribute correctly |
| Keyboard trap | Ensure Tab/Shift+Tab always work |
| Missing keyboard shortcuts | Add event handlers |
| Can't activate with Enter | Add `onKeyDown` handler |

---

## Visual Testing

### Color Contrast Testing

#### Tools

- **Automated**: Our test suite (`color-contrast.test.ts`)
- **Manual**: 
  - Chrome DevTools: Inspect element → Accessibility pane
  - Figma: Color Contrast plugin
  - Online: WebAIM Contrast Checker

#### Standards

- **Normal text** (< 18pt): 4.5:1 minimum
- **Large text** (≥ 18pt or ≥ 14pt bold): 3:1 minimum
- **UI components**: 3:1 minimum

#### Testing Procedure

1. **Run automated tests**:
   ```bash
   npm test -- __tests__/accessibility/color-contrast.test.ts
   ```

2. **Manual verification**:
   ```
   1. Take screenshots of each screen
   2. Use contrast checker tool
   3. Test all text/background combinations
   4. Test interactive elements (buttons, links)
   5. Test focus indicators
   ```

3. **Current color palette** (WCAG AA compliant):
   ```css
   /* Light mode */
   --background: #ffffff;
   --foreground: #0a0a0a;
   --primary: #0066cc;     /* 5.3:1 with white text */
   --destructive: #b91c1c; /* 5.8:1 with white text */
   --muted-foreground: #737373; /* 4.5:1 on white */
   ```

### Touch Target Testing

#### Standards

- **Minimum size**: 44x44 points (iOS), 48x48 dp (Android)
- **Recommended**: 48x48 points (both platforms)
- **Spacing**: 8pt minimum between targets

#### Testing Procedure

1. **Run automated tests**:
   ```bash
   npm test -- __tests__/accessibility/touch-targets.test.tsx
   ```

2. **Manual verification**:
   ```
   1. Open app on physical device
   2. Try tapping each interactive element
   3. Verify easy to tap without mistakes
   4. Pay special attention to:
      - Small icons
      - Close buttons
      - Inline links
      - Chip buttons
   ```

3. **Use developer overlay** (if available):
   ```
   1. Enable touch target visualization
   2. Verify all targets are ≥ 44pt
   3. Verify adequate spacing between targets
   ```

### Text Scaling Testing

#### Standards

- Support up to **200% text scaling**
- Layout should not break
- Text should not be clipped
- Interactive elements should remain usable

#### Testing Procedure

**iOS**:
```
1. Settings > Accessibility > Display & Text Size
2. Drag slider to maximum (200%)
3. Open Quester app
4. Navigate through all screens
5. Verify text is readable and not clipped
```

**Android**:
```
1. Settings > Display > Font size
2. Select "Largest" or use slider
3. Open Quester app
4. Navigate through all screens
5. Verify text is readable and not clipped
```

**Web**:
```
1. Browser settings or Ctrl/Cmd + Plus
2. Zoom to 200%
3. Navigate through all screens
4. Verify no horizontal scrolling
5. Verify all content is accessible
```

### High Contrast Testing

#### Testing Procedure

**iOS**:
```
1. Settings > Accessibility > Display & Text Size
2. Enable "Increase Contrast"
3. Open Quester app
4. Verify:
   - Text is clearly visible
   - Borders are more prominent
   - Focus indicators are clear
```

**Android**:
```
1. Settings > Accessibility > High contrast text
2. Enable setting
3. Open Quester app
4. Verify text contrast improves
```

**Web**:
```
1. Windows: Settings > Ease of Access > High contrast
2. macOS: System Preferences > Accessibility > Display > Increase contrast
3. Open Quester web app
4. Verify high contrast colors are applied
```

### Reduced Motion Testing

#### Testing Procedure

**iOS**:
```
1. Settings > Accessibility > Motion
2. Enable "Reduce Motion"
3. Open Quester app
4. Verify:
   - Parallax effects are removed
   - Crossfade replaces slide transitions
   - Animations are simplified
   - XP gain animations are subtle
```

**Android**:
```
1. Settings > Accessibility > Remove animations
2. Enable setting
3. Open Quester app
4. Verify animations are disabled or simplified
```

**Web**:
```
1. OS settings (varies by platform)
2. Or use DevTools: Emulate CSS media → prefers-reduced-motion
3. Open Quester web app
4. Verify animations respect setting
```

**Hook Usage**:
```typescript
const { prefersReducedMotion } = useAccessibility();

// In component
const animationConfig = prefersReducedMotion
  ? { duration: 0 }
  : { duration: 300, type: 'spring' };
```

---

## Common Issues and Fixes

### Missing Accessibility Labels

**Issue**: Screen reader announces "button" without context.

**Fix**:
```tsx
// ❌ Bad
<Pressable onPress={handlePress}>
  <Icon name="close" />
</Pressable>

// ✅ Good
<Pressable 
  onPress={handlePress}
  accessibilityRole="button"
  accessibilityLabel="Close modal"
  accessibilityHint="Closes the current modal and returns to previous screen"
>
  <Icon name="close" />
</Pressable>
```

### Poor Color Contrast

**Issue**: Text contrast ratio is 3.2:1 (fails WCAG AA).

**Fix**:
```tsx
// ❌ Bad - Light gray on white (2.5:1)
<Text style={{ color: '#999999' }}>Muted text</Text>

// ✅ Good - Dark gray on white (4.5:1)
<Text className="text-muted-foreground">Muted text</Text>
// CSS: --muted-foreground: #737373
```

### Small Touch Targets

**Issue**: Button is 32x32 points (fails minimum 44x44).

**Fix**:
```tsx
// ❌ Bad
<Pressable style={{ width: 32, height: 32 }}>
  <Icon name="close" size={20} />
</Pressable>

// ✅ Good
<Pressable style={{ minWidth: 44, minHeight: 44, padding: 12 }}>
  <Icon name="close" size={20} />
</Pressable>
```

### Missing Form Labels

**Issue**: Input field has no associated label.

**Fix**:
```tsx
// ❌ Bad
<Input placeholder="Email" />

// ✅ Good
<View>
  <Label nativeID="email-label">
    <Text>Email Address</Text>
  </Label>
  <Input
    nativeID="email-input"
    aria-labelledby="email-label"
    aria-required={true}
    placeholder="m@example.com"
  />
</View>
```

### Dynamic Content Not Announced

**Issue**: XP gain happens but screen reader doesn't announce it.

**Fix**:
```tsx
// ❌ Bad
const gainXP = (amount: number) => {
  setPoints(points + amount);
  showToast(`+${amount} XP`);
};

// ✅ Good
const { announceForAccessibility } = useAccessibility();

const gainXP = (amount: number, source: string) => {
  setPoints(points + amount);
  showToast(`+${amount} XP`);
  
  // Announce for screen readers
  announceForAccessibility(
    `You gained ${amount} experience points from ${source}. Total: ${points + amount} points`
  );
};
```

### Keyboard Trap

**Issue**: User can Tab into modal but can't Tab out.

**Fix**:
```tsx
// Use focus trap library or implement manually
import { useFocusTrap } from '@/lib/hooks/use-focus-trap';

function Modal({ isOpen, onClose, children }) {
  const modalRef = useRef(null);
  
  useFocusTrap(modalRef, isOpen);
  
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);
  
  return <View ref={modalRef}>{children}</View>;
}
```

### Focus Not Visible

**Issue**: Can't see which element has keyboard focus.

**Fix**:
```css
/* global.css */
.focus-visible:focus {
  outline: 2px solid hsl(var(--primary));
  outline-offset: 2px;
}

/* Or with Tailwind */
.focus:outline-none.focus-visible:ring-2.focus-visible:ring-primary
```

---

## WCAG 2.1 Level AA Compliance Checklist

### Perceivable

#### 1.1 Text Alternatives
- [X] 1.1.1 Non-text Content: All images, icons, and non-text content have text alternatives (alt text, aria-label)

#### 1.2 Time-based Media
- [X] 1.2.1 Audio-only and Video-only (Prerecorded): Not applicable (no audio/video content)
- [X] 1.2.2 Captions (Prerecorded): Not applicable
- [X] 1.2.3 Audio Description or Media Alternative (Prerecorded): Not applicable

#### 1.3 Adaptable
- [X] 1.3.1 Info and Relationships: Form labels, headings, and semantic structure properly defined
- [X] 1.3.2 Meaningful Sequence: Content order makes sense when linearized
- [X] 1.3.3 Sensory Characteristics: Instructions don't rely solely on shape, size, or location
- [X] 1.3.4 Orientation: App works in both portrait and landscape
- [X] 1.3.5 Identify Input Purpose: Form inputs have proper autocomplete attributes

#### 1.4 Distinguishable
- [X] 1.4.1 Use of Color: Information not conveyed by color alone
- [X] 1.4.2 Audio Control: Not applicable (no auto-playing audio)
- [X] 1.4.3 Contrast (Minimum): 4.5:1 for normal text, 3:1 for large text
- [X] 1.4.4 Resize Text: Text can be resized up to 200% without loss of functionality
- [X] 1.4.5 Images of Text: Text is not rendered as images (except logos)
- [X] 1.4.10 Reflow: Content reflows for small viewports without horizontal scrolling
- [X] 1.4.11 Non-text Contrast: 3:1 for UI components and graphical objects
- [X] 1.4.12 Text Spacing: Text spacing can be adjusted without loss of functionality
- [X] 1.4.13 Content on Hover or Focus: Hover content is dismissible, hoverable, and persistent

### Operable

#### 2.1 Keyboard Accessible
- [X] 2.1.1 Keyboard: All functionality available via keyboard (web)
- [X] 2.1.2 No Keyboard Trap: Keyboard focus can be moved away from any component
- [X] 2.1.4 Character Key Shortcuts: Single character shortcuts can be turned off or remapped

#### 2.2 Enough Time
- [X] 2.2.1 Timing Adjustable: Not applicable (no time limits on actions)
- [X] 2.2.2 Pause, Stop, Hide: Animations can be paused/stopped (via reduce motion)

#### 2.3 Seizures
- [X] 2.3.1 Three Flashes or Below Threshold: No flashing content

#### 2.4 Navigable
- [X] 2.4.1 Bypass Blocks: Navigation can be bypassed (landmarks, headings)
- [X] 2.4.2 Page Titled: All screens have descriptive titles
- [X] 2.4.3 Focus Order: Focus order is logical and intuitive
- [X] 2.4.4 Link Purpose (In Context): Link/button purpose is clear from text or context
- [X] 2.4.5 Multiple Ways: Multiple ways to find content (navigation, search)
- [X] 2.4.6 Headings and Labels: Headings and labels are descriptive
- [X] 2.4.7 Focus Visible: Keyboard focus indicator is visible

#### 2.5 Input Modalities
- [X] 2.5.1 Pointer Gestures: No multi-point or path-based gestures required
- [X] 2.5.2 Pointer Cancellation: Up-event or abort available for all pointer actions
- [X] 2.5.3 Label in Name: Accessible name contains visible label text
- [X] 2.5.4 Motion Actuation: Motion-based actions have alternative input methods

### Understandable

#### 3.1 Readable
- [X] 3.1.1 Language of Page: Language is specified (en-US)
- [X] 3.1.2 Language of Parts: Language changes are marked (if applicable)

#### 3.2 Predictable
- [X] 3.2.1 On Focus: No unexpected context changes on focus
- [X] 3.2.2 On Input: No unexpected context changes on input
- [X] 3.2.3 Consistent Navigation: Navigation is consistent across screens
- [X] 3.2.4 Consistent Identification: Components are identified consistently

#### 3.3 Input Assistance
- [X] 3.3.1 Error Identification: Errors are identified and described to the user
- [X] 3.3.2 Labels or Instructions: Labels and instructions are provided for inputs
- [X] 3.3.3 Error Suggestion: Suggestions are provided for input errors
- [X] 3.3.4 Error Prevention (Legal, Financial, Data): Confirmation required for important actions

### Robust

#### 4.1 Compatible
- [X] 4.1.1 Parsing: Markup is valid (React Native handles this)
- [X] 4.1.2 Name, Role, Value: All UI components have proper name, role, and value
- [X] 4.1.3 Status Messages: Status messages are announced to assistive technologies

---

## Resources

### Official Documentation

- **WCAG 2.1**: https://www.w3.org/WAI/WCAG21/quickref/
- **iOS Accessibility**: https://developer.apple.com/accessibility/
- **Android Accessibility**: https://developer.android.com/guide/topics/ui/accessibility
- **React Native Accessibility**: https://reactnative.dev/docs/accessibility
- **Expo Accessibility**: https://docs.expo.dev/guides/accessibility/

### Testing Tools

- **Automated**: 
  - Jest + React Native Testing Library (our test suite)
  - Axe DevTools (browser extension)
  - Lighthouse (Chrome DevTools)
  
- **Manual**:
  - TalkBack (Android)
  - VoiceOver (iOS)
  - NVDA / JAWS (Windows screen readers)
  
- **Color Contrast**:
  - WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/
  - Chrome DevTools Accessibility Pane
  - Figma Color Contrast Plugin

### Learning Resources

- **WebAIM**: https://webaim.org/
- **A11y Project**: https://www.a11yproject.com/
- **Deque University**: https://dequeuniversity.com/
- **Inclusive Components**: https://inclusive-components.design/

### Community

- **Accessibility Slack**: web-a11y.slack.com
- **Twitter**: #a11y hashtag
- **Stack Overflow**: [accessibility] tag

---

## Appendix: Test Results Template

### Manual Testing Session

**Date**: ___________  
**Tester**: ___________  
**Platform**: iOS / Android / Web  
**Screen Reader**: TalkBack / VoiceOver / NVDA / JAWS  
**Version**: ___________

#### Test Results

| Feature | Pass | Fail | Notes |
|---------|------|------|-------|
| Home Screen | ☐ | ☐ | |
| Authentication | ☐ | ☐ | |
| Navigation | ☐ | ☐ | |
| Gamification | ☐ | ☐ | |
| Forms | ☐ | ☐ | |
| Notifications | ☐ | ☐ | |

#### Issues Found

| ID | Severity | Description | Steps to Reproduce | Expected | Actual |
|----|----------|-------------|-------------------|----------|--------|
| A11Y-001 | High | | | | |
| A11Y-002 | Medium | | | | |

**Severity Levels**:
- **Critical**: Blocks all users from core functionality
- **High**: Blocks some users from core functionality
- **Medium**: Causes significant difficulty but workaround exists
- **Low**: Minor inconvenience

---

**Last Updated**: November 14, 2025  
**Maintained By**: Quester Development Team  
**Version**: 1.0
