# Feature Specification: Leaderboard Controller Integration

**Feature Branch**: `013-leaderboard-controller-integration`  
**Created**: 2025-01-19  
**Status**: Draft  
**Input**: User description: "Wire leaderboard controller endpoints to existing LeaderboardService for real-time rankings and user position lookups"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Global Leaderboard Rankings (Priority: P1)

As a platform user, I want to see a ranked list of top users by XP/activity so that I can understand where I stand relative to others and feel motivated to improve my ranking.

**Why this priority**: Core gamification feature - leaderboards drive engagement and competition. Currently returns empty mock data, completely breaking the leaderboard experience.

**Independent Test**: Can be fully tested by requesting `/api/v1/leaderboards/global` and verifying users with XP are returned in descending rank order.

**Acceptance Scenarios**:

1. **Given** I am an authenticated user, **When** I request the global all-time leaderboard, **Then** I receive a list of users ranked by total XP with usernames, avatars, and metric values.
2. **Given** I request the leaderboard with `period=monthly`, **When** the request succeeds, **Then** I receive users ranked by current month's XP.
3. **Given** the leaderboard has more than 100 users, **When** I request with `limit=50`, **Then** I receive exactly 50 entries with correct rank values (1-50).
4. **Given** no users have XP in the system, **When** I request the leaderboard, **Then** I receive an empty entries array with appropriate metadata.

---

### User Story 2 - Check My Leaderboard Position (Priority: P1)

As a platform user, I want to see my exact rank, percentile, and total users so that I understand my standing and progress compared to the community.

**Why this priority**: Critical for personalized gamification - users need to know their position to feel engaged. Currently returns zeros/nulls.

**Independent Test**: Can be fully tested by requesting `/api/v1/users/{id}/leaderboard-position` and verifying rank, percentile, and total users are calculated from Redis.

**Acceptance Scenarios**:

1. **Given** I am an authenticated user with 500 XP, **When** I request my global leaderboard position, **Then** I receive my 1-based rank, total XP, percentile (0-100), and total users count.
2. **Given** I am not in any leaderboard (0 XP), **When** I request my position, **Then** I receive rank=0, metric_value=0, percentile=0, total_users=N.
3. **Given** I request position for category leaderboard `type=category&category=quest`, **When** I have quest completions, **Then** I receive my rank in the quest-specific leaderboard.
4. **Given** I request my position with `period=monthly`, **When** the month just started, **Then** I receive my current month's rank (potentially lower than all-time).

---

### User Story 3 - View Category Leaderboards (Priority: P2)

As a platform user, I want to view category-specific leaderboards (quest completions, learning XP, social XP) so that I can compete in areas I'm most active in.

**Why this priority**: Extends core leaderboard functionality to specific game mechanics. Enables targeted competition.

**Independent Test**: Can be fully tested by requesting `/api/v1/leaderboards/category?category=quest` and verifying category-filtered results.

**Acceptance Scenarios**:

1. **Given** I am authenticated, **When** I request `type=category` without a `category` parameter, **Then** I receive a 400 error stating category is required.
2. **Given** category leaderboard for "quest" exists, **When** I request it, **Then** I receive users ranked by quest completion metrics.
3. **Given** a category has no entries, **When** I request that leaderboard, **Then** I receive empty entries array (not an error).

---

### User Story 4 - Admin Cache Invalidation (Priority: P3)

As a platform administrator, I want to manually invalidate leaderboard cache when data corrections are made so that users see accurate rankings immediately.

**Why this priority**: Administrative tool for data integrity. Not user-facing but important for operations.

**Independent Test**: Can be fully tested by calling `/api/v1/admin/leaderboards/invalidate` and verifying Redis keys are deleted.

**Acceptance Scenarios**:

1. **Given** I am an admin, **When** I call invalidate for global leaderboard, **Then** both all-time and monthly Redis keys are deleted.
2. **Given** I provide an invalid leaderboard type, **When** I call invalidate, **Then** I receive a 400 error.
3. **Given** I am a non-admin user, **When** I attempt to invalidate cache, **Then** I receive a 403 forbidden error.

---

### Edge Cases

- What happens when Redis is temporarily unavailable?
  - Service should fail gracefully with 503 Service Unavailable
- How does the system handle extremely large leaderboards (100K+ users)?
  - Pagination limits enforced (max 100 per request), Redis sorted sets handle scale
- What happens when a user ID doesn't exist in Redis but exists in DB?
  - Return position with rank=0 (not ranked yet)
- How are tied scores handled?
  - Redis ZREVRANK returns same rank for tied scores; first inserted wins tiebreaker

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST inject LeaderboardService into leaderboard controller endpoints via DI container
- **FR-002**: `GetLeaderboard` endpoint MUST call `LeaderboardService.GetTopN()` with tenant, type, period, category, and limit parameters
- **FR-003**: `GetUserPosition` endpoint MUST call `LeaderboardService.GetUserRank()` with tenant, user ID, type, period, and category parameters
- **FR-004**: `InvalidateLeaderboardCache` endpoint MUST call `LeaderboardService.InvalidateCache()` after admin authorization check
- **FR-005**: System MUST validate leaderboard type is one of: `global`, `category`
- **FR-006**: System MUST validate period is one of: `alltime`, `monthly`
- **FR-007**: System MUST require `category` parameter when `type=category`
- **FR-008**: System MUST enforce pagination limits: default 20, max 100 entries per request
- **FR-009**: System MUST return appropriate HTTP cache headers (5 min for leaderboards, 2 min for user positions)
- **FR-010**: System MUST handle Redis connection failures gracefully with 503 status

### Key Entities

- **LeaderboardEntry**: Represents a single user's position (rank, user_id, username, avatar, metric_value, tenant_id)
- **UserLeaderboardPosition**: Represents a user's detailed position (user_id, leaderboard_type, period, period_key, category, rank, metric_value, total_users, percentile)
- **LeaderboardType**: Enum - `global` (all XP), `category` (specific metrics)
- **LeaderboardPeriod**: Enum - `alltime` (cumulative), `monthly` (current month)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All leaderboard endpoints return real data from Redis instead of empty mock responses
- **SC-002**: Users can retrieve their exact rank within 500ms under normal load
- **SC-003**: Leaderboard requests support 1000 concurrent users without degradation
- **SC-004**: Admin cache invalidation successfully clears Redis keys and forces refresh
- **SC-005**: 100% of existing leaderboard controller TODO comments are resolved with working implementations
- **SC-006**: Zero breaking changes to existing API contract (same request/response shapes)

## Assumptions

- **A-001**: LeaderboardService is already implemented and tested with Redis sorted sets (verified: exists in `services/leaderboard_service.go`)
- **A-002**: Redis is available and configured in the application (required infrastructure)
- **A-003**: LeaderboardRepository is already registered in DI container (verified: registered in `app.go` line 604)
- **A-004**: UserRepository exists and has `FindByIDs` method for batch user lookups (used by service)
- **A-005**: Admin role checking will be handled by existing auth middleware (pattern already established)

## Dependencies

- **D-001**: `LeaderboardService` must be registered in DI container before controller can use it
- **D-002**: Routes must be updated to use controller struct pattern (like BadgeController) instead of standalone functions
- **D-003**: Redis connection must be healthy for real-time ranking operations

## Out of Scope

- Implementing new leaderboard types or categories
- Adding real-time WebSocket updates for rank changes
- Historical leaderboard archival and queries
- Leaderboard UI components (client-side)
- Performance optimization of the service layer itself
