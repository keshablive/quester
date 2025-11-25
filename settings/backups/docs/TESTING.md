# Quester Platform - Testing Guide

## 1. Testing Strategy

### Pyramid Approach
- **Unit Tests (70%)**: Focus on Services and Utils. Fast, isolated tests.
- **Integration Tests (20%)**: Focus on Controllers and Repositories. Uses test DB.
- **E2E Tests (10%)**: Critical user journeys. Uses Detox/Appium.

## 2. Manual E2E Testing

### Critical Flows
1.  **Authentication**: Signup -> Login -> Logout. Verify token storage.
2.  **Quest Completion**: Start Quest -> Complete Steps -> Verify XP Reward.
3.  **Offline Mode**: Turn off network -> Perform actions -> Reconnect -> Verify Sync.

### Accessibility Testing
- **Standard**: WCAG 2.1 AA.
- **Tools**: Screen readers (TalkBack/VoiceOver), Color contrast analyzers.
- **Key Checks**:
    - All images have `alt` text.
    - Touch targets are at least 44x44px.
    - Color contrast is > 4.5:1.

## 3. Automated Testing

### Backend (Go)
```bash
# Run all tests
go test ./...

# Run with race detection
go test -race ./...

# Generate coverage report
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

### Frontend (React Native)
```bash
# Unit Tests (Jest)
npm test

# E2E Tests (Detox)
# 1. Build
npm run build:e2e
# 2. Test
npm run test:e2e
```

## 4. Quality Gates
- **CI Pipeline**: Fails if tests fail or coverage drops below 80%.
- **Linting**: `golangci-lint` for Go, `eslint` for TS.
