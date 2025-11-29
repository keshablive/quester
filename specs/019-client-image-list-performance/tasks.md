# Tasks: Client Image & List Performance Optimization

**Feature**: 019-client-image-list-performance  
**Generated**: 2025-11-29  
**Total Tasks**: 52

---

## Phase 1: Setup

**Purpose**: Install dependencies and prepare project structure

- [ ] T001 Install expo-image and @shopify/flash-list via `npx expo install expo-image @shopify/flash-list` in client/
- [ ] T002 Run `npx expo doctor` to verify installation compatibility
- [ ] T003 [P] Create performance constants file at client/core/constants/performance.ts
- [ ] T004 [P] Create TypeScript barrel export at client/core/components/index.ts for new components

**Checkpoint**: Dependencies installed, project structure ready

---

## Phase 2: Foundational

**Purpose**: Create wrapper components that all user stories depend on - BLOCKS all user stories

- [ ] T005 Create OptimizedImage component wrapper at client/core/components/OptimizedImage.tsx
- [ ] T006 Create OptimizedImage types at client/core/components/OptimizedImage.types.ts
- [ ] T007 Create OptimizedList component wrapper at client/core/components/OptimizedList.tsx
- [ ] T008 Create OptimizedList types at client/core/components/OptimizedList.types.ts
- [ ] T009 [P] Create LazyRoute utility wrapper at client/core/routes/LazyRoute.tsx
- [ ] T010 [P] Create LazyRoute types at client/core/routes/LazyRoute.types.ts
- [ ] T011 [P] Create ErrorBoundary for chunk loading at client/core/components/ChunkErrorBoundary.tsx
- [ ] T012 Export new components from client/core/index.ts

**Checkpoint**: All foundational components ready for user story implementation

---

## Phase 3: User Story 1 - Fast Image Loading (Priority: P1)

**Goal**: Replace react-native Image with expo-image in 7 files for disk-based caching

**Independent Test**: Navigate to Learning/Marketplace screens, navigate away, return - images appear instantly (<100ms)

### Implementation for User Story 1

- [ ] T013 [P] [US1] Replace Image with OptimizedImage in client/components/pages/learning/CourseCard.tsx
- [ ] T014 [P] [US1] Replace Image with OptimizedImage in client/components/pages/learning/CourseDetail.tsx
- [ ] T015 [P] [US1] Replace Image with OptimizedImage in client/components/pages/learning/LearningLeaderboardWidget.tsx
- [ ] T016 [P] [US1] Replace Image with OptimizedImage in client/components/pages/learning/LearningAchievementsGrid.tsx
- [ ] T017 [P] [US1] Replace Image with OptimizedImage in client/components/pages/learning/InstructorBadgeAwardModal.tsx
- [ ] T018 [P] [US1] Replace Image with OptimizedImage in client/components/pages/marketplace/MarketplaceCard.tsx
- [ ] T019 [P] [US1] Replace Image with OptimizedImage in client/components/pages/marketplace/MarketplaceDetail.tsx
- [ ] T020 [US1] Verify cache behavior by checking Network tab - no re-downloads on revisit

**Checkpoint**: All 7 image files migrated, image caching verified (<100ms display on revisit)

---

## Phase 4: User Story 2 - Smooth List Scrolling (Priority: P1)

**Goal**: Replace FlatList/ScrollView with FlashList for 60fps smooth scrolling

**Independent Test**: Open achievements screen with 50+ items, scroll rapidly - no jank, 60fps maintained

### Implementation for User Story 2

- [ ] T021 [US2] Audit all FlatList usages via `grep -r "FlatList" client/components/` and document locations
- [ ] T022 [US2] Replace FlatList with OptimizedList in client/app/achievements.tsx with estimatedItemSize={80}
- [ ] T023 [P] [US2] Update any achievement-related list components to use OptimizedList
- [ ] T024 [P] [US2] Update any leaderboard list components to use OptimizedList
- [ ] T025 [P] [US2] Update any marketplace listing components to use OptimizedList
- [ ] T026 [US2] Implement pull-to-refresh in achievements.tsx using OptimizedList refreshing/onRefresh props (FR-010)
- [ ] T027 [US2] Implement infinite scroll pagination using onEndReached/onEndReachedThreshold props (FR-011)
- [ ] T028 [US2] Profile scroll performance using React DevTools - verify 60fps maintained

**Checkpoint**: List scrolling smooth at 60fps, FlashList migration complete with pull-to-refresh and pagination

---

## Phase 5: User Story 3 - Fast App Launch via Code Splitting (Priority: P2)

**Goal**: Lazy load admin, analytics, reports screens to reduce initial bundle by 15%

**Independent Test**: Measure bundle size before/after, verify admin/analytics/reports load with Suspense

### Implementation for User Story 3

- [ ] T029 [US3] Measure initial bundle size via `npx expo export --platform web` (baseline)
- [ ] T030 [US3] Create Suspense loading fallback component at client/core/components/LoadingFallback.tsx
- [ ] T031 [P] [US3] Wrap client/app/admin.tsx with React.lazy and Suspense using ChunkErrorBoundary
- [ ] T032 [P] [US3] Wrap client/app/analytics.tsx with React.lazy and Suspense using ChunkErrorBoundary
- [ ] T033 [P] [US3] Wrap client/app/reports.tsx with React.lazy and Suspense using ChunkErrorBoundary
- [ ] T034 [US3] Measure bundle size after code splitting - verify 15%+ reduction
- [ ] T035 [US3] Test chunk load failure scenario - verify error boundary retry works

**Checkpoint**: Bundle reduced by 15%+, lazy-loaded screens work with error handling

---

## Phase 6: User Story 4 - Responsive Auth State Updates (Priority: P2)

**Goal**: Split 727-line AuthContext into 3 focused contexts to reduce unnecessary re-renders by 60%

**Independent Test**: Toggle 2FA settings, verify unrelated screens (profile, quests) don't re-render (React DevTools)

### Implementation for User Story 4

- [ ] T036 [US4] Create contexts directory at client/core/auth/contexts/
- [ ] T037 [US4] Create CoreAuthContext at client/core/auth/contexts/CoreAuthContext.tsx (user, tokens, signIn, signOut)
- [ ] T038 [US4] Create TwoFactorContext at client/core/auth/contexts/TwoFactorContext.tsx (2FA state, submitCode)
- [ ] T039 [US4] Create BiometricContext at client/core/auth/contexts/BiometricContext.tsx (biometric state, enable/disable)
- [ ] T040 [US4] Create hooks directory at client/core/auth/hooks/
- [ ] T041 [P] [US4] Create useCoreAuth hook at client/core/auth/hooks/useCoreAuth.ts
- [ ] T042 [P] [US4] Create useTwoFactor hook at client/core/auth/hooks/useTwoFactor.ts
- [ ] T043 [P] [US4] Create useBiometricAuth hook at client/core/auth/hooks/useBiometricAuth.ts
- [ ] T044 [US4] Create AuthProviders composite at client/core/auth/providers/AuthProviders.tsx (wraps all 3 contexts)
- [ ] T045 [US4] Update useAuth hook in client/core/auth/AuthContext.tsx to use composite pattern (backward compatible)
- [ ] T046 [US4] Update client/app/_layout.tsx to use new AuthProviders wrapper
- [ ] T047 [US4] Profile re-renders using React DevTools - verify 60% reduction for non-auth operations

**Checkpoint**: AuthContext split complete, useAuth() backward compatible, re-renders reduced by 60%

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, cleanup, and validation across all user stories

- [ ] T048 [P] Update client/core/index.ts with all new exports (OptimizedImage, OptimizedList, hooks)
- [ ] T049 [P] Update client/core/auth/index.ts with new auth exports (contexts, hooks, providers)
- [ ] T050 Run quickstart.md validation checklist - verify all items pass
- [ ] T051 Update client/IMPORT_PATTERNS.md with new component import patterns
- [ ] T052 Final performance verification - all 4 success criteria met (images <100ms, 60fps, 15% bundle, 60% re-render reduction)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational (T005-T006 OptimizedImage)
- **User Story 2 (Phase 4)**: Depends on Foundational (T007-T008 OptimizedList)
- **User Story 3 (Phase 5)**: Depends on Foundational (T009-T011 LazyRoute, ErrorBoundary)
- **User Story 4 (Phase 6)**: Can start after Foundational - no dependency on other stories
- **Polish (Phase 7)**: Depends on all desired user stories being complete

**Note**: US2 now includes explicit tasks for FR-010 (pull-to-refresh) and FR-011 (infinite scroll/pagination)

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - Independent of other stories
- **User Story 2 (P1)**: Can start after Foundational - Independent of other stories  
- **User Story 3 (P2)**: Can start after Foundational - Independent of other stories
- **User Story 4 (P2)**: Can start after Foundational - Independent of other stories

### Within Each User Story

- Create wrapper components before migration tasks
- Migrate files in parallel where marked [P]
- Verify performance after migration complete

### Parallel Opportunities

**Setup Phase (T001-T004)**: T003 and T004 can run in parallel after T001-T002

**Foundational Phase (T005-T012)**:
- T005-T006 (OptimizedImage) in parallel with T007-T008 (OptimizedList)
- T009-T010 (LazyRoute) in parallel with T011 (ErrorBoundary)

**User Story 1 (T013-T020)**: T013-T019 (all 7 file migrations) can run in parallel

**User Story 2 (T021-T028)**: T023-T025 can run in parallel after T022; T026-T027 sequential after list migration

**User Story 3 (T029-T035)**: T031-T033 (all 3 lazy routes) can run in parallel

**User Story 4 (T036-T047)**: T041-T043 (all 3 hooks) can run in parallel

---

## Parallel Example: User Story 1

```bash
# All 7 image file migrations can run in parallel:
Task: "Replace Image with OptimizedImage in client/components/pages/learning/CourseCard.tsx"
Task: "Replace Image with OptimizedImage in client/components/pages/learning/CourseDetail.tsx"
Task: "Replace Image with OptimizedImage in client/components/pages/learning/LearningLeaderboardWidget.tsx"
Task: "Replace Image with OptimizedImage in client/components/pages/learning/LearningAchievementsGrid.tsx"
Task: "Replace Image with OptimizedImage in client/components/pages/learning/InstructorBadgeAwardModal.tsx"
Task: "Replace Image with OptimizedImage in client/components/pages/marketplace/MarketplaceCard.tsx"
Task: "Replace Image with OptimizedImage in client/components/pages/marketplace/MarketplaceDetail.tsx"
```

---

## Parallel Example: User Story 4

```bash
# All 3 specialized hooks can run in parallel:
Task: "Create useCoreAuth hook at client/core/auth/hooks/useCoreAuth.ts"
Task: "Create useTwoFactor hook at client/core/auth/hooks/useTwoFactor.ts"
Task: "Create useBiometricAuth hook at client/core/auth/hooks/useBiometricAuth.ts"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: Foundational (T005-T012)
3. Complete Phase 3: User Story 1 - Image Loading (T013-T020)
4. **STOP and VALIDATE**: Images display <100ms on revisit
5. Complete Phase 4: User Story 2 - List Scrolling (T021-T026)
6. **STOP and VALIDATE**: 60fps scrolling achieved
7. Deploy/demo MVP - immediate user benefit

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. User Story 1 (Images) → Test → Deploy (visible improvement!)
3. User Story 2 (Lists) → Test → Deploy (smooth scrolling!)
4. User Story 3 (Code Split) → Test → Deploy (faster launch!)
5. User Story 4 (AuthContext) → Test → Deploy (responsive UI!)

### Parallel Team Strategy

With 2+ developers:

1. Team completes Setup + Foundational together
2. Once Foundational done:
   - Developer A: User Story 1 (Images) + User Story 2 (Lists)
   - Developer B: User Story 3 (Code Split) + User Story 4 (AuthContext)
3. Stories integrate independently via barrel exports

---

## Task Summary

| Phase | Task Range | Count | Key Deliverable |
|-------|------------|-------|-----------------|
| Setup | T001-T004 | 4 | Dependencies installed |
| Foundational | T005-T012 | 8 | Wrapper components ready |
| US1: Images | T013-T020 | 8 | 7 files migrated to expo-image |
| US2: Lists | T021-T028 | 8 | FlashList migration + pull-to-refresh + pagination |
| US3: Code Split | T029-T035 | 7 | 3 routes lazy-loaded |
| US4: AuthContext | T036-T047 | 12 | Context split, backward compatible |
| Polish | T048-T052 | 5 | Documentation, validation |
| **Total** | **T001-T052** | **52** | **All 4 user stories complete** |

---

## Notes

- [P] tasks = different files, no dependencies - can run in parallel
- [US#] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All changes are client-side only - no database migrations needed
- Existing `useAuth()` hook maintained for backward compatibility
