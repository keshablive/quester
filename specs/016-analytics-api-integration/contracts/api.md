# API Contracts: Analytics API Integration

**Feature**: 016-analytics-api-integration  
**Date**: 2025-11-28  
**Phase**: 1 - Design & Contracts

## Overview

This document describes the API contracts for the analytics feature. All endpoints are already implemented on the server; this documents expected request/response formats for client integration.

## Base URL

```
/api/v1/analytics
```

## Authentication

All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

---

## Endpoints

### GET /users/:userId/summary

Fetch aggregated analytics summary for a specific user.

**Request**
```http
GET /api/v1/analytics/users/{userId}/summary
Authorization: Bearer <token>
```

**Path Parameters**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId | string (UUID) | Yes | User's unique identifier |

**Response 200 OK**
```json
{
  "totalSessions": 42,
  "totalTimeSpent": 36000,
  "coursesCompleted": 5,
  "averageScore": 85.5,
  "lastActive": "2025-11-28T10:30:00Z"
}
```

**Response Codes**
| Code | Description |
|------|-------------|
| 200 | Success |
| 401 | Unauthorized - Invalid/missing token |
| 404 | User not found |

---

### GET /courses/top

Fetch top performing courses by enrollment.

**Request**
```http
GET /api/v1/analytics/courses/top?limit=10
Authorization: Bearer <token>
```

**Query Parameters**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| limit | number | No | 10 | Number of courses to return |

**Response 200 OK**
```json
[
  {
    "id": "course-uuid-1",
    "title": "Introduction to TypeScript",
    "enrollmentCount": 1250,
    "completionRate": 72.5,
    "averageRating": 4.8
  },
  {
    "id": "course-uuid-2",
    "title": "Advanced React Patterns",
    "enrollmentCount": 980,
    "completionRate": 65.2,
    "averageRating": 4.6
  }
]
```

**Response Codes**
| Code | Description |
|------|-------------|
| 200 | Success (may return empty array) |
| 401 | Unauthorized |

---

### GET /engagement/summary

Fetch platform-wide engagement metrics.

**Request**
```http
GET /api/v1/analytics/engagement/summary
Authorization: Bearer <token>
```

**Response 200 OK**
```json
{
  "dailyActiveUsers": 1250,
  "weeklyActiveUsers": 5800,
  "monthlyActiveUsers": 12500,
  "averageSessionDuration": 1800
}
```

**Response Codes**
| Code | Description |
|------|-------------|
| 200 | Success |
| 401 | Unauthorized |

---

### GET /engagement/timeseries

Fetch time-series engagement data for charting.

**Request**
```http
GET /api/v1/analytics/engagement/timeseries?start=2025-11-01&end=2025-11-28
Authorization: Bearer <token>
```

**Query Parameters**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| start | string (YYYY-MM-DD) | Yes | Start date |
| end | string (YYYY-MM-DD) | Yes | End date |

**Response 200 OK**
```json
[
  { "date": "2025-11-01", "value": 1200 },
  { "date": "2025-11-02", "value": 1350 },
  { "date": "2025-11-03", "value": 980 },
  ...
]
```

**Response Codes**
| Code | Description |
|------|-------------|
| 200 | Success (may return empty array) |
| 400 | Invalid date format |
| 401 | Unauthorized |

---

### GET /users/:userId/timeseries

Fetch user-specific activity time-series.

**Request**
```http
GET /api/v1/analytics/users/{userId}/timeseries?start=2025-11-01&end=2025-11-28
Authorization: Bearer <token>
```

**Path Parameters**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId | string (UUID) | Yes | User's unique identifier |

**Query Parameters**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| start | string (YYYY-MM-DD) | Yes | Start date |
| end | string (YYYY-MM-DD) | Yes | End date |

**Response 200 OK**
```json
[
  { "date": "2025-11-01", "value": 3 },
  { "date": "2025-11-02", "value": 5 },
  ...
]
```

**Response Codes**
| Code | Description |
|------|-------------|
| 200 | Success |
| 401 | Unauthorized |
| 404 | User not found |

---

## Error Response Format

All error responses follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

## Client Integration Notes

### Existing Service
The `analyticsService` in `client/core/api/services/analytics.service.ts` already implements these endpoints:

```typescript
analyticsService.getUserSummary(userId)
analyticsService.getTopCourses(limit)
analyticsService.getEngagementSummary()
analyticsService.getEngagementTimeseries(startDate, endDate)
analyticsService.getUserTimeseries(userId, startDate, endDate)
```

### Query Keys for Caching

```typescript
// Recommended query key structure
queryKeys.analytics.userSummary(userId)
queryKeys.analytics.topCourses(limit)
queryKeys.analytics.engagementSummary()
queryKeys.analytics.engagementTimeseries(start, end)
```

### Stale Time

Per FR-009, analytics data should use 5-minute stale time:

```typescript
staleTime: 5 * 60 * 1000 // 5 minutes
```

## Endpoints NOT Available

The following are documented for clarity but do **NOT** exist:

| Endpoint | Purpose | Status |
|----------|---------|--------|
| /analytics/devices | Device breakdown | ❌ Not implemented |
| /analytics/locations | Geographic data | ❌ Not implemented |
| /analytics/referrers | Traffic sources | ❌ Not implemented |

These are marked as **Out of Scope** in the specification.
