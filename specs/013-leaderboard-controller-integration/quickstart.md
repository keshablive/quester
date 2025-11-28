# Quickstart: Leaderboard Controller Integration

**Feature**: 013-leaderboard-controller-integration  
**Date**: 2025-01-19

## Overview

This feature wires the existing `LeaderboardController` to `LeaderboardService` via dependency injection. Currently, the controller returns mock/empty data. After this feature, endpoints will return real-time rankings from Redis.

## Prerequisites

- Go 1.21+
- Redis running on `localhost:6379`
- PostgreSQL with existing schema
- Docker (optional, for local development)

## Quick Verification

### 1. Start Services

```bash
# From repository root
docker-compose up -d redis postgres
cd server && go run ./cmd/server
```

### 2. Test Leaderboard Endpoint

```bash
# Get JWT token first (replace with your auth endpoint)
TOKEN="your-jwt-token"

# Test global leaderboard
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/v1/leaderboards/global"

# Expected: entries array with ranked users (not empty mock)
```

### 3. Test User Position Endpoint

```bash
# Replace USER_ID with actual UUID
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/v1/users/USER_ID/leaderboard-position"

# Expected: rank, percentile, total_users (not zeros)
```

### 4. Test Admin Cache Invalidation

```bash
# Requires admin JWT
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"leaderboard_type": "global"}' \
  "http://localhost:8080/api/v1/admin/leaderboards/invalidate"

# Expected: success message with invalidated_at timestamp
```

## Files Modified

| File | Change |
|------|--------|
| `server/internal/app/app.go` | Register `leaderboardService` in DI container |
| `server/internal/controllers/leaderboard_controller.go` | Refactor to struct pattern with service injection |
| `server/internal/routes/routes.go` | Wire `SetupLeaderboardRoutes()` |
| `server/internal/routes/leaderboard_routes.go` | New route setup file |

## Success Indicators

- [ ] `GET /api/v1/leaderboards/global` returns entries from Redis (not empty)
- [ ] `GET /api/v1/leaderboards/category?category=quest` returns category rankings
- [ ] `GET /api/v1/users/{id}/leaderboard-position` returns rank > 0 for users with XP
- [ ] `POST /api/v1/admin/leaderboards/invalidate` successfully clears Redis keys
- [ ] All TODO comments in `leaderboard_controller.go` are resolved
- [ ] Response times < 500ms under normal load

## Troubleshooting

### Empty Leaderboard Response

**Symptom**: `entries: []` even though users have XP

**Cause**: Redis sorted set doesn't have data

**Fix**: Ensure XP-awarding operations call `LeaderboardService.UpdateRank()`

### 503 Service Unavailable

**Symptom**: 503 error on leaderboard endpoints

**Cause**: Redis connection failed

**Fix**: Check Redis is running: `redis-cli ping`

### Service Not Available Error

**Symptom**: "Leaderboard service not available"

**Cause**: DI registration failed

**Fix**: Check server logs for `"Failed to register leaderboardService"` errors

## Related Documentation

- [Specification](./spec.md) - Full requirements
- [Research](./research.md) - Technical decisions
- [Data Model](./data-model.md) - Entity reference
- [API Contract](./contracts/leaderboard-api.yaml) - OpenAPI spec
