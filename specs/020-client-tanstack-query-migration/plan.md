# Implementation Plan: Client TanStack Query Migration

**Branch**: `020-client-tanstack-query-migration` | **Date**: 2025-11-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/020-client-tanstack-query-migration/spec.md`

## Summary

Migrate 6 client components from manual `useState`/`useEffect` data fetching patterns to TanStack Query hooks for automatic caching (differentiated stale times: 1min financial, 5min catalog), offline persistence via AsyncStorage, request deduplication, and optimistic updates. Builds on existing TanStack Query v5 infrastructure in `core/query/`.

## Technical Context

**Language/Version**: TypeScript 5.x with React Native (Expo 54)  
**Primary Dependencies**: @tanstack/react-query ^5.90.11, @tanstack/query-async-storage-persister ^5.90.13, @shopify/flash-list 2.0.2  
**Storage**: AsyncStorage for cache persistence (already configured)  
**Testing**: Jest with React Testing Library  
**Target Platform**: iOS, Android, Web (Expo universal)
**Project Type**: Mobile-first with web support (client directory)  
**Performance Goals**: <100ms cached data display, 60fps infinite scroll, <50ms optimistic updates  
**Constraints**: Offline-capable, <50MB cache memory, 24-hour cache retention  
**Scale/Scope**: 6 components to migrate, ~12 new query/mutation hooks

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Multi-Tenancy | ✅ N/A | Client-side only; API endpoints already enforce tenant isolation |
| II. Security First | ✅ PASS | No sensitive data in cache keys; AsyncStorage encrypted on device |
| III. Type Safety | ✅ PASS | All hooks will have explicit TypeScript types; no `any` usage |
| IV. Error Handling | ✅ PASS | TanStack Query provides typed error handling; FR-007 specifies 3 retries |
| V. Context Propagation | ✅ PASS | React Query context via QueryProvider; no prop drilling |
| VI. Consistency | ✅ PASS | Following existing patterns in `core/hooks/queries/` (useSocial, useCourses) |
| VII. Observability | ✅ PASS | FR-014 requires dev-only cache logging; existing cacheMonitor.ts |

**Gate Status**: ✅ PASS - No violations; proceed to Phase 0

## Project Structure

### Documentation (this feature)

```text
specs/020-client-tanstack-query-migration/
├── plan.md              # This file
├── research.md          # Phase 0 output - TanStack Query patterns research
├── data-model.md        # Phase 1 output - Query/cache data structures
├── quickstart.md        # Phase 1 output - Migration guide for each component
├── contracts/           # Phase 1 output - Hook interfaces and types
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
client/
├── core/
│   ├── query/
│   │   ├── constants.ts       # MODIFY: Add TRANSACTIONS, MARKETPLACE stale times
│   │   ├── keys.ts            # MODIFY: Add transactions, marketplace query keys
│   │   └── [existing files]   # No changes needed
│   ├── hooks/
│   │   ├── queries/
│   │   │   ├── useTransactions.ts    # NEW: Transaction query hooks
│   │   │   ├── useMarketplace.ts     # NEW: Marketplace query hooks
│   │   │   ├── useCertificates.ts    # NEW: Certificate query hooks
│   │   │   └── index.ts              # MODIFY: Export new hooks
│   │   └── mutations/
│   │       ├── useNotificationSettingsMutations.ts  # NEW: Optimistic updates
│   │       └── index.ts              # MODIFY: Export new hooks
│   └── types/
│       └── query.types.ts     # MODIFY: Add Transaction, Marketplace types
├── components/
│   ├── pages/
│   │   ├── transactions/
│   │   │   └── TransactionList.tsx   # MODIFY: Replace useState with useTransactions
│   │   └── marketplace/
│   │       └── MarketplaceList.tsx   # MODIFY: Replace useState with useMarketplace
│   └── shared/
│       ├── InfiniteScrollList.tsx    # MODIFY: Add FlashList option, improve query integration
│       └── FollowLists.tsx           # MODIFY: Use useInfiniteQuery
└── app/
    └── notifications.tsx      # MODIFY: Use useNotificationSettings with optimistic updates
```

**Structure Decision**: Using existing client structure with modifications. New hooks follow established pattern in `core/hooks/queries/`. No new directories needed.

## Complexity Tracking

> **No violations identified - Constitution Check passed**

| Item | Justification |
|------|---------------|
| Existing TanStack Query infrastructure | Reusing `core/query/` patterns - no new architecture |
| FlashList already available | Using `@shopify/flash-list` via `OptimizedList` wrapper |
| AsyncStorage persistence configured | Using existing `@tanstack/query-async-storage-persister` setup |

## Post-Design Constitution Re-Check

*Re-evaluated after Phase 1 design completion.*

| Principle | Status | Design Artifacts |
|-----------|--------|------------------|
| I. Multi-Tenancy | ✅ N/A | No tenant data exposed in cache keys |
| II. Security First | ✅ PASS | Query keys use IDs only, no PII; AsyncStorage device-encrypted |
| III. Type Safety | ✅ PASS | All hooks typed in `contracts/hooks.md`; filter interfaces defined |
| IV. Error Handling | ✅ PASS | `onError` rollback in mutations; toast notifications per FR-013 |
| V. Context Propagation | ✅ PASS | QueryClient via context; no prop drilling in design |
| VI. Consistency | ✅ PASS | Hooks follow `useFollowStats` pattern; keys follow `queryKeys` factory |
| VII. Observability | ✅ PASS | Dev-only logging via `cacheMonitor.ts` extension |

**Final Gate Status**: ✅ PASS - Design approved for implementation

## Generated Artifacts

| Artifact | Path | Status |
|----------|------|--------|
| Implementation Plan | `plan.md` | ✅ Complete |
| Research | `research.md` | ✅ Complete |
| Data Model | `data-model.md` | ✅ Complete |
| Hook Contracts | `contracts/hooks.md` | ✅ Complete |
| Query Key Contracts | `contracts/query-keys.md` | ✅ Complete |
| Quickstart Guide | `quickstart.md` | ✅ Complete |
| Agent Context | `.github/agents/copilot-instructions.md` | ✅ Updated |
