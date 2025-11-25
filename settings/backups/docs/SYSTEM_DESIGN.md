# Quester Platform - System Design

## 1. Architecture Overview

### High-Level Design
The Quester Platform is a multi-tenant, gamified learning ecosystem designed for high performance and scalability.

**Core Components:**
- **Client Layer**: React Native (Expo) mobile app and Web PWA. Offline-first architecture.
- **API Gateway**: Load balancer (Nginx/HAProxy) handling SSL and rate limiting.
- **Application Layer**: Go (Fiber) monolithic core with modular service design.
- **Data Layer**: PostgreSQL (Primary DB), Redis (Cache/PubSub), S3-compatible storage.

### Technology Stack
| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| **Backend** | Go | 1.24+ | Core logic, high concurrency |
| **Framework** | Fiber | v2.52+ | HTTP handling, middleware |
| **Database** | PostgreSQL | 15+ | Relational data, JSONB, Full-text search |
| **ORM** | GORM | v1.25+ | Data access abstraction |
| **Cache** | Redis | 7+ | Caching, Rate Limiting, Autocomplete |
| **Frontend** | React Native | 0.79+ | Cross-platform mobile UI |
| **Routing** | Expo Router | v6 | File-based navigation |
| **Styling** | NativeWind | v4 | Tailwind CSS for mobile |

## 2. Backend Design (`server/`)

### Clean Architecture
The backend follows a strict layered architecture to ensure separation of concerns:

1.  **Controllers** (`internal/controllers`): Handle HTTP requests, validate input, call services.
2.  **Services** (`internal/services`): Contain business logic, orchestrate data flow.
3.  **Repositories** (`internal/repositories`): Direct database access via GORM.
4.  **Models** (`internal/models`): Data structures and DB schema definitions.

### Multi-Tenancy
Multi-tenancy is enforced at the database level using a `tenant_id` column on all major tables.
- **Middleware**: `TenantMiddleware` extracts the tenant ID from the request (Header/JWT) and injects it into the context.
- **BaseModel**: All models embed `BaseModel` which includes `TenantID`.
- **Scopes**: GORM scopes automatically filter queries by the injected `TenantID`.

### Real-Time Architecture
- **WebSockets**: Used for chat, notifications, and live updates.
- **Redis Pub/Sub**: Handles message distribution across multiple server instances.
- **Connection Pooling**: Manages active WebSocket connections efficiently.

## 3. Frontend Design (`client/`)

### Mobile-First Architecture
- **Expo Managed Workflow**: Simplifies build and deployment.
- **Offline Support**: React Query + AsyncStorage for caching data and queuing offline mutations.
- **Component Library**: "React Native Reusables" (based on shadcn/ui) ensures consistency.

### Navigation
- **File-Based Routing**: `app/` directory structure mirrors the URL/Navigation path.
- **Tabs**: Main navigation via `app/(tabs)/`.
- **Auth Flow**: Separate `app/(auth)/` group for login/signup.

## 4. Database Schema

### Core Models
```go
type BaseModel struct {
    ID        uuid.UUID `gorm:"type:uuid;primary_key;default:uuid_generate_v4()"`
    TenantID  uuid.UUID `gorm:"type:uuid;not null;index"`
    CreatedAt time.Time
    UpdatedAt time.Time
    DeletedAt gorm.DeletedAt `gorm:"index"`
}

type User struct {
    BaseModel
    Email    string
    Password string
    Level    int
    XP       int
}

type Quest struct {
    BaseModel
    Title       string
    Description string
    Steps       []QuestStep
}
```

### Search Optimization
- **Full-Text Search**: Uses PostgreSQL `tsvector` columns (`search_vector`) with GIN indexes on `courses`, `properties`, and `classified_ads`.
- **Autocomplete**: Uses Redis Sorted Sets (`ZSET`) to store prefixes and popularity scores for sub-millisecond completion.

## 5. Security Design
- **Authentication**: JWT (RS256) with short-lived access tokens and rotating refresh tokens.
- **Rate Limiting**: Redis-based sliding window limiter (default 100 req/min).
- **Input Validation**: Strict validation middleware + HTML sanitization.
- **Compliance**: Designed for SOC 2 and GDPR (Audit logging, Data isolation).
