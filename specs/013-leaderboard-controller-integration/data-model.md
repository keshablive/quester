# Data Model: Leaderboard Controller Integration

**Feature**: 013-leaderboard-controller-integration  
**Date**: 2025-01-19  
**Status**: Complete

## Overview

This feature does not introduce new data models. It wires existing models and entities to the controller layer. This document serves as a reference for the entities involved.

## Existing Entities (No Changes)

### LeaderboardEntry

**Source**: `server/internal/models/leaderboard.go`

Lightweight response structure for API responses.

| Field | Type | Description |
|-------|------|-------------|
| `Rank` | `int` | 1-based position (1 = top) |
| `UserID` | `uuid.UUID` | User identifier |
| `Username` | `string` | Display name |
| `Avatar` | `string` | Profile image URL (optional) |
| `MetricValue` | `int` | Score/XP value |
| `TenantID` | `uuid.UUID` | Tenant isolation |

```go
type LeaderboardEntry struct {
    Rank        int       `json:"rank"`
    UserID      uuid.UUID `json:"user_id"`
    Username    string    `json:"username"`
    Avatar      string    `json:"avatar,omitempty"`
    MetricValue int       `json:"metric_value"`
    TenantID    uuid.UUID `json:"tenant_id"`
}
```

---

### UserLeaderboardPosition

**Source**: `server/internal/models/leaderboard.go`

Detailed position for user-specific queries.

| Field | Type | Description |
|-------|------|-------------|
| `UserID` | `uuid.UUID` | User identifier |
| `LeaderboardType` | `LeaderboardType` | global / category |
| `Period` | `LeaderboardPeriod` | alltime / monthly |
| `PeriodKey` | `string` | "alltime" or "YYYY-MM" |
| `Category` | `string` | Category name (for category type) |
| `Rank` | `int` | 1-based rank (0 if not ranked) |
| `MetricValue` | `int` | User's score |
| `TotalUsers` | `int` | Total users in leaderboard |
| `Percentile` | `int` | 0-100 percentile position |

```go
type UserLeaderboardPosition struct {
    UserID          uuid.UUID         `json:"user_id"`
    LeaderboardType LeaderboardType   `json:"leaderboard_type"`
    Period          LeaderboardPeriod `json:"period"`
    PeriodKey       string            `json:"period_key"`
    Category        string            `json:"category,omitempty"`
    Rank            int               `json:"rank"`
    MetricValue     int               `json:"metric_value"`
    TotalUsers      int               `json:"total_users"`
    Percentile      int               `json:"percentile"`
}
```

---

### LeaderboardType (Enum)

**Source**: `server/internal/models/leaderboard.go`

| Value | Description |
|-------|-------------|
| `global` | All users by total XP |
| `category` | Users by category-specific metrics |

```go
type LeaderboardType string

const (
    LeaderboardTypeGlobal   LeaderboardType = "global"
    LeaderboardTypeCategory LeaderboardType = "category"
)
```

---

### LeaderboardPeriod (Enum)

**Source**: `server/internal/models/leaderboard.go`

| Value | Description |
|-------|-------------|
| `alltime` | Cumulative rankings |
| `monthly` | Current month only |

```go
type LeaderboardPeriod string

const (
    LeaderboardPeriodAllTime LeaderboardPeriod = "alltime"
    LeaderboardPeriodMonthly LeaderboardPeriod = "monthly"
)
```

---

## Redis Data Structure (Existing)

Leaderboard data is stored in Redis sorted sets. No changes required.

### Key Format

```
leaderboard:{tenantID}:{type}:{period}[:{category}]
```

### Examples

| Key | Description |
|-----|-------------|
| `leaderboard:uuid:global:alltime` | Global all-time rankings |
| `leaderboard:uuid:global:monthly:2025-01` | Global January 2025 rankings |
| `leaderboard:uuid:category:alltime:quest` | Quest category all-time |
| `leaderboard:uuid:category:monthly:2025-01:social` | Social category monthly |

### Operations

| Redis Command | Service Method | Purpose |
|---------------|----------------|---------|
| `ZREVRANGE key 0 N-1 WITHSCORES` | `GetTopN()` | Get top N entries |
| `ZSCORE key member` | `GetUserRank()` | Get user score |
| `ZREVRANK key member` | `GetUserRank()` | Get user rank |
| `ZCARD key` | `GetUserRank()` | Get total users |
| `DEL key` | `InvalidateCache()` | Clear cache |

---

## Request/Response Shapes (Existing API Contract)

### GET /api/v1/leaderboards/{type}

**Request**:
- Path: `type` = `global` | `category`
- Query: `period` (alltime|monthly), `category` (required if type=category), `page`, `limit`

**Response** (200 OK):
```json
{
  "leaderboard_type": "global",
  "period": "alltime",
  "category": "",
  "entries": [
    {
      "rank": 1,
      "user_id": "uuid",
      "username": "string",
      "avatar": "url",
      "metric_value": 1500
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "total_pages": 5
  }
}
```

### GET /api/v1/users/{id}/leaderboard-position

**Request**:
- Path: `id` = user UUID
- Query: `type` (global|category), `period` (alltime|monthly), `category` (required if type=category)

**Response** (200 OK):
```json
{
  "user_id": "uuid",
  "leaderboard_type": "global",
  "period": "alltime",
  "period_key": "alltime",
  "category": "",
  "rank": 42,
  "metric_value": 750,
  "total_users": 1000,
  "percentile": 96
}
```

### POST /api/v1/admin/leaderboards/invalidate

**Request Body**:
```json
{
  "leaderboard_type": "global",
  "category": ""
}
```

**Response** (200 OK):
```json
{
  "message": "Leaderboard cache invalidated successfully",
  "leaderboard_type": "global",
  "category": "",
  "invalidated_at": "2025-01-19T12:00:00Z"
}
```

---

## Entity Relationships

```
┌─────────────────┐     ┌──────────────────┐
│     User        │────▶│ LeaderboardEntry │
│  (uuid, name)   │     │ (rank, score)    │
└─────────────────┘     └──────────────────┘
        │
        │ 1:N per tenant/type/period
        ▼
┌─────────────────────────┐
│ UserLeaderboardPosition │
│ (detailed rank info)    │
└─────────────────────────┘
```

---

## Validation Rules

| Field | Rule | Error |
|-------|------|-------|
| `leaderboard_type` | Must be `global` or `category` | 400 Bad Request |
| `period` | Must be `alltime` or `monthly` | 400 Bad Request |
| `category` | Required when type=`category` | 400 Bad Request |
| `limit` | Max 100 | Silently capped to 100 |
| `user_id` | Valid UUID | 400 Bad Request |

---

## Notes

- No database migrations required
- No new models created
- All entities already exist in `models/leaderboard.go`
- Redis structure unchanged
- API contract preserved (SC-006)
