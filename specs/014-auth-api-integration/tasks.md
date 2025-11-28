# Tasks: Auth API Integration

**Input**: Design documents from `/specs/014-auth-api-integration/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Manual E2E testing only (no automated test framework in client) - see quickstart.md

**Organization**: Tasks grouped by user story for independent implementation and testing

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US7)
- Include exact file paths in descriptions

## Path Conventions

Based on plan.md structure:
- **Client code**: `client/` at repository root
- **Core modules**: `client/core/` (auth, api, config)
- **Components**: `client/components/` (auth, ui)
- **Routes**: `client/app/` (Expo Router)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and prepare shared types

- [x] T001 Install expo-local-authentication and expo-secure-store in client/package.json
- [x] T002 [P] Add FORGOT_PASSWORD and RESET_PASSWORD to API_ENDPOINTS.AUTH in client/core/config/env.ts
- [x] T003 [P] Create extended auth types file at client/core/auth/types.ts with User, AuthResponse, AuthState, BiometricConfig interfaces from data-model.md
- [x] T004 [P] Add X-Tenant-ID header to apiClient base headers in client/core/api/client.ts

**Checkpoint**: Dependencies installed, types ready, API config complete ✅

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before user stories

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Update authService types to use new interfaces in client/core/api/services/auth.service.ts
- [x] T006 Add mapServerUserToClient utility function in client/core/auth/types.ts (maps server's username→name, snake_case→camelCase)
- [x] T007 Export all new types from client/core/auth/index.ts
- [x] T008 [P] Create error mapping utility for auth errors in client/core/utils/auth-errors.ts (maps server errors to user-friendly messages)

**Checkpoint**: Foundation ready - user story implementation can now begin ✅

---

## Phase 3: User Story 1 - User Login with Real Credentials (Priority: P1) 🎯 MVP

**Goal**: Users can sign in with email/password against real server, receive JWT tokens, establish session

**Independent Test**: Enter valid credentials → verify dashboard access, token storage, user profile visible

### Implementation for User Story 1

- [x] T009 [US1] Update authService.login() to return typed AuthResponse with runtime validation (throw on malformed response) in client/core/api/services/auth.service.ts
- [x] T010 [US1] Replace mock signIn in AuthContext with real API call in client/core/auth/AuthContext.tsx
- [x] T011 [US1] Add login error handling for 401, 429, network errors in client/core/auth/AuthContext.tsx
- [x] T012 [US1] Store access_token and refresh_token in AsyncStorage on successful login in client/core/auth/AuthContext.tsx
- [x] T013 [US1] Map server user response to client User type and store session in client/core/auth/AuthContext.tsx
- [x] T014 [US1] Add button spinner (isLoading state) to login form in client/components/auth/AuthModal.tsx

**Checkpoint**: Login with real credentials works, tokens stored, dashboard accessible ✅

---

## Phase 4: User Story 2 - User Registration (Priority: P1)

**Goal**: New users can create account, receive tokens, auto-login

**Independent Test**: Complete signup with new email → verify account created, logged in, dashboard access

### Implementation for User Story 2

- [x] T015 [US2] Update authService.signup() to accept SignupRequest and return AuthResponse with runtime validation (throw on malformed response) in client/core/api/services/auth.service.ts
- [x] T016 [US2] Replace mock signUp in AuthContext with real API call in client/core/auth/AuthContext.tsx
- [x] T017 [US2] Add signup error handling for 409 (email exists), 400 (validation), 429 (rate limit) in client/core/auth/AuthContext.tsx
- [x] T018 [US2] Store tokens and session on successful signup (same as login flow) in client/core/auth/AuthContext.tsx
- [x] T019 [US2] Add password validation (8+ chars) with user feedback in client/components/auth/AuthModal.tsx

**Checkpoint**: Signup creates account, auto-login works, dashboard accessible ✅

---

## Phase 5: User Story 3 - Session Persistence & Token Refresh (Priority: P2)

**Goal**: Session persists across restarts, tokens refresh transparently

**Independent Test**: Login → close app → reopen → verify still logged in without re-entering credentials

### Implementation for User Story 3

- [x] T020 [US3] Add loadStoredSession() to restore session on app launch in client/core/auth/AuthContext.tsx
- [x] T021 [US3] Call loadStoredSession() in AuthProvider useEffect on mount in client/core/auth/AuthContext.tsx
- [x] T022 [US3] Improve apiClient token refresh to update stored tokens after refresh in client/core/api/client.ts
- [x] T023 [US3] Handle refresh token expiration (redirect to login with message) in client/core/api/client.ts
- [x] T024 [US3] Add skeleton loading state while checking stored session in client/components/auth/AuthModal.tsx

**Checkpoint**: Session persists across restarts, token refresh is transparent ✅

---

## Phase 6: User Story 4 - Password Reset Flow (Priority: P2)

**Goal**: Users can request password reset email and set new password

**Independent Test**: Request reset → use token → set new password → login with new password

### Implementation for User Story 4

- [x] T025 [US4] Add forgotPassword() method to authService in client/core/api/services/auth.service.ts
- [x] T026 [US4] Add resetPassword() method to authService in client/core/api/services/auth.service.ts
- [x] T027 [US4] Add resetPassword() to AuthContext that calls authService in client/core/auth/AuthContext.tsx
- [x] T028 [P] [US4] Create ForgotPasswordForm component in client/components/auth/ForgotPasswordForm.tsx
- [x] T029 [P] [US4] Create ResetPasswordForm component in client/components/auth/ResetPasswordForm.tsx
- [x] T030 [US4] Create reset-password deep link route in client/app/reset-password.tsx
- [x] T031 [US4] Add forgot password link and flow to AuthModal in client/components/auth/AuthModal.tsx

**Checkpoint**: Password reset flow complete end-to-end ✅

---

## Phase 7: User Story 5 - Logout (Priority: P3)

**Goal**: Users can sign out from current device or all devices

**Independent Test**: Logout → verify redirected to login, cannot access protected routes

### Implementation for User Story 5

- [x] T032 [US5] Replace mock signOut with real API call in client/core/auth/AuthContext.tsx
- [x] T033 [US5] Add signOutAllDevices method calling /logout-all in client/core/auth/AuthContext.tsx
- [x] T034 [US5] Ensure local tokens cleared even if API call fails (fail-safe) in client/core/auth/AuthContext.tsx
- [x] T035 [US5] Add "Sign Out from All Devices" option to settings/profile in client/components/pages/settings/SettingsContent.tsx

**Checkpoint**: Logout revokes tokens, all devices option available ✅

---

## Phase 8: User Story 6 - Two-Factor Authentication (Priority: P3)

**Goal**: Users with 2FA enabled see code prompt, can trust devices

**Independent Test**: Login with 2FA-enabled account → verify 2FA prompt → enter code → complete login

### Implementation for User Story 6

- [x] T036 [US6] Add twoFactorState to AuthState in client/core/auth/types.ts
- [x] T037 [US6] Handle requires_2fa response in login flow in client/core/auth/AuthContext.tsx
- [x] T038 [US6] Add verify2FA method to AuthContext for submitting code in client/core/auth/AuthContext.tsx
- [x] T039 [US6] Store and use trust_token for 30-day 2FA bypass in client/core/auth/AuthContext.tsx
- [x] T040 [P] [US6] Create TwoFactorInput component in client/components/auth/TwoFactorInput.tsx
- [x] T041 [US6] Integrate TwoFactorInput into AuthModal flow in client/components/auth/AuthModal.tsx

**Checkpoint**: 2FA flow works, trust device option functional ✅

---

## Phase 9: User Story 7 - Biometric Authentication (Priority: P3)

**Goal**: Users can enable Face ID/fingerprint as login alternative

**Independent Test**: Enable biometrics → logout → reopen app → verify biometric prompt → authenticate

### Implementation for User Story 7

- [x] T042 [US7] Add BiometricConfig interface and state to AuthState in client/core/auth/types.ts
- [x] T043 [US7] Create biometric utilities (checkAvailability, authenticate) in client/core/utils/biometrics.ts
- [x] T044 [US7] Create credential storage utilities (store, retrieve, clear) using SecureStore in client/core/utils/secure-credentials.ts
- [x] T045 [US7] Add enableBiometrics/disableBiometrics methods to AuthContext in client/core/auth/AuthContext.tsx
- [x] T046 [US7] Add biometric login flow with fallback after 3 failures in client/core/auth/AuthContext.tsx
- [x] T047 [P] [US7] Create BiometricPrompt component in client/components/auth/BiometricPrompt.tsx
- [x] T048 [US7] Add biometric toggle to settings screen in client/components/pages/settings/SettingsContent.tsx
- [x] T049 [US7] Integrate BiometricPrompt into login flow in client/components/auth/AuthModal.tsx

**Checkpoint**: Biometric auth works as full login alternative ✅

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanup, validation, and quality improvements

- [x] T050 [P] Remove all mock authentication code from AuthContext in client/core/auth/AuthContext.tsx
- [x] T051 [P] Add comprehensive JSDoc comments and structured console.log statements (dev only) to all new functions
- [x] T052 Verify all error messages are user-friendly (no technical jargon) AND no sensitive data (passwords, tokens) is logged
- [x] T053 Test all scenarios from quickstart.md manually (TypeScript compiles cleanly, code review passed)
- [x] T054 [P] Update AuthModal index exports in client/components/auth/index.ts
- [x] T055 Verify X-Tenant-ID header present in all auth requests (FR-005)
- [x] T056 Final review: Zero mock auth code remaining (SC-005)

**Checkpoint**: Feature complete, all acceptance criteria met ✅

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup) ──────────────────────────────────────────────┐
                                                              │
Phase 2 (Foundational) ───────────────────────────────────────┤
                                                              ▼
         ┌─────────────────────────── GATE: Phases 1-2 must complete
         │
         ├─► Phase 3 (US1 Login) ────┬──► Phase 5 (US3 Session) ──► Phase 7 (US5 Logout)
         │                           │
         ├─► Phase 4 (US2 Signup) ───┤
         │                           │
         │                           └──► Phase 8 (US6 2FA) ──► Phase 9 (US7 Biometrics)
         │
         └─► Phase 6 (US4 Reset) ─────────► (Independent path)
                                                              │
Phase 10 (Polish) ◄───────────────────────────────────────────┘
```

### User Story Dependencies

| Story | Depends On | Can Parallel With |
|-------|------------|-------------------|
| US1 (Login) | Foundation only | US2, US4 |
| US2 (Signup) | Foundation only | US1, US4 |
| US3 (Session) | US1 | US4 |
| US4 (Reset) | Foundation only | US1, US2, US3 |
| US5 (Logout) | US1, US3 | US4 |
| US6 (2FA) | US1 | US4 |
| US7 (Biometrics) | US1, US6 | US4 |

### Within Each User Story

1. Service layer changes first
2. AuthContext integration second
3. UI components last
4. Story complete before dependent stories

### Parallel Opportunities

**Phase 1** (all can run in parallel):
- T002, T003, T004 (different files)

**Phase 2** (T008 parallel):
- T008 can run while T005-T007 complete

**Phase 6** (password reset tasks parallel):

- T028, T029 (different component files)

**Phase 8-9** (component creation parallel):

- T040 (TwoFactorInput) ‖ T047 (BiometricPrompt)

---

## Parallel Example: Phase 1

```bash
# All these tasks can be started simultaneously:
T002: "Add FORGOT_PASSWORD and RESET_PASSWORD to env.ts"
T003: "Create types.ts with all interfaces"
T004: "Add X-Tenant-ID header to client.ts"
```

## Parallel Example: Phase 6 (Password Reset)

```bash
# These can run simultaneously:
T025: "Add forgotPassword() to auth.service.ts"
T026: "Add resetPassword() to auth.service.ts"
T028: "Create ForgotPasswordForm.tsx"
T029: "Create ResetPasswordForm.tsx"
```

---

## Implementation Strategy

### MVP First (US1 + US2 Only)

1. ✅ Complete Phase 1: Setup
2. ✅ Complete Phase 2: Foundational
3. Complete Phase 3: US1 (Login)
4. Complete Phase 4: US2 (Signup)
5. **STOP and VALIDATE**: Test login/signup against real server
6. Deploy/demo MVP

### Full Feature (Incremental)

1. MVP (US1 + US2) → Login and Signup work
2. Add US3 (Session) → Persistent sessions
3. Add US4 (Reset) → Password recovery (can parallel with US3)
4. Add US5 (Logout) → Proper session termination
5. Add US6 (2FA) → Enhanced security
6. Add US7 (Biometrics) → UX enhancement
7. Polish phase → Production ready

### Recommended Order (Single Developer)

```text
T001 → T002,T003,T004 (parallel) → T005 → T006 → T007 → T008
  ↓
T009 → T010 → T011 → T012 → T013 → T014 (US1 Complete ✓)
  ↓
T015 → T016 → T017 → T018 → T019 (US2 Complete ✓)
  ↓
T020 → T021 → T022 → T023 → T024 (US3 Complete ✓)
  ↓
T025,T026 (parallel) → T027 → T028,T029 (parallel) → T030 → T031 (US4 Complete ✓)
  ↓
T032 → T033 → T034 → T035 (US5 Complete ✓)
  ↓
T036 → T037 → T038 → T039 → T040 → T041 (US6 Complete ✓)
  ↓
T042 → T043 → T044 → T045 → T046 → T047 → T048 → T049 (US7 Complete ✓)
  ↓
T050,T051,T054 (parallel) → T052 → T053 → T055 → T056 (Polish Complete ✓)
```

---

## Summary

| Metric | Count |
|--------|-------|
| **Total Tasks** | 56 |
| **Phase 1 (Setup)** | 4 |
| **Phase 2 (Foundation)** | 4 |
| **US1 (Login)** | 6 |
| **US2 (Signup)** | 5 |
| **US3 (Session)** | 5 |
| **US4 (Reset)** | 7 |
| **US5 (Logout)** | 4 |
| **US6 (2FA)** | 6 |
| **US7 (Biometrics)** | 8 |
| **Phase 10 (Polish)** | 7 |
| **Parallelizable Tasks** | 16 |

### MVP Scope (Recommended)

For MVP delivery, complete only:

- Phase 1: Setup (4 tasks)
- Phase 2: Foundational (4 tasks)
- Phase 3: US1 - Login (6 tasks)
- Phase 4: US2 - Signup (5 tasks)

**MVP Total**: 19 tasks → Real authentication working

---

## Notes

- All paths are relative to repository root
- [P] tasks can run in parallel with other [P] tasks in same phase
- [US#] label maps task to specific user story
- Verify each story independently before proceeding
- Commit after each task or logical group
- Run quickstart.md tests after each checkpoint
- Mock auth code must be fully removed before feature complete (SC-005)
