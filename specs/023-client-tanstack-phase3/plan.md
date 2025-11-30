# Implementation Plan: Client TanStack Query Migration Phase 3

**Branch**: `023-client-tanstack-phase3` | **Date**: 2025-01-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/023-client-tanstack-phase3/spec.md`

## Summary

Complete migration of 9 remaining pages from useState/useEffect data fetching to TanStack Query v5 with:
- Tiered stale times (Dashboard 30s, Quests/Achievements 2min, Learning/Badges 5min, Notifications/Transactions 1min)
- Offline support with 24-hour cache persistence via AsyncStorage
- Skeleton loading states using shadcn/ui components
- Error boundaries with retry functionality (3 retries, exponential backoff)
- Optimistic updates for mutations with rollback on error
- Infinite scroll with 20 items per page
- Block mutations when offline with clear messaging

## Technical Context

**Language/Version**: TypeScript 5.x, React Native with Expo  
**Primary Dependencies**: TanStack Query v5, NativeWind, React Native Reusables (@shadcn)  
**Storage**: AsyncStorage for query cache persistence  
**Testing**: Manual testing per acceptance scenarios  
**Target Platform**: iOS, Android (Expo managed workflow)  
**Project Type**: Mobile application (Expo/React Native)  
**Performance Goals**: <100ms cached data display, <50ms optimistic update visual feedback  
**Constraints**: Offline-capable, 24-hour cache GC, mutations blocked when offline  
**Scale/Scope**: 9 pages to migrate, ~15 query hooks, ~5 mutation hooks

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence/Action |
|-----------|--------|-----------------|
| **I. Multi-Tenancy** | ✅ N/A | Client-side only; tenant isolation enforced by server APIs |
| **II. Security First** | ✅ Pass | No sensitive data in cache; tokens handled by AuthContext |
| **III. Type Safety** | ✅ Pass | All hooks use explicit TypeScript types; no `any` types |
| **IV. Error Handling** | ✅ Pass | ErrorState component with retry; optimistic rollback on error |
| **V. Context/State Management** | ✅ Pass | TanStack Query provides global cache state; React Context for auth |
| **VI. Consistency & Pattern Adherence** | ✅ Pass | Following Phase 2 established patterns; reusing existing hooks |
| **VII. Observability** | ✅ Pass | Error logging via console; toast notifications for failures |

## Project Structure

### Documentation (this feature)

```text
specs/023-client-tanstack-phase3/
├── plan.md              # This file
├── research.md          # Phase 0 output - clarified decisions documented
├── data-model.md        # Phase 1 output - entity types & query patterns
├── quickstart.md        # Phase 1 output - migration guide
├── contracts/           # Phase 1 output - N/A (no new APIs)
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
client/
├── app/
│   ├── achievements.tsx    # MIGRATE: useState → useAchievements hook
│   ├── badges.tsx          # MIGRATE: useState → useBadges hook
│   ├── dashboard.tsx       # MIGRATE: Already uses hook-based components
│   ├── learning.tsx        # MIGRATE: Already uses hooks, verify integration
│   ├── quests.tsx          # MIGRATE: Add useQuest hook integration
│   └── marketplace.tsx     # VERIFY: Uses MarketplaceList component
│
├── components/
│   ├── pages/
│   │   ├── achievements/
│   │   │   └── AchievementsList.tsx  # EXISTS: Already migrated in Phase 2
│   │   ├── badges/
│   │   │   └── BadgesList.tsx        # EXISTS: Already migrated in Phase 2
│   │   ├── marketplace/
│   │   │   └── MarketplaceList.tsx   # EXISTS: Already uses TanStack Query
│   │   ├── transactions/
│   │   │   └── TransactionList.tsx   # EXISTS: Already uses TanStack Query
│   │   ├── notifications/
│   │   │   └── NotificationList.tsx  # EXISTS: Already uses TanStack Query
│   │   ├── dashboard/
│   │   │   ├── StatsCards.tsx        # MIGRATE: Add useDashboardStats hook
│   │   │   ├── RecentActivity.tsx    # MIGRATE: Add useRecentActivity hook
│   │   │   └── QuickActions.tsx      # MIGRATE: Add useQuickActions hook
│   │   ├── quests/
│   │   │   └── QuestList.tsx         # MIGRATE: Verify TanStack Query usage
│   │   └── learning/
│   │       └── CourseList.tsx        # VERIFY: Check TanStack Query usage
│   │
│   └── shared/
│       ├── ErrorState.tsx            # EXISTS: Reuse
│       ├── OfflineIndicator.tsx      # EXISTS: Reuse
│       ├── StaleDataIndicator.tsx    # EXISTS: Reuse
│       └── MutationErrorToast.tsx    # EXISTS: Reuse
│
└── core/
    ├── hooks/
    │   ├── queries/
    │   │   ├── useAchievements.ts    # EXISTS: Phase 2
    │   │   ├── useBadges.ts          # EXISTS: Phase 2
    │   │   ├── useDashboard.ts       # EXISTS: Phase 2
    │   │   ├── useQuests.ts          # EXISTS: Phase 2
    │   │   ├── useNotifications.ts   # EXISTS: Phase 2
    │   │   ├── useTransactions.ts    # EXISTS: Phase 2
    │   │   ├── useMarketplace.ts     # EXISTS: Phase 2
    │   │   └── useCourses.ts         # EXISTS: Phase 2
    │   │
    │   └── mutations/
    │       ├── useQuestMutations.ts      # CREATE: Quest completion optimistic updates
    │       ├── useMarketplaceMutations.ts # CREATE: Purchase optimistic updates
    │       └── useNotificationMutations.ts # EXISTS: Phase 2
    │
    └── query/
        ├── keys.ts           # EXISTS: Query key factory
        ├── constants.ts      # UPDATE: Add tiered stale times
        └── persister.ts      # EXISTS: AsyncStorage persistence
```

**Structure Decision**: Mobile app structure using Expo Router with feature-based component organization. Leverages existing Phase 2 infrastructure (query hooks, shared components, persister).

## Constitution Check (Post-Design)

*Re-evaluated after Phase 1 design completion*

| Principle | Status | Post-Design Evidence |
|-----------|--------|---------------------|
| **I. Multi-Tenancy** | ✅ N/A | Client-only; no direct tenant data access |
| **II. Security First** | ✅ Pass | No sensitive data logged; cache contains only display data |
| **III. Type Safety** | ✅ Pass | All types defined in `core/types/query.types.ts`; strict TypeScript |
| **IV. Error Handling** | ✅ Pass | ErrorState component; mutation rollback; toast notifications |
| **V. Context/State** | ✅ Pass | TanStack Query cache; no prop drilling for data |
| **VI. Consistency** | ✅ Pass | Following Phase 2 patterns exactly; reusing existing hooks |
| **VII. Observability** | ✅ Pass | Console logging for errors; DevTools support |

## Complexity Tracking

> No constitution violations requiring justification.

| Decision | Rationale | Alternative Rejected |
|----------|-----------|---------------------|
| Reuse Phase 2 hooks | Hooks already implement TanStack Query correctly | Creating new hooks would duplicate code |
| Update route files only | Components already migrated in Phase 2 | Full component rewrites unnecessary |
| Tiered stale times | Different data types have different freshness needs | Single stale time doesn't fit all use cases |

## Generated Artifacts

| Artifact | Path | Status |
|----------|------|--------|
| Implementation Plan | `specs/023-client-tanstack-phase3/plan.md` | ✅ Complete |
| Research Document | `specs/023-client-tanstack-phase3/research.md` | ✅ Complete |
| Data Model | `specs/023-client-tanstack-phase3/data-model.md` | ✅ Complete |
| Quickstart Guide | `specs/023-client-tanstack-phase3/quickstart.md` | ✅ Complete |
| Agent Context | `.github/agents/copilot-instructions.md` | ✅ Updated |

## Next Steps

Run `/speckit.tasks` to generate the detailed task breakdown for implementation.
