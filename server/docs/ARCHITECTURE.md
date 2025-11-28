# Quester Backend Architecture

## Overview

The Quester backend is a high-performance Go server built with the Fiber framework, PostgreSQL database, and Redis cache. It follows a clean architecture pattern with clear separation of concerns.

## Technology Stack

- **Language**: Go 1.24.0
- **Web Framework**: Fiber v2 (Fast HTTP framework)
- **Database**: PostgreSQL with GORM ORM
- **Cache**: Redis
- **Authentication**: JWT tokens
- **Monitoring**: Prometheus metrics, Sentry error tracking
- **Payments**: Stripe, Razorpay
- **Cloud Storage**: AWS S3, Firebase
- **Real-time**: WebSockets

## Architecture Layers

```
┌─────────────────────────────────────────┐
│          HTTP Layer (Fiber)             │
│  Routes → Middleware → Controllers      │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         Business Logic Layer            │
│            Services                     │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│          Data Access Layer              │
│          Repositories                   │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         Data Storage Layer              │
│     PostgreSQL    │    Redis            │
└─────────────────────────────────────────┘
```

## Framework vs Application Layer Separation

The codebase maintains a clear separation between the **Framework Layer** (`internal/framework/`) and the **Application Layer** (`internal/`). This separation enables:

1. **Independent Testing**: Framework components can be built and tested without application code
2. **Mock Injection**: Framework uses interfaces that can be implemented with mocks
3. **Reusability**: Framework code can be extracted for other projects

### Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   APPLICATION LAYER                          │
│  internal/controllers, services, repositories, models        │
│  - Business logic, domain models, data access               │
│  - Can import from Framework Layer                          │
└─────────────────────────────────────────────────────────────┘
                            ↓ imports
┌─────────────────────────────────────────────────────────────┐
│                    FRAMEWORK LAYER                           │
│  internal/framework/auth, cache, config, database, payment   │
│  - Infrastructure, utilities, interfaces                    │
│  - CANNOT import from Application Layer                     │
└─────────────────────────────────────────────────────────────┘
```

### Key Interfaces

| Interface | Package | Implemented By |
|-----------|---------|----------------|
| `ClaimsProvider` | `framework/auth` | `models.User` |
| `StreamInfo` | `framework/interfaces` | `models.VideoStream` |
| `StreamRepository` | `framework/interfaces` | `adapters.StreamRepositoryAdapter` |
| `TokenBlacklist` | `framework/interfaces` | `services.BlacklistService` |

### Configuration via Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `USE_MOCKS` | `false` | Enable mock injection for testing |
| `PAYMENT_PROVIDER` | `stripe` | Payment provider: `stripe`, `razorpay`, or `both` |
| `STRIPE_API_KEY` | - | Required when provider is `stripe` or `both` |
| `RAZORPAY_KEY_ID` | - | Required when provider is `razorpay` or `both` |
| `RAZORPAY_KEY_SECRET` | - | Required when provider is `razorpay` or `both` |

#### Query Optimization Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `SLOW_QUERY_THRESHOLD_MS` | `500` | Queries exceeding this threshold (ms) trigger EXPLAIN ANALYZE logging |
| `DB_REPLICA_ENABLED` | `false` | Enable read replica routing |
| `DB_REPLICA_DSNS` | - | Comma-separated list of replica connection strings |
| `DB_REPLICA_MAX_OPEN_CONNS` | `10` | Max open connections per replica |
| `DB_REPLICA_MAX_IDLE_CONNS` | `2` | Max idle connections per replica |
| `DB_REPLICA_STALE_THRESHOLD_MS` | `1000` | Maximum acceptable replication lag (ms) before marking replica unhealthy |
| `DB_REPLICA_HEALTH_CHECK_INTERVAL` | `10s` | How often to check replica health |

### Verifying Framework Independence

```bash
# Build framework independently (should succeed with zero application imports)
go build ./internal/framework/...

# Verify no forbidden imports
grep -r "internal/models\|internal/repositories\|internal/services\|internal/controllers" \
  ./internal/framework/ --include="*.go"
# (should return empty)
```

## Directory Structure

```
server/
├── cmd/                          # Application entry points
│   ├── server/                   # Main server application
│   │   └── main.go              # Server startup
│   ├── migrate/                  # Database migration tool
│   ├── encrypt-2fa-secrets/      # 2FA encryption utility
│   └── test/                     # Test utilities
│
├── internal/                     # Private application code
│   ├── app/                      # Application initialization
│   │   └── app.go               # App setup, DI container
│   │
│   ├── config/                   # Configuration management
│   │   ├── config.go            # Config struct and loader
│   │   └── validation.go        # Config validation
│   │
│   ├── controllers/              # HTTP request handlers
│   │   ├── auth_controller.go   # Authentication endpoints
│   │   ├── user_controller.go   # User management
│   │   ├── quest_controller.go  # Quest operations
│   │   └── ...                  # Other controllers
│   │
│   ├── framework/                # Core framework utilities
│   │   ├── auth/                # Authentication utilities
│   │   │   ├── jwt.go          # JWT token handling
│   │   │   ├── password.go     # Password hashing
│   │   │   └── 2fa.go          # Two-factor authentication
│   │   ├── cache/               # Redis cache wrapper
│   │   ├── config/              # Config loading
│   │   ├── controller/          # Controller helpers (NEW)
│   │   │   ├── auth_context.go  # GetAuthContext helper
│   │   │   ├── pagination.go    # ParsePagination helper
│   │   │   └── helpers.go       # ParseAndValidate[T]
│   │   ├── database/            # Database connection
│   │   │   ├── database.go      # GORM initialization
│   │   │   └── pool/            # Connection pool management (NEW)
│   │   │       ├── pool.go      # Package exports
│   │   │       ├── config.go    # Pool configuration
│   │   │       ├── stats.go     # Pool statistics
│   │   │       ├── errors.go    # Pool errors
│   │   │       ├── metrics.go   # Prometheus metrics
│   │   │       ├── warmup.go    # Connection warmup
│   │   │       ├── health.go    # Health checks
│   │   │       └── adaptive.go  # Adaptive sizing
│   │   ├── email/               # Email sending
│   │   ├── repository/          # Repository patterns (NEW)
│   │   │   ├── generic.go       # GenericRepository[T]
│   │   │   ├── tenant_model.go  # TenantModel interface
│   │   │   ├── options.go       # QueryOption functions
│   │   │   └── errors.go        # Repository errors
│   │   ├── responses/           # Response helpers (NEW)
│   │   │   └── helpers.go       # BadRequest, Success, etc.
│   │   ├── service/             # Service patterns (NEW)
│   │   │   ├── base.go          # BaseService struct
│   │   │   ├── transaction.go   # TransactionManager
│   │   │   └── errors.go        # Service errors
│   │   ├── storage/             # File storage (S3, local)
│   │   ├── metrics/             # Prometheus metrics
│   │   ├── sentry/              # Error tracking
│   │   └── validators/          # Input validation
│   │
│   ├── middleware/               # HTTP middleware
│   │   ├── auth.go              # Authentication middleware
│   │   ├── cors.go              # CORS configuration
│   │   ├── rate_limit.go        # Rate limiting
│   │   └── logger.go            # Request logging
│   │
│   ├── models/                   # Data models (GORM)
│   │   ├── user.go              # User model
│   │   ├── quest.go             # Quest model
│   │   ├── transaction.go       # Payment transaction
│   │   └── ...                  # Other models
│   │
│   ├── repositories/             # Data access layer
│   │   ├── user_repository.go   # User data access
│   │   ├── quest_repository.go  # Quest data access
│   │   └── ...                  # Other repositories
│   │
│   ├── routes/                   # Route definitions
│   │   ├── routes.go            # Main route setup
│   │   ├── auth_routes.go       # Auth routes
│   │   ├── user_routes.go       # User routes
│   │   └── ...                  # Other route groups
│   │
│   ├── services/                 # Business logic
│   │   ├── auth_service.go      # Authentication logic
│   │   ├── user_service.go      # User operations
│   │   ├── quest_service.go     # Quest management
│   │   ├── payment_service.go   # Payment processing
│   │   └── ...                  # Other services
│   │
│   ├── utils/                    # Utility functions
│   │   ├── helpers.go           # General helpers
│   │   └── validators.go        # Validation helpers
│   │
│   └── websocket/                # WebSocket handlers
│       └── hub.go               # WebSocket hub
│
├── migrations/                   # Database migrations
│   ├── 001_create_users.sql
│   ├── 002_create_quests.sql
│   └── ...
│
├── docs/                         # Documentation
│   ├── ARCHITECTURE.md          # This file
│   ├── API.md                   # API documentation
│   └── DATABASE.md              # Database schema
│
├── .env.example                  # Environment variables template
├── docker-compose.yml            # Docker setup
├── Makefile                      # Build commands
├── go.mod                        # Go dependencies
└── README.md                     # Project overview
```

## Request Flow

### 1. HTTP Request
```
Client → Fiber Router → Middleware Chain → Controller
```

### 2. Middleware Chain
```
1. Recover (panic recovery)
2. Logger (request logging)
3. Sentry (error tracking)
4. CORS (cross-origin)
5. Auth (JWT validation) [if protected]
6. Rate Limit [if enabled]
```

### 3. Controller Processing
```go
func (c *UserController) GetUser(ctx *fiber.Ctx) error {
    // 1. Extract parameters
    userID := ctx.Params("id")
    
    // 2. Validate input
    if err := validate(userID); err != nil {
        return ctx.Status(400).JSON(errorResponse(err))
    }
    
    // 3. Call service
    user, err := c.userService.GetByID(userID)
    if err != nil {
        return handleError(ctx, err)
    }
    
    // 4. Return response
    return ctx.JSON(user)
}
```

### 4. Service Layer
```go
func (s *UserService) GetByID(id string) (*models.User, error) {
    // 1. Check cache
    if cached := s.cache.Get("user:" + id); cached != nil {
        return cached, nil
    }
    
    // 2. Query repository
    user, err := s.userRepo.FindByID(id)
    if err != nil {
        return nil, err
    }
    
    // 3. Update cache
    s.cache.Set("user:" + id, user, 5*time.Minute)
    
    return user, nil
}
```

### 5. Repository Layer
```go
func (r *UserRepository) FindByID(id string) (*models.User, error) {
    var user models.User
    err := r.db.Where("id = ?", id).First(&user).Error
    return &user, err
}
```

## Data Flow

### Authentication Flow
```
1. POST /api/v1/auth/login
   ↓
2. AuthController.Login()
   ↓
3. AuthService.Login(email, password)
   ↓
4. UserRepository.FindByEmail(email)
   ↓
5. Verify password hash
   ↓
6. Generate JWT token
   ↓
7. Return token to client
```

### Protected Route Flow
```
1. GET /api/v1/users/me
   ↓
2. Auth Middleware
   ↓
3. Extract JWT from header
   ↓
4. Validate token
   ↓
5. Extract user ID
   ↓
6. Set user in context
   ↓
7. UserController.GetMe()
   ↓
8. Return user data
```

## Key Design Patterns

### 1. Dependency Injection
All dependencies are injected through constructors:

```go
type UserService struct {
    userRepo    repositories.UserRepository
    cache       cache.Cache
    emailSender email.Sender
}

func NewUserService(
    userRepo repositories.UserRepository,
    cache cache.Cache,
    emailSender email.Sender,
) *UserService {
    return &UserService{
        userRepo:    userRepo,
        cache:       cache,
        emailSender: emailSender,
    }
}
```

### 2. Repository Pattern
Data access is abstracted through repositories:

```go
type UserRepository interface {
    FindByID(id string) (*models.User, error)
    FindByEmail(email string) (*models.User, error)
    Create(user *models.User) error
    Update(user *models.User) error
    Delete(id string) error
}
```

### 3. Service Layer Pattern
Business logic is encapsulated in services:

```go
type UserService interface {
    GetByID(id string) (*models.User, error)
    Create(req *CreateUserRequest) (*models.User, error)
    Update(id string, req *UpdateUserRequest) error
    Delete(id string) error
}
```

### 4. DI Container Pattern (Phase 7 Refactor)

The application uses a custom dependency injection container for managing service lifecycles.

#### Container Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    DI Container                         │
├─────────────────────────────────────────────────────────┤
│  Infrastructure (Singletons)                            │
│  ├── database (*gorm.DB)                               │
│  ├── cache (*redis.Client)                             │
│  └── config (*config.Config)                           │
├─────────────────────────────────────────────────────────┤
│  Repositories (Singletons)                              │
│  ├── UserRepository                                     │
│  ├── QuestRepository                                    │
│  ├── TwoFactorRepository                               │
│  ├── BackupCodeRepository                              │
│  └── ... (15 total)                                    │
├─────────────────────────────────────────────────────────┤
│  Services (Singletons)                                  │
│  ├── AuthService                                        │
│  ├── TwoFactorService                                  │
│  ├── NotificationService                               │
│  └── ... (all injected via constructors)               │
└─────────────────────────────────────────────────────────┘
```

#### Service Resolution Methods

```go
// Required services - panics if unavailable (fail-fast startup)
db := container.MustResolve("database").(*gorm.DB)

// Optional services - returns nil with warning log (graceful degradation)
fcm := container.OptionalResolve("fcm-service")

// Error-returning resolution
service, err := container.Resolve("my-service")
```

#### Service Classification

**Required Services (19)** - Startup fails if unavailable:
- Database, Cache, Config (infrastructure)
- UserService, AuthService, PropertyService, TransactionService
- QuestService, BadgeService, NotificationService, MessagingService
- SocialService, CourseService, LessonService, EnrollmentService
- CertificateService, AnalyticsService, AuditLogService

**Optional Services (15)** - Startup continues with warning:
- FCMService, DVRService, KMSService, OCRService, OpenAIService
- VideoStreamingService, SentryService, LeaderboardService
- PaymentManager, WebSocket RedisManager, TypingIndicator
- ModerationService, StreamingMetrics

#### Repository Pattern (No Global State)

All repositories use constructor injection with validation:

```go
func NewUserRepository(db *gorm.DB) *UserRepository {
    ValidateDB(db, "UserRepository") // Panics if nil
    return &UserRepository{db: db}
}

// Service uses injected repository
func NewAuthService(
    userRepo *repositories.UserRepository,
    tokenRepo *repositories.RefreshTokenRepository,
    blacklistSvc *services.BlacklistService,
) *AuthService {
    return &AuthService{
        userRepo:     userRepo,
        tokenRepo:    tokenRepo,
        blacklistSvc: blacklistSvc,
    }
}
```

#### Zero Global State in Services

As of Phase 7, no services access `database.DB` or `cache.Client` directly.
All dependencies are injected via constructors:
```

## Configuration

Configuration is loaded from environment variables and validated on startup:

```go
type Config struct {
    // Server
    Port int
    Host string
    Env  string
    
    // Database
    DatabaseURL      string
    DBMaxOpenConns   int
    DBMaxIdleConns   int
    DBConnMaxLifetime time.Duration
    
    // Redis
    RedisURL      string
    RedisPassword string
    RedisDB       int
    
    // JWT
    JWTSecret string
    JWTExpiry time.Duration
    
    // CORS
    CORSAllowedOrigins []string
}
```

## Database Schema

### Core Tables
- `users` - User accounts
- `quests` - Quest definitions
- `quest_submissions` - User quest submissions
- `transactions` - Payment transactions
- `sessions` - User sessions
- `refresh_tokens` - JWT refresh tokens

### Relationships
```
users (1) ──── (N) quests
users (1) ──── (N) quest_submissions
users (1) ──── (N) transactions
users (1) ──── (N) sessions
```

## Caching Strategy

### Cache Keys
```
user:{id}              # User data (5 min TTL)
quest:{id}             # Quest data (10 min TTL)
leaderboard:{type}     # Leaderboard (1 min TTL)
session:{token}        # Session data (24 hour TTL)
```

### Cache Invalidation
- User update → Invalidate `user:{id}`
- Quest update → Invalidate `quest:{id}`
- New submission → Invalidate leaderboard

## Error Handling

### Error Types
```go
type AppError struct {
    Code    string // "USER_NOT_FOUND", "INVALID_INPUT"
    Message string // User-friendly message
    Err     error  // Original error
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (not authenticated)
- `403` - Forbidden (not authorized)
- `404` - Not Found
- `500` - Internal Server Error

## Security

### Authentication
- JWT tokens with RS256 signing
- Refresh token rotation
- Token blacklisting on logout

### Password Security
- Bcrypt hashing (cost 12)
- Minimum 8 characters
- Complexity requirements

### Rate Limiting
- 100 requests per minute per IP
- 10 login attempts per hour per IP

### Input Validation
- All inputs validated using `validator` package
- SQL injection prevention via GORM
- XSS prevention via HTML sanitization

## Connection Pool Management

The `internal/framework/database/pool/` package provides comprehensive connection pool management for PostgreSQL connections via `sql.DB`.

### Pool Components

| Component | File | Description |
|-----------|------|-------------|
| Configuration | `config.go` | Pool configuration with validation |
| Statistics | `stats.go` | Real-time pool statistics and computed metrics |
| Errors | `errors.go` | Typed errors for pool operations |
| Metrics | `metrics.go` | Prometheus metrics for monitoring |
| Warmup | `warmup.go` | Pre-establish connections on startup |
| Health Checks | `health.go` | Background health validation with recovery |
| Adaptive Sizing | `adaptive.go` | Automatic pool size adjustment |

### Pool Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GORM / sql.DB                             │
└─────────────────────────────────────────────────────────────┘
                            ↑
┌─────────────────────────────────────────────────────────────┐
│                    Pool Management                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Metrics   │  │  Warmup     │  │   Health    │         │
│  │  Collector  │  │   Pool      │  │   Checker   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Adaptive Manager                        │   │
│  │   (scale up/down based on utilization)              │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↑
┌─────────────────────────────────────────────────────────────┐
│                    Prometheus                                │
│   quester_db_pool_* metrics                                 │
└─────────────────────────────────────────────────────────────┘
```

### Key Features

**Metrics Collection** (US1)
- Exports Prometheus metrics every 5 seconds
- Tracks: connections, utilization, wait times, closures
- Enables alerting on pool exhaustion or high wait times

**Warmup** (US2)
- Pre-establishes connections on startup
- Eliminates cold-start latency for first requests
- Configurable warmup size and timeout

**Health Checks** (US3)
- Background validation with `SELECT 1` queries
- Tracks consecutive failures (3+ = unhealthy)
- Automatic recovery detection

**Adaptive Sizing** (US4)
- Automatic scale up when utilization > 80%
- Automatic scale down when utilization < 20%
- Respects floor/ceiling bounds
- 30-second evaluation interval

### Configuration

See `server/.env.example` for all pool configuration options:

```bash
# Core pool settings
DB_MAX_OPEN_CONNS=25
DB_MAX_IDLE_CONNS=5
DB_CONN_MAX_LIFETIME=5m

# Warmup
DB_POOL_WARMUP_ENABLED=true
DB_POOL_WARMUP_SIZE=10

# Health checks
DB_HEALTH_CHECK_ENABLED=true
DB_HEALTH_CHECK_INTERVAL=30s

# Adaptive sizing
DB_POOL_ADAPTIVE_ENABLED=true
DB_POOL_MIN_FLOOR=5
DB_POOL_MAX_CEILING=50
```

### Monitoring

Pool metrics are available at `/metrics` with the `quester_db_pool_` prefix:

```promql
# Current utilization
quester_db_pool_utilization

# P95 connection acquisition latency
histogram_quantile(0.95, rate(quester_db_pool_wait_duration_seconds_bucket[5m]))

# Alert on pool exhaustion
quester_db_pool_utilization > 0.9
```

For detailed tuning guidance, see `server/docs/POOL_TUNING.md`.

## Monitoring

### Metrics (Prometheus)
- HTTP request duration
- Database query duration
- Cache hit/miss ratio
- Active connections
- Error rates
- Connection pool metrics (utilization, wait times, health status)

### Error Tracking (Sentry)
- Automatic error capture
- Performance monitoring
- Release tracking

## Deployment

### Docker
```bash
docker-compose up -d
```

### Manual
```bash
# Build
make build

# Run migrations
make migrate-up

# Start server
./build/quester-server
```

## Development

### Running Locally
```bash
# Install dependencies
go mod download

# Run migrations
make migrate-up

# Start server
make run
```

### Testing
```bash
# Run all tests
make test

# Run with coverage
make test-coverage
```

## Best Practices

### Code Organization
1. Keep controllers thin (HTTP handling only)
2. Put business logic in services
3. Use repositories for data access
4. Keep models simple (data structures)

### Error Handling
1. Always return errors, don't panic
2. Wrap errors with context
3. Log errors before returning
4. Return user-friendly messages

### Performance
1. Use connection pooling
2. Cache frequently accessed data
3. Use database indexes
4. Implement pagination

### Security
1. Validate all inputs
2. Use prepared statements
3. Implement rate limiting
4. Keep dependencies updated

## Troubleshooting

### Common Issues

**Database Connection Failed**
- Check PostgreSQL is running
- Verify connection string
- Check firewall rules

**Redis Connection Failed**
- Check Redis is running
- Verify Redis URL
- Check authentication

**JWT Validation Failed**
- Check JWT secret is set
- Verify token format
- Check token expiration

## Framework Reusability Patterns

### Overview

The framework layer (`internal/framework/`) provides reusable patterns that reduce boilerplate code across:
- **Repositories**: GenericRepository[T] for type-safe CRUD operations
- **Controllers**: Auth context extraction, pagination, request validation
- **Services**: BaseService with logging, caching, and transaction management
- **Responses**: Standardized error responses with request_id tracing

### GenericRepository[T]

```go
// Embed GenericRepository in your repository
type BadgeRepository struct {
    *repository.GenericRepository[*models.Badge]
    db *gorm.DB
}

// Delegate CRUD operations
func (r *BadgeRepository) Create(ctx context.Context, badge *models.Badge) error {
    return r.GenericRepository.Create(r.WithTenantContext(ctx, badge.TenantID), badge)
}
```

### Controller Helpers

```go
// Extract authenticated user context
auth, err := controller.GetAuthContext(c)
if err != nil {
    return responses.Unauthorized(c, err.Error())
}
// Use: auth.UserID, auth.TenantID, auth.Role

// Parse pagination parameters
pagination := controller.ParsePagination(c)
// Use: pagination.Page, pagination.PageSize, pagination.Offset
```

### BaseService

```go
// Embed BaseService in your service
type BadgeService struct {
    service.BaseService
    badgeRepo interfaces.BadgeRepository
}

func NewBadgeService(db *gorm.DB, logger *slog.Logger, cache *cache.PooledRedisClient, ...) *BadgeService {
    return &BadgeService{
        BaseService: service.NewBaseService(db, logger, cache, nil),
        // ... other dependencies
    }
}

// Use built-in methods
s.LogInfo("Badge awarded", "user_id", userID, "badge_id", badgeID)
s.GetCache().Set(ctx, key, value, ttl)
s.GetTxManager().RunInTransaction(ctx, func(tx *gorm.DB) error { ... })
```

### Standardized Responses

```go
// Error responses (all include request_id)
responses.BadRequest(c, "Invalid input")
responses.Unauthorized(c, "Token expired")
responses.Forbidden(c, "Insufficient permissions")
responses.NotFound(c, "Resource not found")
responses.InternalError(c, "Database error")

// Success responses
responses.Success(c, data)
responses.Created(c, resource)
```

### TenantModel Interface

Models with tenant isolation must implement:

```go
type TenantModel interface {
    GetID() uuid.UUID
    GetTenantID() uuid.UUID
    SetTenantID(tenantID uuid.UUID)
    TableName() string
}
```

For detailed usage examples, see `server/docs/FRAMEWORK_PATTERNS.md`.

## Social Gamification System

The social gamification system rewards users with XP for social interactions, tracks achievements, and manages daily challenges.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Social Gamification Flow                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User Action (Like, Comment, Post, Follow, Share)               │
│         ↓                                                        │
│  SocialService (Executes social action)                         │
│         ↓                                                        │
│  SocialGamificationService.AwardSocialXP()                      │
│         │                                                        │
│         ├─→ Check rate limits (100 XP actions/hour)             │
│         ├─→ Check duplicate prevention (user-content-action)    │
│         ├─→ Check self-interaction (no XP for own content)      │
│         ├─→ Award XP to SocialXPRepository                      │
│         ├─→ Update challenge progress (DailyChallengeRepository)│
│         ├─→ Check achievements (CheckSocialAchievements)        │
│         ├─→ Check content milestones (CheckContentMilestones)   │
│         └─→ Update global XP (UserRepository)                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Controllers                               │
│  SocialGamificationController                                   │
│  - GetUserSocialXP()                                            │
│  - GetDailyChallenges()                                         │
│  - GetMySocialAchievements()                                    │
│  - GetSocialLeaderboard()                                       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                         Services                                 │
│  SocialGamificationService                                      │
│  - AwardSocialXP(params)                                        │
│  - GetUserDailyChallenges(tenantID, userID)                    │
│  - CheckSocialAchievements(tenantID, userID, metric, value)    │
│  - CheckContentMilestones(tenantID, contentType, contentID,    │
│                            authorID, likesCount)               │
│                                                                  │
│  LeaderboardService                                             │
│  - RefreshSocialLeaderboard(tenantID)                          │
│  - GetCategoryLeaderboard(category, limit, period)             │
│                                                                  │
│  CronService                                                     │
│  - runLeaderboardSyncLoop() (every 5 minutes)                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                       Repositories                               │
│  SocialXPRepository                                             │
│  - Create(transaction)                                          │
│  - GetUserStats(tenantID, userID)                              │
│  - FindByUser(tenantID, userID, limit)                         │
│                                                                  │
│  DailyChallengeRepository                                       │
│  - GetOrCreateUserDailyChallenges(tenantID, userID)            │
│  - IncrementChallengeProgress(tenantID, userID, actionType)    │
│  - CheckPerfectDayBonus(tenantID, userID)                      │
│                                                                  │
│  ContentMilestoneRepository                                     │
│  - CheckAndAwardMilestones(tenantID, contentType, contentID,   │
│                             authorID, likesCount)               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                         Models                                   │
│  SocialXPTransaction     - Records XP awards                    │
│  UserSocialStats         - Aggregated user stats                │
│  DailyChallengeTemplate  - Admin-defined challenges             │
│  UserDailyChallenge      - User progress on challenges          │
│  ContentMilestone        - Post milestone achievements          │
│  PerfectDayBonus         - All-challenges-completed bonus       │
└─────────────────────────────────────────────────────────────────┘
```

### XP Award Flow

```go
// 1. Social action triggers XP award
params := &XPAwardParams{
    TenantID:   tenantID,
    UserID:     userID,
    ActionType: models.SocialActionLike,
    ContentID:  postID,
}

// 2. Service performs validations
result, err := socialGamifService.AwardSocialXP(ctx, params)

// 3. Result includes XP earned and any triggered events
type XPAwardResult struct {
    XPAwarded           int                    // XP amount earned
    TotalXP             int                    // New total social XP
    ChallengeUpdates    []ChallengeUpdate      // Challenge progress
    AchievementsUnlocked []UnlockedAchievement // New achievements
}
```

### Daily Challenges Flow

```
┌──────────────────────────────────────────────────────────────────┐
│ User views challenges → GetOrCreateUserDailyChallenges()         │
│                        │                                          │
│                        ├─→ Check if today's challenges exist      │
│                        ├─→ If not, create from active templates   │
│                        ├─→ Mark first_viewed_at (locks 24h timer) │
│                        └─→ Return challenges with progress        │
│                                                                   │
│ User performs action → IncrementChallengeProgress()              │
│                        │                                          │
│                        ├─→ Find matching uncompleted challenges   │
│                        ├─→ Increment current_count                │
│                        ├─→ Check if completed (award XP)          │
│                        └─→ Check Perfect Day bonus                │
└──────────────────────────────────────────────────────────────────┘
```

### Content Milestones

| Milestone | Threshold | XP Bonus | Badge |
|-----------|-----------|----------|-------|
| Trending | 10 likes | +25 XP | 🔥 |
| Viral | 50 likes | +100 XP | 📈 |
| Legendary | 100 likes | +250 XP | 👑 |

### Redis Caching

```
social:xp:{user_id}          # User's social XP stats (5 min TTL)
social:leaderboard:{period}  # Social leaderboard (5 min TTL)
social:challenges:{user_id}  # Today's challenges (1 hour TTL)
```

### Database Tables

| Table | Purpose |
|-------|---------|
| `social_xp_transactions` | Individual XP awards |
| `user_social_stats` | Aggregated stats per user |
| `daily_challenge_templates` | Admin-defined challenge types |
| `user_daily_challenges` | User progress per challenge per day |
| `content_milestones` | Awarded content milestones |
| `perfect_day_bonuses` | Perfect day bonus records |

### Cron Jobs

| Job | Interval | Purpose |
|-----|----------|---------|
| Social Leaderboard Sync | 5 minutes | Refresh Redis leaderboard from DB |

## Future Improvements

- [ ] Add GraphQL API
- [ ] Implement event sourcing
- [ ] Add message queue (RabbitMQ)
- [ ] Implement CQRS pattern
- [ ] Add API versioning
- [ ] Implement circuit breaker
- [ ] Add distributed tracing

---

**Last Updated**: 2025-01-22
**Version**: 1.0.0
