# Quester API Documentation

## Base URL

```
Development: http://localhost:8080
Production: https://api.quester.com
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```http
Authorization: Bearer <your_jwt_token>
```

## Response Format

### Success Response
```json
{
  "data": { ... },
  "message": "Success message"
}
```

### Error Response
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

## Status Codes

- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

---

## Query Parameters

### Cursor Pagination

List endpoints support cursor-based pagination for efficient traversal of large datasets. Cursor pagination provides O(1) performance for deep pages, unlike offset pagination which degrades with depth.

**Query Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| `cursor` | string | Base64-encoded cursor from previous response. Omit for first page. |
| `limit` | integer | Number of items per page (default: 20, max: 100) |
| `sort` | string | Field to sort by (e.g., `created_at`, `title`) |
| `order` | string | Sort order: `asc` or `desc` (default: `desc`) |

**Response Format**
```json
{
  "data": [...],
  "pagination": {
    "next_cursor": "eyJpZCI6IjEyMzQiLCJzb3J0X3ZhbHVlIjoiMjAyNS0wMS0xNSIsImRpcmVjdGlvbiI6Im5leHQiLCJzb3J0X2ZpZWxkIjoiY3JlYXRlZF9hdCJ9",
    "prev_cursor": "eyJpZCI6IjEyMzUiLCJzb3J0X3ZhbHVlIjoiMjAyNS0wMS0xNiIsImRpcmVjdGlvbiI6InByZXYiLCJzb3J0X2ZpZWxkIjoiY3JlYXRlZF9hdCJ9",
    "has_more": true,
    "limit": 20
  }
}
```

**Example: First page**
```http
GET /api/v1/courses?limit=20&sort=created_at&order=desc
```

**Example: Next page**
```http
GET /api/v1/courses?cursor=eyJpZCI6IjEyMzQiLCJzb3J0...&limit=20
```

**Example: Previous page**
```http
GET /api/v1/courses?cursor=eyJpZCI6IjEyMzUiLCJzb3J0...&limit=20
```

**Note**: Legacy `page` and `offset` parameters are deprecated. While still supported for backwards compatibility, they perform poorly on large datasets. Use cursor pagination for new integrations.

### Include Parameter (Batch Loading)

List endpoints support the `include` parameter to fetch related resources in a single request, eliminating N+1 query problems.

**Query Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| `include` | string | Comma-separated list of relations to include |

**Supported Relations by Endpoint**

| Endpoint | Allowed Includes |
|----------|------------------|
| `/api/v1/courses` | `instructor`, `category`, `lessons`, `enrollments` |
| `/api/v1/transactions` | `user`, `source` |
| `/api/v1/quests` | `creator`, `tasks`, `rewards`, `category` |

**Example: Courses with instructor and category**
```http
GET /api/v1/courses?include=instructor,category
```

**Example Response**
```json
{
  "data": [
    {
      "id": "course-123",
      "title": "Go Programming",
      "instructor": {
        "id": "user-456",
        "name": "John Doe"
      },
      "category": {
        "id": "cat-789",
        "name": "Programming"
      }
    }
  ],
  "pagination": {...}
}
```

**Validation Rules**
- Maximum include depth: 2 levels (e.g., `lessons.comments` is allowed)
- Unknown relations are silently ignored
- Include validation is case-sensitive

---

## Endpoints

### Health Check

#### GET /health

Check server health status.

**Response**
```json
{
  "status": "healthy",
  "database": "ok",
  "cache": "ok"
}
```

#### GET /health/database/pool

Get detailed database connection pool status. Returns real-time pool statistics and health information.

**Response** `200 OK`
```json
{
  "status": "healthy",
  "pool": {
    "max_open_connections": 25,
    "open_connections": 15,
    "in_use": 8,
    "idle": 7,
    "wait_count": 1250,
    "wait_duration_ms": 45678,
    "max_idle_closed": 123,
    "max_lifetime_closed": 45,
    "utilization": 0.32
  },
  "warmup": {
    "completed": true,
    "connections_established": 10,
    "duration_ms": 850
  },
  "health_check": {
    "enabled": true,
    "healthy": true,
    "last_check": "2025-01-22T10:30:00Z",
    "consecutive_failures": 0
  },
  "adaptive": {
    "enabled": true,
    "current_size": 25,
    "floor": 5,
    "ceiling": 50,
    "last_resize": "2025-01-22T09:15:00Z"
  }
}
```

**Response Fields**

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | Overall pool health: `healthy`, `degraded`, or `unhealthy` |
| `pool.max_open_connections` | int | Configured maximum connections |
| `pool.open_connections` | int | Current open connections (in_use + idle) |
| `pool.in_use` | int | Connections currently executing queries |
| `pool.idle` | int | Available idle connections |
| `pool.wait_count` | int64 | Total requests that waited for a connection |
| `pool.wait_duration_ms` | int64 | Total milliseconds waited for connections |
| `pool.utilization` | float64 | Current utilization (in_use / max_open, 0.0-1.0) |
| `warmup.completed` | bool | Whether startup warmup is complete |
| `health_check.healthy` | bool | Current health status |
| `adaptive.current_size` | int | Current adaptive pool size |

**Status Values**
- `healthy` - Pool operating normally, utilization < 80%
- `degraded` - High utilization (> 80%) or recent health check failures
- `unhealthy` - Consecutive health check failures (3+) or pool exhaustion

---

### Metrics Endpoint

#### GET /metrics

Prometheus metrics endpoint for monitoring and alerting.

**Connection Pool Metrics**

| Metric | Type | Description |
|--------|------|-------------|
| `quester_db_pool_max_open_connections` | Gauge | Maximum open connections configured |
| `quester_db_pool_open_connections` | Gauge | Current open connections |
| `quester_db_pool_in_use_connections` | Gauge | Connections currently in use |
| `quester_db_pool_idle_connections` | Gauge | Idle connections in pool |
| `quester_db_pool_utilization` | Gauge | Pool utilization ratio (0.0-1.0) |
| `quester_db_pool_wait_total` | Counter | Total connection wait requests |
| `quester_db_pool_wait_duration_seconds` | Histogram | Connection acquisition latency |
| `quester_db_pool_max_idle_closed_total` | Counter | Connections closed due to max idle limit |
| `quester_db_pool_max_lifetime_closed_total` | Counter | Connections closed due to max lifetime |
| `quester_db_pool_max_idle_time_closed_total` | Counter | Connections closed due to idle timeout |

**Warmup Metrics**

| Metric | Type | Description |
|--------|------|-------------|
| `quester_db_pool_warmup_duration_seconds` | Histogram | Warmup operation duration |
| `quester_db_pool_warmup_connections` | Gauge | Connections established during warmup |
| `quester_db_pool_warmup_errors_total` | Counter | Warmup connection failures |

**Health Check Metrics**

| Metric | Type | Description |
|--------|------|-------------|
| `quester_db_pool_health_check_duration_seconds` | Histogram | Health check duration |
| `quester_db_pool_health_check_success_total` | Counter | Successful health checks |
| `quester_db_pool_health_check_failure_total` | Counter | Failed health checks |
| `quester_db_pool_healthy` | Gauge | Current health status (1=healthy, 0=unhealthy) |

**Adaptive Sizing Metrics**

| Metric | Type | Description |
|--------|------|-------------|
| `quester_db_pool_adaptive_current_size` | Gauge | Current adaptive pool size |
| `quester_db_pool_adaptive_utilization` | Gauge | Utilization used for sizing decisions |
| `quester_db_pool_adaptive_resize_total` | Counter | Total resize operations (labels: direction=up/down) |
| `quester_db_pool_adaptive_decisions` | Counter | Scaling decisions (labels: type=scale_up/scale_down/no_change) |

**Example Prometheus Queries**

```promql
# Connection pool utilization
quester_db_pool_utilization

# Average wait time for connections (last 5 minutes)
rate(quester_db_pool_wait_duration_seconds_sum[5m]) / rate(quester_db_pool_wait_duration_seconds_count[5m])

# Connection acquisition P95 latency
histogram_quantile(0.95, rate(quester_db_pool_wait_duration_seconds_bucket[5m]))

# Alert on high pool utilization
quester_db_pool_utilization > 0.8

# Alert on unhealthy pool
quester_db_pool_healthy == 0
```

---

## Authentication

### POST /api/v1/auth/register

Register a new user account.

**Request Body**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "username": "johndoe",
  "full_name": "John Doe"
}
```

**Response** `201 Created`
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "johndoe",
    "full_name": "John Doe",
    "created_at": "2025-01-22T10:00:00Z"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 86400
}
```

**Errors**
- `400` - Invalid email format
- `400` - Password too weak
- `409` - Email already registered

---

### POST /api/v1/auth/login

Login with email and password.

**Request Body**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response** `200 OK`
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "johndoe"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 86400
}
```

**Errors**
- `400` - Missing email or password
- `401` - Invalid credentials
- `429` - Too many login attempts

---

### POST /api/v1/auth/refresh

Refresh access token using refresh token.

**Request Body**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response** `200 OK`
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 86400
}
```

**Errors**
- `401` - Invalid or expired refresh token

---

### POST /api/v1/auth/logout

Logout and invalidate tokens.

**Headers**
```http
Authorization: Bearer <access_token>
```

**Response** `200 OK`
```json
{
  "message": "Logged out successfully"
}
```

---

### POST /api/v1/auth/forgot-password

Request password reset email.

**Request Body**
```json
{
  "email": "user@example.com"
}
```

**Response** `200 OK`
```json
{
  "message": "Password reset email sent"
}
```

---

### POST /api/v1/auth/reset-password

Reset password using reset token.

**Request Body**
```json
{
  "token": "reset_token_from_email",
  "new_password": "NewSecurePass123!"
}
```

**Response** `200 OK`
```json
{
  "message": "Password reset successfully"
}
```

---

## Users

### GET /api/v1/users/me

Get current authenticated user.

**Headers**
```http
Authorization: Bearer <access_token>
```

**Response** `200 OK`
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "username": "johndoe",
  "full_name": "John Doe",
  "avatar_url": "https://...",
  "bio": "User bio",
  "created_at": "2025-01-22T10:00:00Z",
  "updated_at": "2025-01-22T10:00:00Z"
}
```

---

### PUT /api/v1/users/me

Update current user profile.

**Headers**
```http
Authorization: Bearer <access_token>
```

**Request Body**
```json
{
  "full_name": "John Smith",
  "bio": "Updated bio",
  "avatar_url": "https://..."
}
```

**Response** `200 OK`
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "username": "johndoe",
  "full_name": "John Smith",
  "bio": "Updated bio",
  "avatar_url": "https://...",
  "updated_at": "2025-01-22T11:00:00Z"
}
```

---

### GET /api/v1/users/:id

Get user by ID.

**Headers**
```http
Authorization: Bearer <access_token>
```

**Parameters**
- `id` (path) - User ID (UUID)

**Response** `200 OK`
```json
{
  "id": "uuid",
  "username": "johndoe",
  "full_name": "John Doe",
  "avatar_url": "https://...",
  "bio": "User bio",
  "created_at": "2025-01-22T10:00:00Z"
}
```

**Errors**
- `404` - User not found

---

## Quests

### GET /api/v1/quests

List all quests with pagination.

**Headers**
```http
Authorization: Bearer <access_token>
```

**Query Parameters**
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 20, max: 100)
- `status` (optional) - Filter by status: `active`, `completed`, `draft`
- `category` (optional) - Filter by category

**Response** `200 OK`
```json
{
  "quests": [
    {
      "id": "uuid",
      "title": "Complete Daily Challenge",
      "description": "Finish all daily tasks",
      "category": "daily",
      "status": "active",
      "reward_points": 100,
      "difficulty": "easy",
      "created_at": "2025-01-22T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "total_pages": 3
  }
}
```

---

### POST /api/v1/quests

Create a new quest (Admin only).

**Headers**
```http
Authorization: Bearer <access_token>
```

**Request Body**
```json
{
  "title": "New Quest",
  "description": "Quest description",
  "category": "daily",
  "reward_points": 100,
  "difficulty": "easy",
  "requirements": {
    "min_level": 1,
    "tasks": ["task1", "task2"]
  }
}
```

**Response** `201 Created`
```json
{
  "id": "uuid",
  "title": "New Quest",
  "description": "Quest description",
  "category": "daily",
  "status": "draft",
  "reward_points": 100,
  "difficulty": "easy",
  "created_at": "2025-01-22T10:00:00Z"
}
```

**Errors**
- `403` - Insufficient permissions
- `400` - Invalid quest data

---

### GET /api/v1/quests/:id

Get quest details by ID.

**Headers**
```http
Authorization: Bearer <access_token>
```

**Parameters**
- `id` (path) - Quest ID (UUID)

**Response** `200 OK`
```json
{
  "id": "uuid",
  "title": "Complete Daily Challenge",
  "description": "Finish all daily tasks",
  "category": "daily",
  "status": "active",
  "reward_points": 100,
  "difficulty": "easy",
  "requirements": {
    "min_level": 1,
    "tasks": ["task1", "task2"]
  },
  "created_at": "2025-01-22T10:00:00Z",
  "updated_at": "2025-01-22T10:00:00Z"
}
```

**Errors**
- `404` - Quest not found

---

### PUT /api/v1/quests/:id

Update quest (Admin only).

**Headers**
```http
Authorization: Bearer <access_token>
```

**Parameters**
- `id` (path) - Quest ID (UUID)

**Request Body**
```json
{
  "title": "Updated Quest Title",
  "description": "Updated description",
  "status": "active"
}
```

**Response** `200 OK`
```json
{
  "id": "uuid",
  "title": "Updated Quest Title",
  "description": "Updated description",
  "status": "active",
  "updated_at": "2025-01-22T11:00:00Z"
}
```

**Errors**
- `403` - Insufficient permissions
- `404` - Quest not found

---

### DELETE /api/v1/quests/:id

Delete quest (Admin only).

**Headers**
```http
Authorization: Bearer <access_token>
```

**Parameters**
- `id` (path) - Quest ID (UUID)

**Response** `204 No Content`

**Errors**
- `403` - Insufficient permissions
- `404` - Quest not found

---

## Quest Submissions

### POST /api/v1/quests/:id/submit

Submit quest completion.

**Headers**
```http
Authorization: Bearer <access_token>
```

**Parameters**
- `id` (path) - Quest ID (UUID)

**Request Body**
```json
{
  "proof": "https://proof-url.com/image.jpg",
  "notes": "Completion notes"
}
```

**Response** `201 Created`
```json
{
  "id": "uuid",
  "quest_id": "uuid",
  "user_id": "uuid",
  "status": "pending",
  "proof": "https://proof-url.com/image.jpg",
  "notes": "Completion notes",
  "submitted_at": "2025-01-22T10:00:00Z"
}
```

**Errors**
- `404` - Quest not found
- `409` - Quest already submitted

---

## Leaderboard

### GET /api/v1/leaderboard

Get leaderboard rankings.

**Headers**
```http
Authorization: Bearer <access_token>
```

**Query Parameters**
- `type` (optional) - `daily`, `weekly`, `monthly`, `all-time` (default: `all-time`)
- `limit` (optional) - Number of results (default: 10, max: 100)

**Response** `200 OK`
```json
{
  "leaderboard": [
    {
      "rank": 1,
      "user": {
        "id": "uuid",
        "username": "topuser",
        "avatar_url": "https://..."
      },
      "points": 1500,
      "quests_completed": 25
    }
  ],
  "user_rank": {
    "rank": 42,
    "points": 350,
    "quests_completed": 7
  }
}
```

---

## Social Gamification

Social XP system for rewarding social interactions with XP, achievements, and challenges.

### GET /api/v1/social/xp

Get current user's social XP summary.

**Headers**
```http
Authorization: Bearer <access_token>
```

**Response** `200 OK`
```json
{
  "summary": {
    "user_id": "uuid",
    "total_social_xp": 1250,
    "posts_created": 15,
    "likes_given_count": 85,
    "likes_received_count": 230,
    "comments_count": 42,
    "following_count": 28,
    "shares_count": 12,
    "current_streak": 5,
    "longest_streak": 12,
    "last_activity_at": "2025-01-22T15:30:00Z"
  },
  "history": [
    {
      "id": "uuid",
      "action_type": "like",
      "xp_amount": 2,
      "description": "Liked a post",
      "created_at": "2025-01-22T15:30:00Z"
    }
  ]
}
```

### GET /api/v1/social/xp/history

Get XP transaction history.

**Query Parameters**
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 20, max: 100)
- `action_type` (optional) - Filter by action type: `post`, `like`, `comment`, `follow`, `share`, `milestone`, `challenge`

**Response** `200 OK`
```json
{
  "transactions": [
    {
      "id": "uuid",
      "action_type": "post",
      "xp_amount": 10,
      "description": "Created a new post",
      "content_id": "uuid",
      "content_type": "social_post",
      "created_at": "2025-01-22T15:30:00Z"
    }
  ],
  "total": 150,
  "page": 1,
  "page_size": 20
}
```

### GET /api/v1/social/challenges

Get today's daily challenges with progress.

**Response** `200 OK`
```json
{
  "challenges": [
    {
      "challenge_id": "uuid",
      "title": "Social Butterfly",
      "description": "Like 5 posts from others",
      "action_type": "like",
      "target_count": 5,
      "current_count": 3,
      "xp_reward": 25,
      "completed": false,
      "expires_at": "2025-01-23T00:00:00Z"
    },
    {
      "challenge_id": "uuid",
      "title": "Content Creator",
      "description": "Create 1 new post",
      "action_type": "post",
      "target_count": 1,
      "current_count": 1,
      "xp_reward": 50,
      "completed": true,
      "completed_at": "2025-01-22T14:20:00Z",
      "expires_at": "2025-01-23T00:00:00Z"
    }
  ]
}
```

### GET /api/v1/social/achievements

Get user's social achievements with progress.

**Response** `200 OK`
```json
{
  "achievements": [
    {
      "id": "uuid",
      "name": "First Post",
      "description": "Create your first social post",
      "icon_url": "https://...",
      "category": "social",
      "difficulty": "easy",
      "target_count": 1,
      "current_count": 1,
      "completed": true,
      "xp_reward": 50,
      "completed_at": "2025-01-20T10:00:00Z"
    },
    {
      "id": "uuid",
      "name": "Social Star",
      "description": "Receive 100 likes on your posts",
      "icon_url": "https://...",
      "category": "social",
      "difficulty": "medium",
      "target_count": 100,
      "current_count": 45,
      "completed": false,
      "xp_reward": 200
    }
  ],
  "total": 25
}
```

### GET /api/v1/leaderboards/social

Get social XP leaderboard rankings.

**Query Parameters**
- `period` (optional) - `daily`, `weekly`, `monthly`, `alltime` (default: `alltime`)
- `limit` (optional) - Number of results (default: 10, max: 50)

**Response** `200 OK`
```json
{
  "entries": [
    {
      "rank": 1,
      "user_id": "uuid",
      "username": "socialstar",
      "avatar_url": "https://...",
      "total_social_xp": 5420,
      "current_streak": 15
    }
  ],
  "user_rank": {
    "rank": 42,
    "user_id": "uuid",
    "username": "you",
    "total_social_xp": 1250,
    "current_streak": 5
  },
  "total_users": 500
}
```

### XP Award Values

| Action | XP Awarded | Rate Limit |
|--------|-----------|------------|
| Create Post | +10 XP | No limit |
| Like Post | +2 XP | 100/hour |
| Comment | +5 XP | 100/hour |
| Follow User | +3 XP | 100/hour |
| Share Post | +5 XP | 100/hour |
| Daily Challenge Completion | +25-75 XP | Daily |
| Perfect Day Bonus | +100 XP | Daily |
| Content Milestone (10 likes) | +25 XP | Per post |
| Content Milestone (50 likes) | +100 XP | Per post |
| Content Milestone (100 likes) | +250 XP | Per post |

### XP Rules

- **No self-interactions**: Users cannot earn XP for liking their own posts
- **No duplicates**: Each user-content-action combination awards XP only once
- **Rate limiting**: Maximum 100 XP-earning actions per hour
- **Real-time feedback**: XP is displayed immediately via optimistic updates
- **Global XP**: Social XP contributes to the user's global XP total

---

## Rate Limiting

All endpoints are rate-limited:

- **General**: 100 requests per minute per IP
- **Auth (login/register)**: 10 requests per hour per IP
- **Password reset**: 5 requests per hour per email

**Rate Limit Headers**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642857600
```

**Rate Limit Exceeded Response** `429 Too Many Requests`
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "retry_after": 60
  }
}
```

---

## Pagination

List endpoints support pagination:

**Query Parameters**
- `page` - Page number (1-indexed)
- `limit` - Items per page (max 100)

**Response**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "total_pages": 8
  }
}
```

---

## Examples

### cURL Examples

**Register**
```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "username": "johndoe",
    "full_name": "John Doe"
  }'
```

**Login**
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

**Get Current User**
```bash
curl -X GET http://localhost:8080/api/v1/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**List Quests**
```bash
curl -X GET "http://localhost:8080/api/v1/quests?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## WebSocket

### Connection

```javascript
const ws = new WebSocket('ws://localhost:8080/ws');

ws.onopen = () => {
  // Send authentication
  ws.send(JSON.stringify({
    type: 'auth',
    token: 'YOUR_ACCESS_TOKEN'
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};
```

### Message Types

**Authentication**
```json
{
  "type": "auth",
  "token": "YOUR_ACCESS_TOKEN"
}
```

**Quest Update**
```json
{
  "type": "quest_update",
  "quest_id": "uuid",
  "status": "completed"
}
```

**Leaderboard Update**
```json
{
  "type": "leaderboard_update",
  "user_rank": 42,
  "points": 350
}
```

---

## Learning Gamification (T108)

Course gamification endpoints for XP tracking, levels, streaks, achievements, and leaderboards.

### GET /api/v1/learning/xp/summary

Get XP summary for the authenticated user.

**Response**
```json
{
  "total_xp": 2500,
  "level": 8,
  "level_name": "Scholar",
  "xp_to_next_level": 500,
  "progress_pct": 0.75
}
```

### GET /api/v1/learning/xp/transactions

Get paginated XP transaction history.

**Query Parameters**
- `page` (int, default: 1) - Page number
- `page_size` (int, default: 20, max: 100) - Items per page

**Response**
```json
{
  "transactions": [
    {
      "id": "uuid",
      "action_type": "lesson_completion",
      "xp_amount": 25,
      "content_type": "Lesson",
      "content_id": "uuid",
      "description": "Completed Introduction to React",
      "created_at": "2025-01-22T10:30:00Z"
    }
  ],
  "total": 150,
  "page": 1,
  "page_size": 20
}
```

### POST /api/v1/learning/lessons/{lessonId}/complete

Mark a lesson as completed and award XP.

**Response**
```json
{
  "xp_awarded": 25,
  "new_total_xp": 2525,
  "leveled_up": false,
  "streak_updated": true,
  "current_streak": 7,
  "achievements_unlocked": [],
  "challenges_updated": [
    {
      "challenge_id": "uuid",
      "progress": 3,
      "target": 5,
      "completed": false
    }
  ]
}
```

### GET /api/v1/learning/progress

Get course progress for all enrolled courses.

**Response**
```json
{
  "courses": [
    {
      "course_id": "uuid",
      "course_name": "React Fundamentals",
      "lessons_completed": 8,
      "total_lessons": 12,
      "xp_earned": 200,
      "progress_pct": 66.67,
      "is_completed": false
    }
  ]
}
```

### GET /api/v1/learning/progress/{courseId}

Get progress for a specific course.

**Response**
```json
{
  "course_id": "uuid",
  "course_name": "React Fundamentals",
  "lessons_completed": 8,
  "total_lessons": 12,
  "xp_earned": 200,
  "progress_pct": 66.67,
  "completed_lesson_ids": ["uuid1", "uuid2"],
  "is_completed": false
}
```

### GET /api/v1/learning/streak

Get learning streak information.

**Response**
```json
{
  "current_streak": 7,
  "longest_streak": 14,
  "last_activity_date": "2025-01-22",
  "next_milestone_days": 14,
  "next_milestone_xp": 150,
  "days_until_next_milestone": 7
}
```

### GET /api/v1/learning/leaderboard

Get learning leaderboard.

**Query Parameters**
- `timeframe` (string: daily|weekly|monthly|all_time, default: weekly) - Time period
- `limit` (int, default: 50, max: 100) - Number of entries

**Response**
```json
{
  "entries": [
    {
      "rank": 1,
      "user_id": "uuid",
      "username": "toplearner",
      "display_name": "Top Learner",
      "avatar_url": "https://...",
      "total_xp": 5000,
      "level": 12,
      "lessons_completed": 45,
      "is_current_user": false
    }
  ],
  "current_user_rank": 15
}
```

### GET /api/v1/learning/challenges/daily

Get today's daily learning challenges.

**Response**
```json
{
  "challenges": [
    {
      "id": "uuid",
      "title": "Complete 3 Lessons",
      "description": "Complete any 3 lessons today",
      "type": "lesson_count",
      "target_value": 3,
      "current_progress": 1,
      "xp_reward": 50,
      "difficulty": "easy",
      "status": "active",
      "expires_at": "2025-01-23T00:00:00Z"
    }
  ],
  "reset_time": "2025-01-23T00:00:00Z"
}
```

### GET /api/v1/learning/achievements

Get learning achievements.

**Response**
```json
{
  "achievements": [
    {
      "id": "uuid",
      "name": "First Steps",
      "description": "Complete your first lesson",
      "icon_url": "https://...",
      "category": "lessons",
      "xp_reward": 25,
      "is_unlocked": true,
      "unlocked_at": "2025-01-15T12:00:00Z",
      "progress": 1,
      "target": 1,
      "progress_pct": 100
    }
  ]
}
```

### POST /api/v1/learning/admin/badges/award

Award a badge to a student (Instructor/Admin only).

**Request Body**
```json
{
  "student_id": "uuid",
  "badge_id": "uuid",
  "course_id": "uuid",
  "message": "Outstanding participation in class discussions!"
}
```

**Response**
```json
{
  "user_badge": {
    "id": "uuid",
    "user_id": "uuid",
    "badge_id": "uuid",
    "badge_name": "Top Contributor",
    "awarded_by": "uuid",
    "awarded_by_name": "Professor Smith",
    "message": "Outstanding participation in class discussions!",
    "awarded_at": "2025-01-22T15:30:00Z"
  }
}
```

### Learning Gamification WebSocket Events

The following WebSocket events are emitted for real-time updates:

**learning_xp_awarded**
```json
{
  "type": "learning_xp_awarded",
  "data": {
    "user_id": "uuid",
    "xp_amount": 25,
    "action_type": "lesson_completion",
    "new_total_xp": 2525
  }
}
```

**learning_level_up**
```json
{
  "type": "learning_level_up",
  "data": {
    "user_id": "uuid",
    "new_level": 8,
    "level_name": "Scholar",
    "previous_level": 7
  }
}
```

**learning_achievement_unlocked**
```json
{
  "type": "learning_achievement_unlocked",
  "data": {
    "user_id": "uuid",
    "achievement": {
      "id": "uuid",
      "name": "Lesson Master",
      "icon_url": "https://...",
      "xp_reward": 100
    }
  }
}
```

**learning_streak_milestone**
```json
{
  "type": "learning_streak_milestone",
  "data": {
    "user_id": "uuid",
    "streak_days": 7,
    "milestone_xp": 100,
    "is_new_milestone": true
  }
}
```

**learning_challenge_completed**
```json
{
  "type": "learning_challenge_completed",
  "data": {
    "user_id": "uuid",
    "challenge_id": "uuid",
    "challenge_title": "Complete 3 Lessons",
    "xp_reward": 50
  }
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `INVALID_INPUT` | Request validation failed |
| `UNAUTHORIZED` | Authentication required |
| `FORBIDDEN` | Insufficient permissions |
| `NOT_FOUND` | Resource not found |
| `CONFLICT` | Resource already exists |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `INTERNAL_ERROR` | Server error |

---

**Last Updated**: 2025-01-22
**API Version**: v1
