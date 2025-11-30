# Implementation Plan: Complete TanStack Query Component Integration

**Branch**: `021-client-tanstack-completion` | **Date**: November 30, 2025 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/021-client-tanstack-completion/spec.md`

## Summary

Complete the TanStack Query migration by wiring existing query hooks into the remaining page components that still use manual `useState`/`useEffect` patterns. The infrastructure (query client, hooks, persistence) is already built in spec 020. This is primarily an **integration task** — updating 4 components to use pre-built hooks, adding empty states with action prompts, and implementing optimistic updates for notification settings.

## Technical Context

**Language/Version**: TypeScript 5.x, React 19.1, React Native 0.81.5  
**Primary Dependencies**: TanStack Query 5.90, Expo Router 6.x, NativeWind 4.2, @shopify/flash-list 2.0  
**Storage**: AsyncStorage (via @tanstack/query-async-storage-persister for cache persistence)  
**Testing**: Manual testing checklist per component (cache, offline, refresh, error handling)  
**Target Platform**: iOS 15+, Android API 24+, Expo 54  
**Project Type**: Mobile (React Native/Expo)  
**Performance Goals**: <100ms cached loads, <50ms optimistic updates, 60fps scroll  
**Constraints**: Offline-capable, differentiated stale times (1min transactions, 5min marketplace)  
**Scale/Scope**: 6 components to verify/update, 2 new mutations needed

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Multi-Tenancy | N/A | Client-side only; server enforces tenant isolation |
| II. Security First | ✅ Pass | No sensitive data logged; API tokens handled by existing auth layer |
| III. Type Safety | ✅ Pass | All hooks have explicit TypeScript types; no `any` usage |
| IV. Error Handling | ✅ Pass | TanStack Query provides error states; retry via `refetch` |
| V. State Management | ✅ Pass | Using TanStack Query for server state; React Context for auth |
| VI. Consistency | ✅ Pass | Following existing patterns from TransactionList, FollowLists |
| VII. Observability | ⚠️ Partial | No logging added; TanStack DevTools available in dev |

**Gate Status**: ✅ PASS (Observability is optional for client-side caching)

## Project Structure

### Documentation (this feature)

```text
specs/021-client-tanstack-completion/
├── spec.md              # Feature specification (complete)
├── plan.md              # This file
├── research.md          # Phase 0 output (migration audit)
├── data-model.md        # Phase 1 output (N/A - no new data models)
├── quickstart.md        # Phase 1 output (testing checklist)
├── contracts/           # Phase 1 output (N/A - no API changes)
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
client/
├── app/                           # Expo Router screens (thin wrappers)
│   ├── transactions.tsx           # ✅ Already correct
│   ├── marketplace.tsx            # ✅ Already correct
│   ├── settings.tsx               # Uses NotificationSettings component
│   └── learning.tsx               # Uses CertificateList component
├── components/
│   ├── pages/
│   │   ├── transactions/
│   │   │   ├── TransactionList.tsx    # ✅ Already migrated (useInfiniteTransactions)
│   │   │   └── TransactionDetail.tsx  # 🔴 NEEDS MIGRATION (useState/useEffect)
│   │   ├── marketplace/
│   │   │   ├── MarketplaceList.tsx    # ✅ Already migrated (useInfiniteMarketplace*)
│   │   │   └── MarketplaceDetail.tsx  # 🔴 NEEDS MIGRATION (useState/useEffect)
│   │   ├── settings/
│   │   │   └── NotificationSettings.tsx  # 🔴 NEEDS MIGRATION (useState only)
│   │   └── learning/
│   │       ├── CertificateList.tsx    # ✅ Already migrated (useCertificates)
│   │       └── CertificateCard.tsx    # ✅ Uses props from list
│   └── shared/
│       ├── FollowLists.tsx            # ✅ Already migrated (useFollowers/useFollowing)
│       └── InfiniteScrollList.tsx     # ✅ Query mode available
├── core/
│   ├── hooks/
│   │   ├── queries/
│   │   │   ├── useTransactions.ts     # ✅ Hook ready
│   │   │   ├── useMarketplace.ts      # ✅ Hook ready
│   │   │   ├── useCertificates.ts     # ✅ Hook ready
│   │   │   └── useNotificationSettings.ts  # ✅ Hook ready (with mutation)
│   │   └── mutations/
│   │       └── index.ts               # Export point for mutations
│   └── query/
│       ├── client.ts                  # QueryClient configuration
│       ├── keys.ts                    # Type-safe query key factory
│       ├── constants.ts               # STALE_TIMES, GC_TIME
│       └── invalidation.ts            # Cache invalidation mapping
└── templates/                         # Component scaffolding
```

**Structure Decision**: Using existing mobile structure. No new directories needed.

## Migration Audit Summary

| Component | Current State | Migration Required | Priority |
|-----------|---------------|-------------------|----------|
| `TransactionList.tsx` | Uses `useInfiniteTransactions` | None | - |
| `TransactionDetail.tsx` | Uses `useState`/`useEffect` | Wire `useTransaction` hook | P1 |
| `MarketplaceList.tsx` | Uses `useInfiniteMarketplace*` | None | - |
| `MarketplaceDetail.tsx` | Uses `useState`/`useEffect` | Wire `useMarketplaceProperty`/`useMarketplaceClassified` | P1 |
| `NotificationSettings.tsx` | Uses `useState` only | Wire `useNotificationSettings` + `useUpdateNotificationSettings` | P2 |
| `CertificateList.tsx` | Uses `useCertificates` | None | - |
| `CertificateCard.tsx` | Pure presentational | None | - |
| `FollowLists.tsx` | Uses `useFollowers`/`useFollowing` | None | - |

**Components requiring migration: 3 (TransactionDetail, MarketplaceDetail, NotificationSettings)**

## Complexity Tracking

No constitution violations to justify. Feature is a straightforward integration task.

---

## Phase 0: Research Output

See [research.md](./research.md) for:
- Hook availability audit (all hooks confirmed ready)
- Current implementation patterns analysis
- Migration pattern from existing migrated components

## Phase 1: Design Output

### Data Model

No new data models required. Existing types in `core/types/query.types.ts` are sufficient:
- `Transaction`
- `Property`
- `ClassifiedAd`
- `NotificationSettings`

### Contracts

No API contract changes required. Existing services are used:
- `transactionsService.get(id)`
- `propertiesService.get(id)`
- `classifiedsService.get(id)`
- `notificationsService.getSettings()`
- `notificationsService.updateSettings(updates)`

### Quickstart / Testing Checklist

See [quickstart.md](./quickstart.md) for manual testing checklist per component.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
