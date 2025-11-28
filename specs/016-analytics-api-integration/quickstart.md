# Quickstart: Analytics API Integration

**Feature**: 016-analytics-api-integration  
**Date**: 2025-11-28

## Prerequisites

- Feature 014-auth-api-integration complete (provides auth context)
- Feature 015-profile-api-integration complete (established patterns)
- Server running with authenticated user
- Client dev server running (`npm run dev` in client/)

## Implementation Order

### Step 1: Add Analytics Query Keys

**File**: `client/core/query/keys.ts`

Add to queryKeys object:

```typescript
// ═══════════════════════════════════════════════════════════════
// Analytics Queries
// ═══════════════════════════════════════════════════════════════
analytics: {
  all: ['analytics'] as const,
  userSummary: (userId: string) => 
    [...queryKeys.analytics.all, 'user', userId, 'summary'] as const,
  topCourses: (limit?: number) => 
    [...queryKeys.analytics.all, 'courses', 'top', limit ?? 10] as const,
  engagementSummary: () => 
    [...queryKeys.analytics.all, 'engagement', 'summary'] as const,
  engagementTimeseries: (start: string, end: string) => 
    [...queryKeys.analytics.all, 'engagement', 'timeseries', start, end] as const,
},
```

### Step 2: Add STALE_TIMES Constant

**File**: `client/core/query/constants.ts`

Add (if not exists):

```typescript
export const STALE_TIMES = {
  // ... existing
  ANALYTICS: 5 * 60 * 1000, // 5 minutes
};
```

### Step 3: Create useAnalytics Hook

**File**: `client/core/hooks/queries/useAnalytics.ts`

```typescript
import { useQuery, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query';
import { analyticsService } from '../../api/services/analytics.service';
import type { UserAnalyticsSummary, TopCourse, TimeSeriesData, EngagementSummary } from '../../api/services/analytics.service';
import { queryKeys } from '../../query/keys';
import { STALE_TIMES } from '../../query/constants';
import type { ApiError } from '../../types/query.types';

export function useUserAnalytics(
  userId: string,
  options?: Omit<UseQueryOptions<UserAnalyticsSummary, ApiError>, 'queryKey' | 'queryFn'>
): UseQueryResult<UserAnalyticsSummary, ApiError> {
  return useQuery({
    queryKey: queryKeys.analytics.userSummary(userId),
    queryFn: () => analyticsService.getUserSummary(userId),
    staleTime: STALE_TIMES.ANALYTICS,
    enabled: !!userId,
    ...options,
  });
}

export function useTopCourses(
  limit: number = 10,
  options?: Omit<UseQueryOptions<TopCourse[], ApiError>, 'queryKey' | 'queryFn'>
): UseQueryResult<TopCourse[], ApiError> {
  return useQuery({
    queryKey: queryKeys.analytics.topCourses(limit),
    queryFn: () => analyticsService.getTopCourses(limit),
    staleTime: STALE_TIMES.ANALYTICS,
    ...options,
  });
}

export function useEngagementSummary(
  options?: Omit<UseQueryOptions<EngagementSummary, ApiError>, 'queryKey' | 'queryFn'>
): UseQueryResult<EngagementSummary, ApiError> {
  return useQuery({
    queryKey: queryKeys.analytics.engagementSummary(),
    queryFn: () => analyticsService.getEngagementSummary(),
    staleTime: STALE_TIMES.ANALYTICS,
    ...options,
  });
}

export function useEngagementTimeseries(
  startDate: string,
  endDate: string,
  options?: Omit<UseQueryOptions<TimeSeriesData[], ApiError>, 'queryKey' | 'queryFn'>
): UseQueryResult<TimeSeriesData[], ApiError> {
  return useQuery({
    queryKey: queryKeys.analytics.engagementTimeseries(startDate, endDate),
    queryFn: () => analyticsService.getEngagementTimeseries(startDate, endDate),
    staleTime: STALE_TIMES.ANALYTICS,
    enabled: !!startDate && !!endDate,
    ...options,
  });
}
```

### Step 4: Export from Index

**File**: `client/core/hooks/queries/index.ts`

Add:

```typescript
// Analytics queries
export {
  useUserAnalytics,
  useTopCourses,
  useEngagementSummary,
  useEngagementTimeseries,
} from './useAnalytics';
```

### Step 5: Update KeyMetrics Component

**File**: `client/components/pages/analytics/KeyMetrics.tsx`

Key changes:
- Import `useUserAnalytics` and `useCurrentUser`
- Accept optional `userId` prop
- Replace hardcoded metrics with API data
- Add loading skeleton state
- Add error state with retry
- Add `formatNumber` utility for display

### Step 6: Update TopPages Component

**File**: `client/components/pages/analytics/TopPages.tsx`

Key changes:
- Import `useTopCourses`
- Replace hardcoded pages array with API data
- Show course titles instead of page paths
- Add loading skeleton state
- Add empty state for no courses

### Step 7: Update TrafficOverview Component

**File**: `client/components/pages/analytics/TrafficOverview.tsx`

Key changes:
- Import `useEngagementTimeseries`
- Calculate date range (last 30 days)
- Display time-series data (simplified visualization)
- Add loading state
- Add empty state

### Step 8: Update Demographics Component

**File**: `client/components/pages/analytics/Demographics.tsx`

Key changes:
- Keep device/location as placeholders (no API)
- Or use engagement summary for alternative metrics
- Add note that detailed demographics coming soon

## Testing Checklist

- [ ] Navigate to `/analytics` - see real data (not "45.2K", "32.8%", "3.42%")
- [ ] Check Key Metrics shows user's actual sessions/courses/score
- [ ] Check Top Pages shows real course data with enrollment counts
- [ ] Throttle network - see skeleton loaders
- [ ] Disable network - see error state with retry button
- [ ] Navigate away and back - see cached data instantly

## Key Files Modified

| File | Change Type |
|------|-------------|
| `client/core/query/keys.ts` | Add analytics keys |
| `client/core/query/constants.ts` | Add ANALYTICS stale time |
| `client/core/hooks/queries/useAnalytics.ts` | NEW: Analytics hooks |
| `client/core/hooks/queries/index.ts` | Export analytics hooks |
| `client/components/pages/analytics/KeyMetrics.tsx` | Integrate hooks |
| `client/components/pages/analytics/TopPages.tsx` | Integrate hooks |
| `client/components/pages/analytics/TrafficOverview.tsx` | Integrate hooks |
| `client/components/pages/analytics/Demographics.tsx` | Update with available data |

## Utility Functions Needed

### formatCompactNumber

> **Note**: `formatNumber` already exists in `client/core/utils/common.ts` for locale formatting (1,234,567). Use `formatCompactNumber` for compact notation (1.2M).

```typescript
// client/core/utils/format.ts
export function formatCompactNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  }
  return num.toString();
}
```

### formatDuration

```typescript
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
```

### getDateRange

```typescript
function getDateRange(days: number): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}
```
