# Test Suite Quick Reference

**Last Updated**: November 17, 2025  
**Status**: ✅ 99.8% Coverage (1719/1723 passing)

---

## Quick Commands

```bash
# Run all tests
npm test

# Run specific test file
npm test -- path/to/test.test.tsx

# Run with coverage
npm test:coverage

# Run in watch mode
npm test:watch

# Run accessibility tests only
npm test -- __tests__/accessibility/

# Run performance tests only
npm test -- __tests__/performance/
```

---

## Test Suite Status

### ✅ 100% Coverage Suites

| Suite | Tests | File |
|-------|-------|------|
| Badge Notifications | 32/32 | `__tests__/components/gamification/badge-unlock-notification.test.tsx` |
| Accessibility Audits | 202/202 | `__tests__/accessibility/audit-all-screens.test.tsx` |
| Gamification Feedback | 19/19 | `__tests__/hooks/use-gamification-feedback.test.tsx` |
| WebSocket Service | 10/10 | `__tests__/services/websocket-service.test.ts` |
| Performance | 56/56 | `__tests__/performance/*.test.tsx` |
| CheckoutFlow | 25/25 | `__tests__/components/marketplace/checkout-flow.test.tsx` |
| App Landing | 25/25 | `app/__tests__/index.test.tsx` |

### ⏭️ Skipped Tests (3)

**File**: `components/video/__tests__/NetworkIndicator.test.tsx`

- Custom size styling (TODO: not implemented)
- Custom badge color (TODO: not implemented)
- Custom text color (TODO: not implemented)

**Reason**: Future feature enhancements, documented with TODO comments

---

## Common Test Patterns

### Animation Testing

```typescript
// Use synchronous animation mock
const originalTiming = Animated.timing;
Animated.timing = jest.fn((value: any, config: any) => ({
  start: (callback?: (result: { finished: boolean }) => void) => {
    value.setValue(config.toValue);
    if (callback) setTimeout(() => callback({ finished: true }), 0);
  },
})) as any;
```

### Fake Timers

```typescript
beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

// In test
act(() => {
  jest.advanceTimersByTime(1000);
});
```

### Async Operations

```typescript
await waitFor(() => {
  expect(screen.getByText('Success')).toBeTruthy();
}, { timeout: 3000 });
```

### Accessibility Testing

```typescript
// Check semantic properties, not styles
expect(element.props.accessibilityRole).toBe('button');
expect(element.props.accessibilityLabel).toBe('Submit form');
expect(element.props.accessibilityState.selected).toBe(true);
```

---

## Key Test Files

### Components

```
__tests__/components/
├── gamification/
│   ├── badge-unlock-notification.test.tsx (32 tests)
│   ├── gamification-header.test.tsx
│   └── xp-gain-animation.test.tsx (5 tests)
├── marketplace/
│   ├── checkout-flow.test.tsx (25 tests) ⭐ NEW
│   ├── listing-card.test.tsx
│   └── seller-reputation-card.test.tsx
└── video/
    ├── upload-progress.test.tsx (26 tests)
    └── NetworkIndicator.test.tsx (3 skipped)
```

### Hooks

```
__tests__/hooks/
├── use-gamification-feedback.test.tsx (19 tests) ⭐ REWRITTEN
├── use-accessibility.test.tsx
└── use-optimistic-update.test.tsx
```

### Accessibility

```
__tests__/accessibility/
├── audit-all-screens.test.tsx (202 tests) ⭐
├── color-contrast.test.ts
├── touch-targets.test.tsx
├── screen-reader-navigation.test.tsx
├── keyboard-navigation.test.ts
└── form-accessibility.test.tsx
```

### Performance

```
__tests__/performance/
├── render-time.test.tsx (10 tests) ⭐ FIXED
├── input-latency.test.tsx
├── animation-performance.test.tsx
├── list-performance.test.tsx
└── memory-leaks.test.tsx
```

### Services

```
__tests__/services/
├── websocket-service.test.ts (10 tests) ⭐
├── offline-queue.test.ts
└── bandwidth-monitor.test.ts
```

### App

```
app/__tests__/
└── index.test.tsx (25 tests) ⭐ FIXED (NativeWind issue)
```

---

## Troubleshooting

### Issue: Animation Teardown Errors

**Error**: `accessing Jest environment after teardown`

**Solution**: Use synchronous animation mock
```typescript
Animated.timing = jest.fn((value, config) => ({
  start: (callback) => {
    value.setValue(config.toValue);
    if (callback) setTimeout(() => callback({ finished: true }), 0);
  },
}));
```

### Issue: NativeWind cssInterop Error

**Error**: `Invalid variable access: _ReactNativeCSSInterop`

**Solution**: Already fixed in `babel.config.js`
```javascript
const isTest = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
// NativeWind disabled in test environment
```

### Issue: Duplicate Text Elements

**Error**: `Found multiple elements with text: "Button"`

**Solution**: 
1. Use `testID` instead of text queries
2. Make text labels unique
3. Use `getAllByText` if multiple elements expected

### Issue: Flaky Timeout Tests

**Solution**: Use fake timers instead of real waits
```typescript
jest.useFakeTimers();
act(() => jest.advanceTimersByTime(1000));
jest.useRealTimers();
```

---

## Test Maintenance Guidelines

### Adding New Tests

1. **File Naming**: `*.test.tsx` or `*.test.ts`
2. **Location**: Match source file structure
3. **Coverage**: Aim for >90% per file
4. **Patterns**: Follow existing patterns in similar tests

### Updating Tests

1. Check if changes break existing tests
2. Update snapshots if needed: `npm test -- -u`
3. Ensure accessibility assertions are maintained
4. Verify animations use synchronous mocks

### Skipping Tests

Only skip tests when:
- Feature not yet implemented (TODO comment required)
- External dependency unavailable (document reason)
- Temporarily broken (create issue, add link)

```typescript
it.skip('should implement feature X', () => {
  // TODO: Implement feature X in Phase 12
});
```

---

## CI/CD Integration

### GitHub Actions

Tests run automatically on:
- Every push to `main`
- All pull requests
- Manual workflow dispatch

### Required Checks

- ✅ All tests pass (99.8% threshold)
- ✅ Zero TypeScript errors
- ✅ Accessibility compliance
- ✅ No high-severity security issues

---

## Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| Test Execution | <60s | ~45s |
| Individual Test | <5s | ~2s avg |
| Animation Tests | <3s | ~1s avg |
| Integration Tests | <10s | ~5s avg |

---

## Resources

### Documentation
- [Testing Library Docs](https://testing-library.com/docs/react-native-testing-library/intro)
- [Jest Docs](https://jestjs.io/docs/getting-started)
- [Accessibility Testing Guide](./accessibility-testing.md)

### Internal Guides
- [Phase 11 Test Completion](./phase-11-test-completion-final.md)
- [Phase 6 Test Infrastructure](../../docs/phase-6-test-infrastructure-completion.md)
- [Component Migration Guide](./component-migration-guide.md)

---

## Contact

For test suite questions:
- Check this quick reference first
- Review related test files for patterns
- See [phase-11-test-completion-final.md](./phase-11-test-completion-final.md) for detailed fixes

---

**Status**: Production Ready ✅  
**Coverage**: 99.8% (1719/1723)  
**Last Major Update**: Phase 11 (Nov 17, 2025)
