# Implementation Plan: Auth API Integration

**Branch**: `014-auth-api-integration` | **Date**: 2025-11-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/014-auth-api-integration/spec.md`

## Summary

Wire the Quester client's AuthContext to real server authentication endpoints, replacing mock login/signup with actual API calls. Implement password reset flow, 2FA support, biometric authentication, and proper token management with automatic refresh. All changes are client-side (React Native/Expo) - server endpoints already exist.

## Technical Context

**Language/Version**: TypeScript 5.9, React 19.1, React Native 0.81.5  
**Primary Dependencies**: Expo 54, Expo Router 6, @tanstack/react-query 5.90, AsyncStorage, expo-local-authentication (new), expo-secure-store (new)  
**Storage**: AsyncStorage for session, SecureStore for credentials (biometrics)  
**Testing**: Manual E2E testing (no existing test framework in client)  
**Target Platform**: iOS 15+, Android 10+, Web (Expo Router universal)  
**Project Type**: Mobile + Web (React Native with Expo)  
**Performance Goals**: Login <3s on 3G, Signup <5s on 3G (per SC-001, SC-002)  
**Constraints**: Offline session restoration, transparent token refresh  
**Scale/Scope**: Single AuthContext provider, 3-4 modified files, 2-3 new files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Multi-Tenancy | ✅ PASS | X-Tenant-ID header required in all auth requests (FR-005) |
| II. Security First | ✅ PASS | SecureStore for credentials, no sensitive data logging, proper token handling |
| III. Type Safety | ✅ PASS | Explicit interfaces for AuthResponse, User, LoginRequest; no `any` types |
| IV. Error Handling | ✅ PASS | try-catch for async, user-friendly messages, full error logging (non-sensitive) |
| V. State Management | ✅ PASS | React Context for auth state (existing pattern), minimal global state |
| VI. Consistency | ✅ PASS | Following existing apiClient, authService patterns |
| VII. Observability | ✅ PASS | Console logging in dev, error context preserved for debugging |

**Re-check after Phase 1**: ✅ All gates still pass

## Project Structure

### Documentation (this feature)

```text
specs/014-auth-api-integration/
├── plan.md              # This file
├── research.md          # Phase 0: Dependencies, patterns research
├── data-model.md        # Phase 1: TypeScript interfaces, response types
├── quickstart.md        # Phase 1: Testing guide
├── contracts/           # Phase 1: API request/response contracts
│   └── auth-api.md      # Server endpoint contracts (already exist, documented here)
└── tasks.md             # Phase 2: Implementation tasks (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
client/
├── core/
│   ├── auth/
│   │   ├── AuthContext.tsx      # MODIFY: Replace mock with real API calls
│   │   ├── types.ts             # NEW: Extended auth types (2FA, biometric state)
│   │   └── index.ts             # EXISTING: Re-exports
│   ├── api/
│   │   ├── client.ts            # MODIFY: Add X-Tenant-ID header, improve refresh logic
│   │   └── services/
│   │       └── auth.service.ts  # MODIFY: Add forgot/reset password, update types
│   └── config/
│       └── env.ts               # MODIFY: Add FORGOT_PASSWORD, RESET_PASSWORD endpoints
├── components/
│   ├── auth/
│   │   ├── AuthModal.tsx        # MODIFY: Add 2FA step, biometric option, loading states
│   │   ├── ForgotPasswordForm.tsx    # NEW: Password reset request form
│   │   ├── ResetPasswordForm.tsx     # NEW: New password entry form
│   │   ├── TwoFactorInput.tsx        # NEW: 2FA code input component
│   │   └── BiometricPrompt.tsx       # NEW: Biometric auth trigger component
│   └── ui/
│       └── skeleton.tsx         # EXISTING: Use for loading states
└── app/
    └── reset-password.tsx       # NEW: Deep link handler for reset tokens
```

**Structure Decision**: Mobile + existing client stack. All modifications within `client/` directory following established patterns from `core/api/`, `core/auth/`, and `components/auth/`.

## Complexity Tracking

No violations - implementation follows existing patterns without introducing new architectural complexity.

---

## Phase 0: Research ✅ COMPLETE

### Research Tasks

1. **expo-local-authentication**: Best practices for biometric auth in Expo SDK 54
2. **expo-secure-store**: Secure credential storage patterns
3. **Token refresh race conditions**: Existing `apiClient` pattern analysis
4. **Server response formats**: Validate client types match server responses

### Research Findings

See [research.md](./research.md) for detailed findings.

**Key Decisions**:
- Use `expo-local-authentication` for biometric prompts (Face ID/Touch ID/Fingerprint)
- Use `expo-secure-store` for encrypted credential storage
- Existing `apiClient.refreshAccessToken()` already handles refresh queue - extend, don't replace
- Server returns `access_token`, `refresh_token`, `user` object - client types need alignment

---

## Phase 1: Design ✅ COMPLETE

### Data Model

See [data-model.md](./data-model.md) for complete TypeScript interfaces.

**Key Entities**:
- `User` (extended with xp, level, tier, loginStreak from server)
- `AuthResponse` (access_token, refresh_token, user, requires_2fa, trust_token)
- `AuthState` (user, tokens, 2FA state, biometric state, loading flags)

### API Contracts

See [contracts/auth-api.md](./contracts/auth-api.md) for endpoint specifications.

**Endpoints Used**:
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/auth/login` | POST | User login with email/password |
| `/api/v1/auth/signup` | POST | New user registration |
| `/api/v1/auth/refresh` | POST | Token refresh |
| `/api/v1/auth/logout` | POST | Single device logout |
| `/api/v1/auth/logout-all` | POST | All devices logout |
| `/api/v1/auth/forgot-password` | POST | Request password reset email |
| `/api/v1/auth/reset-password` | POST | Confirm password reset |

### Quickstart Guide

See [quickstart.md](./quickstart.md) for testing procedures.

---

## Phase 2: Implementation Overview

*Detailed tasks generated by `/speckit.tasks` command*

### Phase Summary

| Phase | User Story | Tasks | Estimated Effort |
|-------|------------|-------|------------------|
| 2.1 | US1 - Login | Types, AuthContext signIn, error handling | Medium |
| 2.2 | US2 - Signup | AuthContext signUp, validation | Medium |
| 2.3 | US3 - Session | Token refresh improvements, persistence | Medium |
| 2.4 | US4 - Reset | New endpoints, forms, deep link | Medium |
| 2.5 | US5 - Logout | logout/logoutAll implementation | Low |
| 2.6 | US6 - 2FA | 2FA flow, trust tokens, UI component | Medium |
| 2.7 | US7 - Biometrics | SecureStore, expo-local-auth | Medium |
| Polish | All | Loading states, skeletons, error messages | Low |

### Dependencies

```
US1 (Login) ──┬──> US3 (Session) ──> US5 (Logout)
              │
US2 (Signup) ─┤
              │
              └──> US6 (2FA) ──> US7 (Biometrics)

US4 (Reset) ─────> (Independent)
```

### Exit Criteria

- [ ] All 7 user stories implemented
- [ ] All 22 functional requirements satisfied
- [ ] Zero mock authentication code remaining (SC-005)
- [ ] Manual testing confirms all acceptance scenarios pass
- [ ] Constitution compliance verified
