# Implementation Plan: Complete TanStack Query Migration Phase 2

**Branch**: `022-client-tanstack-phase2` | **Date**: 2025-11-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/022-client-tanstack-phase2/spec.md`

## Summary

Complete the TanStack Query migration by creating 13 new hooks (query + mutation) across 6 domains (achievements, badges, quests, admin, analytics, social) and migrating 7 remaining components from useState/useEffect patterns. Building on the established infrastructure from specs 020/021, this phase focuses on extending the `queryKeys` factory, creating domain-specific hooks, and migrating components to achieve unified caching, offline support, and optimistic updates.

## Technical Context

**Language/Version**: TypeScript 5.x  
**Primary Dependencies**: React 19.1, React Native 0.81.5, Expo 54, TanStack Query 5.90  
**Storage**: AsyncStorage (offline persistence), REST API  
**Testing**: Jest, React Testing Library  
**Target Platform**: iOS, Android (React Native via Expo)  
**Project Type**: Mobile application (client-only changes)  
**Performance Goals**: <100ms cached load, <50ms optimistic updates, 60fps scroll  
**Constraints**: 200 posts max in memory (infinite scroll), 5-minute default stale time, offline-capable  
**Scale/Scope**: ~50 screens, 13 hooks to create, 7 components to migrate

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Research Check (PASSED)

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. Multi-Tenancy** | ✅ PASS | Client-only changes; tenantID extracted from JWT by existing auth layer |
| **II. Security First** | ✅ PASS | No sensitive data logging; existing auth patterns reused |
| **III. Type Safety** | ✅ PASS | All hooks will have explicit TypeScript types; no `any` usage |
| **IV. Error Handling** | ✅ PASS | Mutations revert on error; toast with retry button per FR-024 |
| **V. State Management** | ✅ PASS | TanStack Query for server state; minimal React context |
| **VI. Consistency** | ✅ PASS | Following patterns established in specs 020/021 |
| **VII. Observability** | ✅ PASS | React Query DevTools available; errors logged |

### Post-Design Re-Check (PASSED)

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. Multi-Tenancy** | ✅ PASS | No tenant isolation changes; existing service layer handles tenancy |
| **II. Security First** | ✅ PASS | Contracts use typed responses; no PII in query keys |
| **III. Type Safety** | ✅ PASS | All contracts define explicit types; UseQueryResult/UseMutationResult typed |
| **IV. Error Handling** | ✅ PASS | Optimistic context types defined for rollback; error toasts specified |
| **V. State Management** | ✅ PASS | 6 new query domains added; stale times documented |
| **VI. Consistency** | ✅ PASS | Query key pattern matches existing; hook naming follows convention |
| **VII. Observability** | ✅ PASS | dataUpdatedAt exposed for StaleDataIndicator; isFetching for refresh indicator |

**Constitution Gate: PASSED** - No violations requiring justification.

## Project Structure

### Documentation (this feature)

```text
specs/022-client-tanstack-phase2/
├── plan.md              # This file
├── research.md          # Phase 0 output - service method audit
├── data-model.md        # Phase 1 output - hook interfaces
├── quickstart.md        # Phase 1 output - migration guide
├── contracts/           # Phase 1 output - TypeScript interfaces
│   ├── query-keys.ts    # Extended queryKeys factory
│   ├── achievements.ts  # Achievement hook interfaces
│   ├── badges.ts        # Badge hook interfaces
│   ├── quests.ts        # Quest hook interfaces
│   ├── admin.ts         # Admin hook interfaces
│   ├── analytics.ts     # Analytics hook interfaces
│   └── social.ts        # Social hook interfaces
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (client directory)

```text
client/
├── core/
│   ├── hooks/
│   │   ├── queries/
│   │   │   ├── useAchievements.ts    # NEW: FR-001, FR-004
│   │   │   ├── useBadges.ts          # NEW: FR-002, FR-003, FR-004
│   │   │   ├── useAdmin.ts           # NEW: FR-009, FR-010, FR-011
│   │   │   ├── useAnalytics.ts       # EXTEND: FR-012, FR-013, FR-014
│   │   │   ├── useSocialFeed.ts      # NEW: FR-015, FR-017
│   │   │   ├── useGroups.ts          # NEW: FR-018
│   │   │   └── index.ts              # Export barrel
│   │   └── mutations/
│   │       ├── useQuestMutations.ts  # NEW: FR-006, FR-007
│   │       ├── useSocialMutations.ts # NEW: FR-016
│   │       └── index.ts              # Export barrel
│   ├── query/
│   │   ├── keys.ts                   # EXTEND: Add achievements, badges, admin, social keys
│   │   └── config.ts                 # EXTEND: Add new stale times if needed
│   └── types/
│       └── query.types.ts            # EXTEND: Add new response types
├── components/
│   └── pages/
│       ├── achievements/
│       │   └── AchievementsList.tsx  # CREATE or MIGRATE
│       ├── badges/
│       │   └── BadgesList.tsx        # CREATE or MIGRATE  
│       ├── admin/
│       │   └── AdminDashboard.tsx    # MIGRATE: to useAdminStats
│       ├── analytics/
│       │   └── AnalyticsDashboard.tsx # VERIFY: already migrated
│       └── communicate/
│           ├── Social/
│           │   └── SocialFeed.tsx    # MIGRATE: to useInfiniteSocialPosts
│           └── Groups/
│               ├── GroupList.tsx     # MIGRATE: to useGroups
│               └── GroupDetail.tsx   # CREATE: route exists, component missing
```

**Structure Decision**: Client-only mobile structure following established Quester patterns. All hooks in `client/core/hooks/`, all components in `client/components/pages/`.

## Research Findings (Phase 0 Pre-filled)

### Existing Infrastructure Status

| Asset | Location | Status |
|-------|----------|--------|
| QueryProvider | `client/core/query/QueryProvider.tsx` | ✅ Complete with offline persistence |
| queryKeys factory | `client/core/query/keys.ts` | ⚠️ Missing: achievements, badges, admin, social feed |
| Stale time config | `client/core/query/config.ts` | ✅ Has most domains, may need extensions |
| Cache invalidation | `client/core/query/invalidation.ts` | ⚠️ Missing social feed invalidation |

### Existing Services Audit

| Service | File | Methods Available | Hook Status |
|---------|------|-------------------|-------------|
| gamificationService | `gamificationApi.ts` | `getAchievements`, `getUserBadges`, `getBadges`, `claimAchievement` | ❌ No hooks |
| questService | `questApi.ts` | `getQuests`, `getQuestProgress`, `completeStep` | ⚠️ Partial (useQuests exists) |
| adminService | `adminApi.ts` | `getStats`, `getKeys`, `getAuditLog`, `rotateDEK` | ❌ No hooks |
| analyticsService | `analyticsApi.ts` | `getUserAnalytics`, `getEngagement` | ✅ useAnalytics exists |
| socialService | `socialApi.ts` | `getFeed`, `getPosts`, `likePost`, `createPost` | ⚠️ Partial (follower hooks only) |
| groupService | `groupApi.ts` | `getGroups`, `getGroup`, `createGroup`, `joinGroup`, `leaveGroup` | ❌ No hooks |

### Component Migration Status

| Component | Current State | Action Required |
|-----------|---------------|-----------------|
| AchievementsList.tsx | Does NOT exist | CREATE with useAchievements |
| BadgesList.tsx | Does NOT exist | CREATE with useBadges |
| ProfileAchievements.tsx | Uses direct service call | MIGRATE to useAchievements |
| QuestDetail.tsx | ✅ Already migrated | VERIFY only |
| AdminDashboard.tsx | Uses useState/useEffect | MIGRATE to useAdminStats |
| AnalyticsDashboard.tsx | ✅ Already migrated | VERIFY only |
| SocialFeed.tsx | Uses useState with socialService | MIGRATE to useInfiniteSocialPosts |
| GroupList.tsx | Uses useState with groupService | MIGRATE to useGroups |
| GroupDetail.tsx | Does NOT exist | CREATE with useGroup |

### Missing Query Keys (to add to keys.ts)

```typescript
achievements: {
  all: ['achievements'] as const,
  list: (filters?: AchievementFilters) => [...queryKeys.achievements.all, 'list', filters] as const,
  detail: (id: string) => [...queryKeys.achievements.all, 'detail', id] as const,
  user: (userId: string) => [...queryKeys.achievements.all, 'user', userId] as const,
},
badges: {
  all: ['badges'] as const,
  list: () => [...queryKeys.badges.all, 'list'] as const,
  user: (userId: string) => [...queryKeys.badges.all, 'user', userId] as const,
  detail: (id: string) => [...queryKeys.badges.all, 'detail', id] as const,
},
admin: {
  all: ['admin'] as const,
  stats: () => [...queryKeys.admin.all, 'stats'] as const,
  users: (filters?: AdminUserFilters) => [...queryKeys.admin.all, 'users', filters] as const,
  keys: () => [...queryKeys.admin.all, 'keys'] as const,
  auditLog: () => [...queryKeys.admin.all, 'auditLog'] as const,
},
social: {
  // Extend existing social keys
  feed: () => [...queryKeys.social.all, 'feed'] as const,
  feedInfinite: () => [...queryKeys.social.all, 'feed', 'infinite'] as const,
  post: (id: string) => [...queryKeys.social.all, 'post', id] as const,
  groups: () => [...queryKeys.social.all, 'groups'] as const,
  group: (id: string) => [...queryKeys.social.all, 'group', id] as const,
  groupMembers: (groupId: string) => [...queryKeys.social.all, 'group', groupId, 'members'] as const,
},
```

## Complexity Tracking

> No constitution violations - section intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |
