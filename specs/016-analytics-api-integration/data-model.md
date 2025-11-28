# Data Model: Analytics API Integration

**Feature**: 016-analytics-api-integration  
**Date**: 2025-11-28  
**Phase**: 1 - Design & Contracts

## Entities

### UserAnalyticsSummary

User's aggregated activity data from `/api/v1/analytics/users/:userId/summary`

| Field | Type | Description | Nullable |
|-------|------|-------------|----------|
| totalSessions | number | Total number of user sessions | No |
| totalTimeSpent | number | Total time spent in seconds | No |
| coursesCompleted | number | Number of courses completed | No |
| averageScore | number | Average quiz/assessment score (0-100) | No |
| lastActive | string | ISO 8601 timestamp of last activity | Yes |

**Already defined in**: `client/core/api/services/analytics.service.ts`

### TopCourse

High-performing course data from `/api/v1/analytics/courses/top`

| Field | Type | Description | Nullable |
|-------|------|-------------|----------|
| id | string | Course UUID | No |
| title | string | Course title | No |
| enrollmentCount | number | Number of enrolled users | No |
| completionRate | number | Completion percentage (0-100) | No |
| averageRating | number | Average user rating (0-5) | No |

**Already defined in**: `client/core/api/services/analytics.service.ts`

### TimeSeriesData

Daily data points for charting from `/api/v1/analytics/engagement/timeseries`

| Field | Type | Description | Nullable |
|-------|------|-------------|----------|
| date | string | ISO 8601 date (YYYY-MM-DD) | No |
| value | number | Metric value for that date | No |

**Already defined in**: `client/core/api/services/analytics.service.ts`

### EngagementSummary

Platform-wide engagement metrics from `/api/v1/analytics/engagement/summary`

| Field | Type | Description | Nullable |
|-------|------|-------------|----------|
| dailyActiveUsers | number | Users active in last 24 hours | No |
| weeklyActiveUsers | number | Users active in last 7 days | No |
| monthlyActiveUsers | number | Users active in last 30 days | No |
| averageSessionDuration | number | Average session length in seconds | No |

**Already defined in**: `client/core/api/services/analytics.service.ts`

## New Types to Add

### AnalyticsProps

Props interface for analytics components (similar to ProfileProps pattern)

```typescript
export interface AnalyticsProps {
  userId?: string; // If provided, show that user's analytics
                   // If omitted, show current user's analytics
}
```

**Location**: `client/components/pages/analytics/types.ts`

### Query Key Types

```typescript
// Add to queryKeys in client/core/query/keys.ts
analytics: {
  all: ['analytics'] as const,
  userSummary: (userId: string) => [...queryKeys.analytics.all, 'user', userId, 'summary'] as const,
  topCourses: (limit?: number) => [...queryKeys.analytics.all, 'courses', 'top', limit ?? 10] as const,
  engagementSummary: () => [...queryKeys.analytics.all, 'engagement', 'summary'] as const,
  engagementTimeseries: (start: string, end: string) => 
    [...queryKeys.analytics.all, 'engagement', 'timeseries', start, end] as const,
}
```

## Stale Time Configuration

Add to `client/core/query/constants.ts`:

```typescript
export const STALE_TIMES = {
  // ... existing
  ANALYTICS: 5 * 60 * 1000, // 5 minutes per FR-009
};
```

## Relationships

```
User (1) ────────> (N) UserAnalyticsSummary
  │
  └── userId used to fetch summary
  
Course (1) ────────> (1) TopCourse ranking
  │
  └── Aggregated enrollment/completion data

EngagementSummary ────────> Platform-wide (no user relationship)

TimeSeriesData[] ────────> Date-indexed array (no entity relationship)
```

## Validation Rules

| Entity | Field | Rule |
|--------|-------|------|
| UserAnalyticsSummary | totalSessions | >= 0 |
| UserAnalyticsSummary | averageScore | 0-100 |
| TopCourse | completionRate | 0-100 |
| TopCourse | averageRating | 0-5 |
| TimeSeriesData | date | Valid ISO 8601 date |
| EngagementSummary | all fields | >= 0 |

## Empty State Handling

| Entity | Empty Condition | Display |
|--------|-----------------|---------|
| UserAnalyticsSummary | New user, no activity | All fields = 0, show "No activity yet" |
| TopCourse[] | No courses on platform | Empty array, show "No courses available" |
| TimeSeriesData[] | No historical data | Empty array, show "No data for this period" |
| EngagementSummary | Platform just launched | All fields = 0, show actual values |
