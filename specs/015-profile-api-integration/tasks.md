# Tasks: Profile API Integration

**Input**: Design documents from `/specs/015-profile-api-integration/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Not requested in specification - manual testing only

**Organization**: Tasks grouped by user story to enable independent implementation and testing

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, etc.)
- Include exact file paths in descriptions

## Path Conventions

- **Client**: `client/` (React Native/Expo)
- **Server**: `server/` (Go/Fiber) - No changes needed, endpoints exist

---

## Phase 1: Setup (Types & Query Infrastructure)

**Purpose**: Add new types and query keys required by all user stories

- [x] T001 [P] Add FollowStats interface to `client/core/types/query.types.ts`
- [x] T002 [P] Add followStats query key to `client/core/query/keys.ts`
- [x] T003 [P] Add ProfileProps interface to `client/components/pages/profile/types.ts`

---

## Phase 2: Foundational (Shared Hook)

**Purpose**: Create useFollowStats hook that multiple user stories depend on

**⚠️ CRITICAL**: User Stories 1 and 2 both need profile data hooks working

- [x] T004 Create useFollowStats hook in `client/core/hooks/queries/useSocial.ts`
- [x] T005 Export useFollowStats from `client/core/hooks/queries/index.ts`

**Checkpoint**: Foundation ready - hooks available for component integration

---

## Phase 3: User Story 1 - View My Profile with Real Data (Priority: P1) 🎯 MVP

**Goal**: Display authenticated user's actual name, avatar, and bio instead of "John Doe" placeholder

**Independent Test**: Navigate to /profile after login, verify displayed name matches logged-in user

### Implementation for User Story 1

- [x] T006 [US1] Update ProfileHeader to accept optional userId prop in `client/components/pages/profile/ProfileHeader.tsx`
- [x] T007 [US1] Integrate useCurrentUser hook in ProfileHeader to fetch real user data
- [x] T008 [US1] Replace hardcoded "John Doe" with user.displayName || user.username in ProfileHeader
- [x] T009 [US1] Add avatar display with fallback to initials in ProfileHeader
- [x] T010 [US1] Add loading skeleton state to ProfileHeader
- [x] T011 [P] [US1] Update ProfileBio to accept optional userId prop in `client/components/pages/profile/ProfileBio.tsx`
- [x] T012 [US1] Integrate useCurrentUser/useUser hook in ProfileBio
- [x] T013 [US1] Replace hardcoded bio text with user.bio || "No bio yet"
- [x] T014 [US1] Add loading skeleton state to ProfileBio

**Checkpoint**: User Story 1 complete - profile shows real name, avatar, and bio for current user

---

## Phase 4: User Story 2 - View My Profile Stats (Priority: P1)

**Goal**: Display real follower/following counts instead of fake "234 Posts, 1.2k Followers, 456 Following"

**Independent Test**: Check ProfileStats displays numbers matching `/users/:id/follow-stats` API response

### Implementation for User Story 2

- [x] T015 [US2] Update ProfileStats to accept userId prop in `client/components/pages/profile/ProfileStats.tsx`
- [x] T016 [US2] Integrate useFollowStats hook in ProfileStats
- [x] T017 [US2] Replace hardcoded stats array with real followers/following from API
- [x] T018 [US2] Add loading skeleton state to ProfileStats
- [x] T019 [US2] Handle error state when follow-stats API fails (show "—" with retry)

**Checkpoint**: User Story 2 complete - profile shows real follower/following counts

---

## Phase 5: User Story 3 - View My Contact Information (Priority: P2)

**Goal**: Display real email and join date instead of hardcoded "john.doe(at)example.com" and "Joined January 2023"

**Independent Test**: Verify email matches authenticated user's email and join date reflects createdAt

### Implementation for User Story 3

- [x] T020 [US3] Update ContactInfo to accept optional userId prop in `client/components/pages/profile/ContactInfo.tsx`
- [x] T021 [US3] Integrate useCurrentUser/useUser hook in ContactInfo
- [x] T022 [US3] Replace hardcoded email with user.email
- [x] T023 [US3] Create formatJoinDate utility to format createdAt as "Joined [Month Year]"
- [x] T024 [US3] Replace hardcoded "Joined January 2023" with formatted createdAt
- [x] T025 [US3] Add loading skeleton state to ContactInfo

**Checkpoint**: User Story 3 complete - profile shows real email and join date

---

## Phase 6: User Story 4 - View Other Users' Public Profiles (Priority: P2)

**Goal**: Support viewing other users' profiles via /profile/:userId route

**Independent Test**: Navigate to /profile/[userId], verify displayed data belongs to that user, not current user

### Implementation for User Story 4

- [x] T026 [US4] Update profile page to extract userId from route params in `client/app/profile.tsx`
- [x] T027 [US4] Pass userId prop to all profile components (ProfileHeader, ProfileStats, ProfileBio, ContactInfo)
- [x] T028 [US4] Update ProfileHeader to use useUser(userId) when userId provided, useCurrentUser() otherwise
- [x] T029 [US4] Update ProfileStats to pass userId to useFollowStats hook
- [x] T030 [US4] Update ProfileBio to use useUser(userId) when userId provided
- [x] T031 [US4] Update ContactInfo to use useUser(userId) when userId provided
- [x] T032 [US4] Differentiate "Edit Profile" button (my profile) vs "Follow" button (other user) in ProfileHeader

**Checkpoint**: User Story 4 complete - can view any user's public profile

---

## Phase 7: User Story 5 - Profile Loading States (Priority: P3)

**Goal**: Show smooth loading indicators and handle errors gracefully

**Independent Test**: Throttle network, observe skeleton loaders; disable network, observe error messages

### Implementation for User Story 5

- [x] T033 [US5] Verify all components show Skeleton during isLoading state
- [x] T034 [US5] Add error boundary or error state UI to ProfileHeader
- [x] T035 [US5] Add error boundary or error state UI to ProfileStats
- [x] T036 [US5] Add error boundary or error state UI to ProfileBio
- [x] T037 [US5] Add error boundary or error state UI to ContactInfo
- [x] T038 [US5] Verify TanStack Query caching works (revisit shows cached data instantly)

**Checkpoint**: User Story 5 complete - loading and error states handled gracefully

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanup and validation

- [x] T039 [P] Remove all remaining hardcoded placeholder data (verify SC-001: no "John Doe", "1.2k Followers", etc.)
- [x] T040 [P] Add console.error logging for API failures in development mode
- [x] T041 Run quickstart.md validation checklist
- [x] T042 Update profile component index exports in `client/components/pages/profile/index.ts`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - can start immediately
- **Phase 2 (Foundational)**: Depends on T001, T002 completion
- **Phase 3-7 (User Stories)**: All depend on Phase 2 completion
- **Phase 8 (Polish)**: Depends on all user stories being complete

### User Story Dependencies

| Story | Depends On | Can Parallelize With |
|-------|------------|---------------------|
| US1 (P1) | Phase 2 | US2, US3 (after Phase 2) |
| US2 (P1) | Phase 2 | US1, US3 (after Phase 2) |
| US3 (P2) | Phase 2 | US1, US2 (after Phase 2) |
| US4 (P2) | US1, US2, US3 | None (integrates all) |
| US5 (P3) | US1, US2, US3 | None (verifies all) |

### Within Each User Story

1. Accept userId prop first
2. Integrate hook
3. Replace hardcoded data
4. Add loading state
5. Story complete

### Parallel Opportunities

```bash
# Phase 1 - All in parallel:
T001, T002, T003

# After Phase 2 - User Stories 1, 2, 3 can start in parallel:
# Developer A: T006-T014 (US1)
# Developer B: T015-T019 (US2)  
# Developer C: T020-T025 (US3)

# Phase 8 - Polish tasks in parallel:
T039, T040
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T005)
3. Complete Phase 3: User Story 1 (T006-T014) - Real name/avatar/bio
4. Complete Phase 4: User Story 2 (T015-T019) - Real stats
5. **STOP and VALIDATE**: Profile shows real data for current user
6. Deploy MVP

### Incremental Delivery

| Increment | Stories | Value Delivered |
|-----------|---------|-----------------|
| MVP | US1 + US2 | Real profile data (name, avatar, stats) |
| +1 | US3 | Real contact info (email, join date) |
| +2 | US4 | View other users' profiles |
| +3 | US5 | Polished loading/error UX |

---

## Task Count Summary

| Phase | Tasks | Parallelizable |
|-------|-------|----------------|
| Setup | 3 | 3 |
| Foundational | 2 | 0 |
| US1 (P1) | 9 | 1 |
| US2 (P1) | 5 | 0 |
| US3 (P2) | 6 | 0 |
| US4 (P2) | 7 | 0 |
| US5 (P3) | 6 | 0 |
| Polish | 4 | 2 |
| **Total** | **42** | **6** |

---

## Notes

- Server endpoints already exist and are verified functional (no server tasks)
- All component tasks involve the same 4 files but update different aspects
- [P] tasks affect different files with no dependencies
- [Story] label maps task to user story for traceability
- Commit after each completed user story phase
- Run `npm run dev` in client/ to test changes
