# Implementation Plan: Client Performance Optimization

**Branch**: `018-client-performance` | **Date**: 2025-11-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/018-client-performance/spec.md`

## Summary

Optimize Quester client application by removing mock data fallbacks that hide production errors, adding React.memo to list components for scroll performance, fixing useEffect dependency issues, migrating deprecated hooks to TanStack Query, eliminating `any` types, and adding AbortController support for request cancellation.

## Technical Context

**Language/Version**: TypeScript 5.9, React 19.1.0, React Native 0.81.5
**Primary Dependencies**: Expo 54, TanStack Query 5.90, NativeWind 4.2, expo-router 6.0
**Storage**: AsyncStorage (TanStack Query persister)
**Testing**: React DevTools Profiler (render performance validation)
**Target Platform**: iOS, Android, Web (Expo universal)
**Project Type**: Mobile/Web cross-platform application
**Performance Goals**: 55+ fps scroll performance, <10s request timeout
**Constraints**: Moderate optimization - fix known issues, maintain readability
**Scale/Scope**: ~50 components, 15+ API services, 20+ query hooks

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Multi-Tenancy | ✅ N/A | Client-side only, no tenant changes |
| II. Security First | ✅ PASS | No security changes, error logging excludes PII |
| III. Type Safety | ✅ TARGET | FR-011/FR-012 eliminate `any` types |
| IV. Error Handling | ✅ TARGET | FR-001-004 improve error propagation |
| V. Context/State | ✅ PASS | Using React Query for state management |
| VI. Consistency | ✅ PASS | Following existing patterns |
| VII. Observability | ✅ PASS | FR-002 adds error logging with context |

**Gate Status**: ✅ PASS - No violations, proceed to Phase 0

## Project Structure

### Documentation (this feature)

```text
specs/018-client-performance/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (minimal - no new entities)
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (N/A - no new APIs)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
client/
├── core/
│   ├── api/
│   │   ├── client.ts                    # Add AbortController, timeout support
│   │   └── services/
│   │       ├── courses.service.ts       # Remove mock data fallbacks
│   │       └── certificates.service.ts  # Remove mock data fallbacks
│   ├── hooks/
│   │   └── queries/
│   │       └── useDashboard.ts          # Deprecate useDashboardData
│   ├── types/
│   │   ├── quest.ts                     # Fix `any` types
│   │   ├── index.ts                     # Fix `any` types
│   │   └── components.ts                # Fix `any` types
│   └── utils/
│       ├── error.ts                     # Fix `any` types
│       └── common.ts                    # Fix `any` types (debounce/throttle)
├── components/
│   ├── pages/
│   │   ├── quests/
│   │   │   └── QuestCard.tsx            # Add React.memo
│   │   ├── communicate/
│   │   │   ├── CommunicateDashboard.tsx # Fix useEffect dependencies
│   │   │   └── Messages/
│   │   │       └── MessageItem.tsx      # Add React.memo (if not already)
│   │   └── dashboard/
│   │       └── DashboardStatCard.tsx    # Add React.memo (if exists)
│   └── shared/
│       └── ErrorState.tsx               # Create inline error component
└── app/
    └── _layout.tsx                      # Verify ErrorBoundary exists
```

**Structure Decision**: Existing client structure maintained. Changes are surgical refactoring within existing files, no new directories needed.

## Complexity Tracking

> No violations to justify - all changes follow existing patterns

## Constitution Re-Check (Post-Design)

Re-evaluated after Phase 1 design completion.

| Principle | Pre-Design | Post-Design | Delta |
|-----------|------------|-------------|-------|
| I. Multi-Tenancy | ✅ N/A | ✅ N/A | No change |
| II. Security First | ✅ PASS | ✅ PASS | No change - error logging still excludes PII |
| III. Type Safety | ✅ TARGET | ✅ PASS | Will eliminate `any` in 7 files |
| IV. Error Handling | ✅ TARGET | ✅ PASS | ErrorState component + toast pattern defined |
| V. Context/State | ✅ PASS | ✅ PASS | No change - TanStack Query maintained |
| VI. Consistency | ✅ PASS | ✅ PASS | Following React.memo, useCallback patterns |
| VII. Observability | ✅ PASS | ✅ PASS | Error logging with context maintained |

**Post-Design Gate Status**: ✅ PASS - Ready for task generation
