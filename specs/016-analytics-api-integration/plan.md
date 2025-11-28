# Implementation Plan: Analytics API Integration

**Branch**: `016-analytics-api-integration` | **Date**: 2025-11-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/016-analytics-api-integration/spec.md`

## Summary

Replace hardcoded mock data in analytics dashboard components (KeyMetrics, TopPages, TrafficOverview, Demographics) with real data from existing analytics API endpoints. Create TanStack Query hooks for data fetching with 5-minute cache, implement loading skeletons and error states, and add number formatting utilities for readable display.

## Technical Context

**Language/Version**: TypeScript 5.9, React Native 0.81.5  
**Primary Dependencies**: TanStack Query 5.90, Expo 54, NativeWind 4.2  
**Storage**: N/A (client-side, fetches from server API)  
**Testing**: Manual testing (no unit tests requested per spec)  
**Target Platform**: React Native (iOS/Android/Web via Expo)  
**Project Type**: Mobile + Web client  
**Performance Goals**: 3 second page load, 100ms cached data display  
**Constraints**: 5-minute stale time for analytics data  
**Scale/Scope**: 4 components to integrate, 4 query hooks, 8 implementation phases

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Multi-Tenancy | ✅ N/A | Client-side only; server handles tenant filtering |
| II. Security First | ✅ Pass | No sensitive data logged; API auth via existing middleware |
| III. Type Safety | ✅ Pass | Will use explicit TypeScript interfaces for all API responses |
| IV. Error Handling | ✅ Pass | Error states with retry defined for all components |
| V. Context/State | ✅ Pass | Using TanStack Query for server state (established pattern) |
| VI. Consistency | ✅ Pass | Following existing query hook patterns from useUser.ts, useSocial.ts |
| VII. Observability | ✅ Pass | Will log errors via console.error in development |

**Gate Status**: ✅ PASS - No violations requiring justification

## Project Structure

### Documentation (this feature)

```text
specs/016-analytics-api-integration/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── api.md           # API contract documentation
├── checklists/
│   └── requirements.md  # Quality checklist
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
client/
├── core/
│   ├── types/
│   │   └── query.types.ts        # Add analytics-related types
│   ├── query/
│   │   └── keys.ts               # Add analytics query keys
│   └── hooks/
│       └── queries/
│           ├── index.ts          # Export new analytics hooks
│           └── useAnalytics.ts   # NEW: Analytics query hooks
├── components/
│   └── pages/
│       └── analytics/
│           ├── types.ts          # Update component types
│           ├── KeyMetrics.tsx    # Integrate with useUserAnalytics
│           ├── TopPages.tsx      # Integrate with useTopCourses
│           ├── TrafficOverview.tsx # Integrate with useEngagementTimeseries
│           └── Demographics.tsx  # Static for now (location API out of scope)
└── app/
    └── analytics.tsx             # No changes needed (already renders components)
```

**Structure Decision**: Follow existing client architecture. New hooks in `core/hooks/queries/`, types in `core/types/`, component updates in `components/pages/analytics/`.

## Existing Infrastructure

### Available API Service
File: `client/core/api/services/analytics.service.ts`

Already provides:
- `getUserSummary(userId)` → `UserAnalyticsSummary`
- `getTopCourses(limit)` → `TopCourse[]`
- `getEngagementTimeseries(startDate, endDate)` → `TimeSeriesData[]`
- `getEngagementSummary()` → `EngagementSummary`

### Available Endpoints (from env.ts)
- `/api/v1/analytics/users/:userId/summary`
- `/api/v1/analytics/users/:userId/timeseries`
- `/api/v1/analytics/courses/top`
- `/api/v1/analytics/engagement/summary`
- `/api/v1/analytics/engagement/timeseries`

### Missing (Out of Scope)
- Device breakdown endpoint (Demographics will remain hardcoded for devices)
- Geographic location endpoint (Demographics will remain hardcoded for locations)

## Complexity Tracking

No constitution violations requiring justification.
