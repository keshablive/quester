# Research: Analytics API Integration

**Feature**: 016-analytics-api-integration  
**Date**: 2025-11-28  
**Phase**: 0 - Outline & Research

## Research Tasks

### 1. Existing Analytics Service Analysis

**Task**: Analyze existing `analytics.service.ts` to understand available methods

**Findings**:
- Service already exists at `client/core/api/services/analytics.service.ts`
- Provides typed interfaces: `UserAnalyticsSummary`, `TopCourse`, `TimeSeriesData`, `EngagementSummary`
- Methods available:
  - `getUserSummary(userId)` - User activity summary
  - `getTopCourses(limit)` - Top performing courses
  - `getEngagementTimeseries(startDate, endDate)` - Time series for charts
  - `getEngagementSummary()` - Platform-wide metrics

**Decision**: Reuse existing service; wrap with TanStack Query hooks for caching

### 2. TanStack Query Hook Pattern

**Task**: Find best practices for analytics hooks following existing patterns

**Findings** (from `useUser.ts`, `useSocial.ts`):
- Pattern: `useQuery` with `queryKeys` factory
- Stale time configurable via `STALE_TIMES` constants
- Return full `UseQueryResult` for loading/error states
- Use `enabled` option for conditional fetching

**Decision**: Create `useAnalytics.ts` following same pattern:
```typescript
export function useUserAnalytics(userId: string, options?) {
  return useQuery({
    queryKey: queryKeys.analytics.userSummary(userId),
    queryFn: () => analyticsService.getUserSummary(userId),
    staleTime: STALE_TIMES.ANALYTICS, // 5 minutes
    enabled: !!userId,
    ...options,
  });
}
```

### 3. Number Formatting Utility

**Task**: Research number formatting for "1.2K", "45.2K" display

**Findings**:
- No existing utility found in codebase
- Pattern needed: 1000 → "1K", 1500 → "1.5K", 1000000 → "1M"

**Decision**: Create `formatNumber` utility function:
```typescript
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  }
  return num.toString();
}
```

### 4. Week-over-Week Calculation

**Task**: Research how to calculate percentage change (current 7 days vs previous 7 days)

**Findings**:
- Server may or may not return previous period data
- Client-side calculation requires two API calls or server support

**Decision**: 
- If server returns `previousPeriod` data, use it directly
- If not, make two timeseries calls (current week, previous week) and calculate client-side
- Formula: `((current - previous) / previous) * 100`
- Show "—" if previous period data is zero or unavailable

### 5. Loading Skeleton Pattern

**Task**: Verify Skeleton component availability and usage pattern

**Findings** (from `ProfileHeader.tsx`, `ProfileStats.tsx`):
- `Skeleton` component available from `@/components/ui`
- Pattern: Check `isLoading` from query result, render skeletons
- Skeletons use className for sizing: `w-32 h-7 rounded`

**Decision**: Use same pattern for analytics components

### 6. Demographics Data Availability

**Task**: Research if device/location breakdown API exists

**Findings**:
- No endpoint found for device breakdown
- No endpoint found for geographic location data
- `analytics.service.ts` has no device/location methods
- Spec marks geographic location as "Out of Scope"

**Decision**: 
- Demographics component will show only available data
- Device breakdown: Show message "Device analytics coming soon" or keep simplified display
- Location breakdown: Keep as "Coming soon" or remove entirely

## Resolved Clarifications

| Question | Resolution |
|----------|------------|
| Week-over-week comparison period | Current 7 days vs previous 7 days (from spec clarification) |
| Demographics API availability | No endpoint exists; mark as limited scope |
| Stale time for analytics | 5 minutes (from FR-009) |

## Technology Decisions

| Decision | Rationale | Alternatives Considered |
|----------|-----------|------------------------|
| TanStack Query hooks | Consistent with codebase patterns; provides caching, loading states | Direct service calls (no caching) |
| Reuse existing service | Service already typed and tested | Create new service (duplication) |
| Client-side number formatting | Simple utility, no external dependency | Use Intl.NumberFormat (heavier) |
| 5-minute stale time | Balance between freshness and API efficiency | 1 min (too frequent), 15 min (too stale) |

## Dependencies Confirmed

- ✅ `analytics.service.ts` - Exists and provides all needed methods
- ✅ `@/components/ui/Skeleton` - Available for loading states
- ✅ `queryKeys` factory - Pattern established in `keys.ts`
- ✅ `STALE_TIMES` constants - Exists in `query/constants.ts`
- ⚠️ Device/Location endpoints - Do NOT exist (scope limitation)
