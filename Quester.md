# Quester Platform - AI Agent Documentation

> **Master Documentation for AI Agents & Developers**
> 
> This document provides comprehensive overview of the Quester platform architecture, structure, and development guidelines.
> 
> **📚 Related Documentation:**
> - **[Quester-AI-Rules.md](./Quester-AI-Rules.md)** - Comprehensive coding standards, rules, and anti-patterns
> - **[Quester-AI-Workflows.md](./Quester-AI-Workflows.md)** - Step-by-step development workflows for common tasks
> 
> **Quick Start for AI Agents:**
> 1. Read this document first for project overview and architecture
> 2. Reference **Quester-AI-Rules.md** for coding standards when implementing features
> 3. Follow **Quester-AI-Workflows.md** for structured development workflows

---

## 1. Project Overview

**Quester** is an enterprise-grade, multi-tenant gamified learning and community platform. It integrates comprehensive quest management, LMS (Learning Management System), social networking, real-time video streaming, property/classified listings, payment processing, and advanced analytics.

### 1.1 Core Features

**Authentication & Authorization:**
- JWT-based authentication with refresh tokens
- 2FA (TOTP) support with encrypted secrets
- Role-based access control (Admin, Moderator, Instructor, Player, Partner)
- OAuth integration (Google, Facebook, Apple)
- Token blacklisting via Redis
- Session management with configurable expiry

**Quest Management (Primary Feature):**
- Quest creation, enrollment, progress tracking
- Quest types: Standard, Boss Quest (high difficulty), Daily Quest (recurring)
- Quest dependencies and prerequisites
- Multi-step quest workflows with validation
- Quest rewards (XP, coins, badges, items)
- Quest categories and difficulty levels
- Quest search and filtering
- Quest analytics and completion tracking

**Gamification System:**
- XP and leveling system with tier progression
- Badge system with 10+ badge types (Achievement, Skill, Milestone, Event, Social, Challenge, Collection, Special, Seasonal, Legendary)
- Leaderboards (Global, Monthly, Weekly, Quest-specific, Category-specific)
- Login streaks with bonus rewards
- User tiers: Bronze, Silver, Gold, Platinum, Diamond
- Achievement tracking and unlocking
- Reward distribution engine

**Learning Management System (LMS):**
- Course creation and management
- Module and lesson structure
- Content types: Video, Text, Quiz, Assignment, Interactive
- Progress tracking and completion certificates
- Assessment engine with multiple question types
- Certificate generation with template support
- Course enrollment and access control
- Instructor tools and analytics

**Social Networking:**
- User posts with text, images, and videos
- Comments and nested replies
- Like/reaction system
- Follow/unfollow system
- User feed with personalized content
- Activity tracking and notifications
- Content moderation and reporting
- Trending topics and hashtags

**Video Streaming:**
- Live streaming support (RTMP ingestion, HLS playback)
- Video on demand (VOD)
- Stream recording and archiving
- Chat integration during live streams
- Stream analytics (viewers, duration, engagement)
- Multi-quality streaming (adaptive bitrate)
- Stream scheduling and notifications

**Property & Classifieds:**
- Property listings with geospatial search (PostGIS)
- Property types: Residential, Commercial, Land, Rental
- Image galleries and virtual tours
- Price tracking and market analytics
- Classified ads for products and services
- Category-based organization
- Search and filtering with location-based results
- Contact management and inquiries

**Payment Processing:**
- Multi-currency support
- Payment gateways: Stripe, Razorpay
- Transaction history and receipts
- Payout management for instructors/creators
- Subscription management
- Refund processing
- Payment analytics and reporting
- Wallet system with balance tracking

**Analytics & Reporting:**
- User analytics (engagement, activity, growth)
- Quest completion analytics
- Revenue and transaction analytics
- Platform health metrics
- Custom report generation
- Real-time dashboards with Grafana
- Prometheus metrics collection
- Sentry error tracking

**Messaging System:**
- Direct messaging (1-on-1)
- Group conversations
- Real-time message delivery via WebSocket
- Message history and search
- Read receipts and typing indicators
- File attachments (images, documents)
- Message notifications (push, email, in-app)

**Notification System:**
- Multi-channel notifications (Push, Email, In-App, SMS)
- Notification preferences per user
- Event-driven notification triggers
- Notification templates
- Batch notification processing
- Notification history and read status

### 1.2 Tech Stack

| Layer | Technology | Version | Key Libraries |
|-------|------------|---------|---------------|
| **Backend** | Go | 1.24.0 | Fiber v2.52+, GORM v1.30, JWT v5, Godotenv, Prometheus, Sentry |
| **Frontend** | React Native | 0.81.5 | Expo 54, Expo Router v6, NativeWind v4, React 19.1 |
| **Database** | PostgreSQL | 15+ | `pgx` driver, PostGIS, GORM Auto-migrate |
| **Cache** | Redis | 7+ | `go-redis/v9` |
| **Payments** | Stripe & Razorpay | - | `stripe-go/v76`, `razorpay-go` |
| **Cloud Storage** | AWS S3 & Firebase | - | `aws-sdk-go-v2`, Firebase Admin SDK |
| **Streaming** | RTMP/HLS | - | nginx-rtmp, FFmpeg, joy4 |
| **Infra** | Docker | - | Docker Compose, Multi-stage builds |

---

## 2. AI Agent Guidelines

### 2.0 Documentation Hierarchy

**For AI Agents**: This document serves as the **overview and reference hub**. For detailed implementation guidelines:

1. **Start Here** - Read this document for:
   - Project overview and feature inventory
   - Architecture patterns and structure
   - Directory maps and file organization
   - Quick reference for common patterns

2. **[Quester-AI-Rules.md](./Quester-AI-Rules.md)** - Reference for:
   - Comprehensive coding standards (Go & TypeScript)
   - Critical rules and anti-patterns
   - Security and performance guidelines
   - Testing strategies
   - Code generation templates

3. **[Quester-AI-Workflows.md](./Quester-AI-Workflows.md)** - Follow for:
   - Step-by-step development workflows
   - End-to-end feature implementation
   - Bug fixing procedures
   - Refactoring strategies
   - Deployment workflows

### 2.1 Core Principles for AI Agents

**CRITICAL RULES - NEVER VIOLATE:**

1. **Multi-Tenancy is MANDATORY**: Every database query MUST filter by `TenantID`. No exceptions.
2. **Security First**: Never log sensitive data. Always validate inputs. Use parameterized queries.
3. **Type Safety**: Use explicit types everywhere. No `any` in TypeScript. No untyped parameters in Go.
4. **Error Handling**: Always return errors, never panic (Go). Always try-catch async operations (TypeScript).
5. **Context Propagation**: Pass `context.Context` through all Go functions.
6. **Consistency**: Follow existing patterns. Don't introduce new patterns without justification.

**Workflow for AI Agents:**

1. **Analyze** - Understand the user's request fully
2. **Research** - Read related code files to understand existing patterns
3. **Plan** - Create a todo list using `manage_todo_list` for multi-step tasks
4. **Implement** - Follow patterns from Quester-AI-Workflows.md
5. **Verify** - Check compliance with Quester-AI-Rules.md
6. **Test** - Verify compilation and basic functionality

**When Generating Code:**

- **Read First**: Always read related files to understand patterns before generating code
- **Follow Rules**: Refer to Quester-AI-Rules.md for coding standards
- **Use Workflows**: Follow Quester-AI-Workflows.md for structured implementation
- **Preserve Style**: Match indentation, spacing, and naming conventions
- **Complete Implementation**: Don't leave TODOs unless explicitly requested

---

## 3. Architecture & Patterns

### 3.1 Server Architecture (Go/Fiber)

The backend follows **Clean Architecture** principles with strict separation of concerns. Dependencies flow inwards (Controller → Service → Repository → Database).

- **`cmd/server/`**: Entry point. Initializes app with graceful shutdown.
- **`internal/app/`**: Application initialization, DI container. Wires Database → Cache → Repositories → Services → Controllers → Routes.
- **`internal/controllers/`**: HTTP Handlers. Parse requests, validate inputs, call Services, return JSON responses. **No business logic.**
- **`internal/services/`**: Business Logic Layer. Validation, calculations, orchestration, gamification, notifications.
- **`internal/repositories/`**: Data Access Layer. GORM queries, database operations. **No business logic.**
- **`internal/models/`**: GORM models. Database schema definitions with validation, hooks, and relationships.
- **`internal/routes/`**: Route registration. Maps HTTP endpoints to Controllers with middleware.
- **`internal/middleware/`**: HTTP middleware (JWT auth, rate limiting, tenant isolation, security headers, metrics).
- **`internal/framework/`**: Core framework utilities (auth, cache, config, database, storage, metrics, websocket).

**Key Rules:**

- **Multi-tenancy**: All models include `TenantID uuid.UUID`. All queries MUST filter by `TenantID`.
- **Error Handling**: Use standardized `ApiError` responses via `framework/responses`.
- **Context**: Pass `context.Context` through all layers for cancellation and timeouts.
- **Authentication**: JWT tokens with refresh tokens. Blacklist support via Redis.
- **Rate Limiting**: Per-IP rate limiting on all endpoints (configurable per route).
- **Monitoring**: Prometheus metrics for all critical operations. Sentry for error tracking.

### 3.2 Client Architecture (React Native/Expo)

The frontend uses **Expo Router** (file-based routing) and **NativeWind** (Tailwind CSS for React Native).

- **`app/`**: File-based routes. Each `.tsx` file maps to a screen/page.
  - `_layout.tsx`: Root layout with providers (Auth, Theme, Navigation).
  - `index.tsx`: Landing/Home screen.
  - `[feature].tsx`: Feature screens (dashboard, quests, social, etc.).
- **`components/`**: Reusable UI components organized by category.
  - `ui/`: Primitive components (Button, Card, Input, Badge, Dialog, etc.) using `@rn-primitives`.
  - `layout/`: Structural components (MainLayout, AppHeader, Navigation, Sidebar).
  - `pages/`: Feature-specific page components (dashboard, quests, social, analytics, etc.).
  - `shared/`: Shared components (ThemeToggle, UserMenu, UserStatsCard).
  - `auth/`: Authentication UI (AuthModal, Login/Signup forms).
- **`core/`**: Business logic, state management, and utilities.
  - `auth/`: AuthContext, AuthProvider, useAuth hook.
  - `api/`: API client configuration and service modules.
  - `hooks/`: Custom React hooks (useResponsive, useToggle, useDebounce, etc.).
  - `utils/`: Helper functions (date, validation, error handling, storage).
  - `config/`: App configuration (env, theme, app settings).
  - `types/`: TypeScript type definitions.

**Key Rules:**

- **Styling**: Use `className` with Tailwind classes via NativeWind. Avoid `StyleSheet.create` unless necessary.
- **Navigation**: Use `useRouter()` from `expo-router`. Use `router.push()`, `router.replace()` for navigation.
- **Authentication**: Protected routes check `isAuthenticated` from `useAuth()`. Redirect to `/` if unauthenticated.
- **State Management**: Use React Context for global state (Auth, Theme). Use local state for component-specific data.
- **API Calls**: Use service modules in `core/api/services/`. Handle errors consistently.
- **Types**: Explicit typing for all props, state, and API responses. Avoid `any`.

---

## 4. Directory Structure Map

**For AI Agents**: Use this map to locate files when generating or modifying code. Always verify file paths before making changes.

### Server (`/server`)

```plaintext
server/
├── cmd/
│   ├── server/main.go           # Entry point with graceful shutdown
│   ├── migrate/                 # Database migration tool
│   ├── encrypt-2fa-secrets/     # 2FA encryption utility
│   └── test/                    # Test utilities
├── internal/
│   ├── app/app.go               # App initialization, DI container
│   ├── config/                  # Feature flags, validation
│   ├── controllers/             # HTTP Handlers (30+ controllers)
│   │   ├── auth_controller.go
│   │   ├── quest_controller.go
│   │   ├── social_controller.go
│   │   ├── video_streaming_controller.go
│   │   ├── property_controller.go
│   │   ├── transaction_controller.go
│   │   └── ... (analytics, badges, certificates, etc.)
│   ├── services/                # Business Logic (50+ services)
│   │   ├── auth_service.go
│   │   ├── quest_service.go
│   │   ├── gamification_service.go
│   │   ├── video_stream_service.go
│   │   ├── notification_service.go
│   │   ├── payment/transaction_service.go
│   │   └── ... (KMS, OCR, OpenAI, moderation, etc.)
│   ├── repositories/            # Data Access (25+ repositories)
│   │   ├── user_repository.go
│   │   ├── quest_repository.go
│   │   ├── transaction_repository.go
│   │   └── ... (base_repository with tenant scoping)
│   ├── models/                  # GORM Models (40+ models)
│   │   ├── user.go              # With roles, tiers, gamification
│   │   ├── quest.go
│   │   ├── property.go
│   │   ├── transaction.go
│   │   ├── stream.go
│   │   └── ... (all database entities)
│   ├── routes/routes.go         # Route registration (all endpoints)
│   ├── middleware/              # HTTP middleware
│   │   ├── jwt_middleware.go
│   │   ├── rate_limiter.go
│   │   ├── tenant_middleware.go
│   │   ├── security_headers.go
│   │   └── metrics.go
│   ├── framework/               # Core utilities (16 packages)
│   │   ├── auth/                # JWT, password hashing, 2FA
│   │   ├── cache/               # Redis wrapper
│   │   ├── config/              # Config loading
│   │   ├── database/            # GORM setup, connection pooling
│   │   ├── storage/             # S3, Firebase, local storage
│   │   ├── metrics/             # Prometheus metrics
│   │   ├── payment/             # Stripe, Razorpay integration
│   │   ├── push/                # FCM push notifications
│   │   ├── streaming/           # Video streaming utilities
│   │   ├── websocket/           # WebSocket server
│   │   └── ... (sentry, responses, validators)
│   ├── migrations/              # GORM AutoMigrate logic
│   ├── observability/           # Prometheus metrics definitions
│   ├── utils/                   # Helper functions
│   └── websocket/server.go      # WebSocket implementation
├── migrations/                  # SQL migrations (17+ migrations)
│   ├── 001_enable_postgis.up.sql
│   ├── 002_create_badges_tables.up.sql
│   ├── 009_create_property_tables.up.sql
│   └── ... (all database schemas)
├── docs/
│   ├── ARCHITECTURE.md          # Architecture documentation
│   └── API.md                   # API endpoints documentation
└── go.mod                       # Dependencies (Go 1.24.0)
```

### Client (`/client`)

```plaintext
client/
├── app/                         # Expo Router pages (file-based routing)
│   ├── _layout.tsx              # Root layout with providers
│   ├── index.tsx                # Landing/Home screen
│   ├── dashboard.tsx            # Dashboard screen
│   ├── quests.tsx               # Quests screen
│   ├── social.tsx               # Social feed screen
│   ├── messages.tsx             # Messages screen
│   ├── properties.tsx           # Property listings screen
│   ├── classifieds.tsx          # Classified ads screen
│   ├── streams.tsx              # Video streams screen
│   ├── transactions.tsx         # Transactions screen
│   ├── analytics.tsx            # Analytics screen
│   ├── certificates.tsx         # Certificates screen
│   ├── profile.tsx              # Profile screen
│   ├── settings.tsx             # Settings screen
│   ├── admin.tsx                # Admin dashboard screen
│   └── +not-found.tsx           # 404 screen
├── components/
│   ├── ui/                      # Primitive UI components (35+ components)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── dialog.tsx
│   │   ├── badge.tsx
│   │   ├── avatar.tsx
│   │   └── ... (all @rn-primitives wrappers)
│   ├── layout/                  # Layout components
│   │   ├── MainLayout.tsx
│   │   ├── header/AppHeader.tsx
│   │   ├── navigation/          # Navigation components
│   │   └── sidebar/             # Sidebar components
│   ├── pages/                   # Feature-specific page components
│   │   ├── dashboard/           # Dashboard components
│   │   ├── quests/              # Quest components
│   │   ├── social/              # Social components
│   │   ├── messages/            # Messages components
│   │   ├── properties/          # Property components
│   │   ├── analytics/           # Analytics components
│   │   └── ... (all feature pages)
│   ├── shared/                  # Shared components
│   │   ├── ThemeToggle.tsx
│   │   ├── user-menu.tsx
│   │   └── user-stats-card.tsx
│   └── auth/                    # Auth components
│       ├── AuthModal.tsx
│       └── types.ts
├── core/                        # Business logic & utilities
│   ├── auth/
│   │   ├── AuthContext.tsx      # Auth state management
│   │   └── index.ts
│   ├── api/
│   │   ├── client.ts            # API client with error handling
│   │   └── services/            # API service modules
│   │       ├── auth.service.ts
│   │       ├── quest.service.ts
│   │       ├── social.service.ts
│   │       ├── properties.service.ts
│   │       ├── transactions.service.ts
│   │       └── ... (all API services)
│   ├── hooks/                   # Custom React hooks
│   │   └── index.ts             # useResponsive, useToggle, etc.
│   ├── utils/                   # Helper functions
│   │   ├── common.ts
│   │   ├── date.ts
│   │   ├── error.ts
│   │   ├── validation.ts
│   │   ├── storage.ts
│   │   └── responsive.ts
│   ├── config/                  # Configuration
│   │   ├── env.ts               # Environment variables
│   │   ├── app.config.ts        # App configuration
│   │   └── theme.config.ts      # Theme configuration
│   ├── types/                   # TypeScript types
│   │   ├── api.ts
│   │   ├── components.ts
│   │   ├── quest.ts
│   │   └── index.ts
│   └── routes/                  # Route definitions
│       ├── index.ts
│       └── types.ts
├── assets/images/               # Static assets
├── templates/                   # Component templates
│   ├── PageComponent.template.tsx
│   └── UIComponent.template.tsx
├── package.json                 # Dependencies (React Native 0.81.5, Expo 54)
├── tsconfig.json                # TypeScript configuration
├── tailwind.config.js           # Tailwind CSS configuration
├── nativewind-env.d.ts          # NativeWind types
└── components.json              # shadcn/ui configuration
```

---

## 5. Development Workflows

### 5.0 Workflow Overview

**For AI Agents**: This section provides a quick reference for common development workflows. For detailed, step-by-step workflows with code examples and verification checklists, refer to **[Quester-AI-Workflows.md](./Quester-AI-Workflows.md)**.

**Available Workflows** (see Quester-AI-Workflows.md for details):

1. **New Feature (End-to-End)** - Complete feature implementation (Model → Repository → Service → Controller → Routes → Client)
2. **Modify Existing Feature** - Update existing features with minimal disruption
3. **Add New Endpoint** - Extend existing features with new API endpoints
4. **Bug Fix** - Systematic approach to fixing bugs
5. **Refactoring** - Improve code structure without changing behavior
6. **New UI Component** - Create reusable React Native components
7. **Database Migration** - Handle schema changes safely
8. **Third-Party API Integration** - Integrate external services
9. **Testing** - Write and run tests
10. **Deployment** - Prepare and deploy code

### 5.1 Quick Workflow Selection Guide

**Choose your workflow based on the task:**

| Task Type | Workflow to Use | Key Considerations |
|-----------|----------------|-------------------|
| Brand new feature (e.g., new module) | New Feature (End-to-End) | Requires full stack implementation |
| Enhance existing feature | Modify Existing Feature | Update specific layers only |
| Add REST endpoint to existing controller | Add New Endpoint | Minimal changes, focused implementation |
| Fix reported bug | Bug Fix | Root cause analysis first |
| Improve code quality/structure | Refactoring | Preserve functionality, no behavior changes |
| Create reusable component | New UI Component | Follow component patterns |
| Change database schema | Database Migration | Handle up/down migrations |
| Connect external service | Third-Party API Integration | Error handling, retries, security |
| Add unit/integration tests | Testing | Cover critical paths |
| Release to production | Deployment | Run checklist, monitor metrics |

### 5.2 Essential Workflow Steps

**Common to All Workflows:**

1. **Research Phase**
   - Read related code files to understand existing patterns
   - Check similar implementations for consistency
   - Identify dependencies and potential impacts

2. **Planning Phase**
   - Create todo list with `manage_todo_list` for multi-step tasks
   - Break down complex tasks into smaller, manageable steps
   - Identify files that need to be created/modified

3. **Implementation Phase**
   - Follow layer-by-layer implementation (Database → Repository → Service → Controller → Client)
   - Maintain multi-tenancy throughout (TenantID filtering)
   - Apply security best practices
   - Handle errors consistently

4. **Verification Phase**
   - Check for compilation errors with `get_errors`
   - Verify type safety (no `any` types)
   - Confirm error handling is in place
   - Test basic functionality

5. **Documentation Phase**
   - Add comments for complex logic
   - Update relevant documentation
   - Add examples if creating new patterns

### 5.3 Implementation Priorities

**Priority Order for Feature Implementation:**

1. **Security** - Authentication, authorization, input validation, TenantID filtering
2. **Functionality** - Core business logic, data persistence, API endpoints
3. **Error Handling** - Graceful failures, user-friendly error messages
4. **User Experience** - Loading states, error states, responsive design
5. **Performance** - Database indexes, caching, query optimization
6. **Testing** - Unit tests, integration tests
7. **Documentation** - Code comments, API documentation

### 5.4 Development Checklist

**Before Starting:**

- [ ] Understand the requirement clearly
- [ ] Read related code files for patterns
- [ ] Plan the implementation approach
- [ ] Create todo list for multi-step tasks

**During Implementation:**

- [ ] Follow existing patterns and conventions
- [ ] Include TenantID in all database queries
- [ ] Use explicit types (no `any`)
- [ ] Handle all errors properly
- [ ] Add validation for user inputs
- [ ] Use context.Context for Go functions

**After Implementation:**

- [ ] Check for compilation errors
- [ ] Verify type safety
- [ ] Test basic functionality
- [ ] Review security implications
- [ ] Update documentation if needed

**For Complete Workflow Details:**
See **[Quester-AI-Workflows.md](./Quester-AI-Workflows.md)** for comprehensive, step-by-step instructions with code examples for each workflow type.

---

## 6. Code Generation Patterns

### 6.0 Pattern Overview

**For AI Agents**: This section provides quick reference code patterns. For comprehensive coding standards, security guidelines, testing strategies, and anti-patterns, refer to **[Quester-AI-Rules.md](./Quester-AI-Rules.md)**.

**Pattern Categories:**

- **Server Patterns** (Go): Model, Repository, Service, Controller
- **Client Patterns** (TypeScript): Types, API Services, Page Components, UI Components
- **Common Patterns**: Error handling, validation, authentication

**For Detailed Standards:**

- **Go Coding Standards** → Quester-AI-Rules.md Section 3
- **TypeScript Standards** → Quester-AI-Rules.md Section 4
- **Testing Patterns** → Quester-AI-Rules.md Section 5
- **Security Patterns** → Quester-AI-Rules.md Section 6
- **Performance Patterns** → Quester-AI-Rules.md Section 7
- **Anti-Patterns** → Quester-AI-Rules.md Section 8

### 6.1 Server Code Patterns (Go)

#### Model Generation Pattern

```go
// Pattern: internal/models/[feature].go
package models

import (
    "time"
    "github.com/google/uuid"
    "gorm.io/gorm"
)

// [Feature] represents [description]
type [Feature] struct {
    // Primary Key
    ID uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
    
    // Multi-Tenant (MANDATORY)
    TenantID uuid.UUID `gorm:"type:uuid;not null;index:idx_[feature]_tenant" json:"tenant_id"`
    
    // Fields
    Name string `gorm:"type:varchar(255);not null" json:"name" validate:"required,min=3,max=255"`
    
    // Timestamps
    CreatedAt time.Time      `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`
    UpdatedAt time.Time      `gorm:"not null;default:CURRENT_TIMESTAMP" json:"updated_at"`
    DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func ([Feature]) TableName() string {
    return "[features]"
}

func (f *[Feature]) BeforeCreate(tx *gorm.DB) error {
    if f.ID == uuid.Nil {
        f.ID = uuid.New()
    }
    return nil
}
```

#### Repository Generation Pattern

```go
// Pattern: internal/repositories/[feature]_repository.go
package repositories

import (
    "context"
    "github.com/google/uuid"
    "github.com/keshablive/quester/internal/models"
    "gorm.io/gorm"
)

type [Feature]Repository interface {
    Create(ctx context.Context, tenantID uuid.UUID, feature *models.[Feature]) error
    FindByID(ctx context.Context, tenantID, id uuid.UUID) (*models.[Feature], error)
    Update(ctx context.Context, tenantID uuid.UUID, feature *models.[Feature]) error
    Delete(ctx context.Context, tenantID, id uuid.UUID) error
    List(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]*models.[Feature], error)
}

type [feature]Repository struct {
    db *gorm.DB
}

func New[Feature]Repository(db *gorm.DB) [Feature]Repository {
    return &[feature]Repository{db: db}
}

// ALWAYS filter by TenantID
func (r *[feature]Repository) FindByID(ctx context.Context, tenantID, id uuid.UUID) (*models.[Feature], error) {
    var feature models.[Feature]
    err := r.db.WithContext(ctx).
        Where("tenant_id = ? AND id = ?", tenantID, id).
        First(&feature).Error
    if err != nil {
        return nil, err
    }
    return &feature, nil
}
```

#### Service Generation Pattern

```go
// Pattern: internal/services/[feature]_service.go
package services

import (
    "context"
    "github.com/google/uuid"
    "github.com/keshablive/quester/internal/models"
    "github.com/keshablive/quester/internal/repositories"
)

type [Feature]Service struct {
    repo repositories.[Feature]Repository
    // Add other dependencies
}

func New[Feature]Service(repo repositories.[Feature]Repository) *[Feature]Service {
    return &[Feature]Service{repo: repo}
}

func (s *[Feature]Service) Create(ctx context.Context, tenantID uuid.UUID, input *CreateInput) (*models.[Feature], error) {
    // 1. Validate input
    if err := validateInput(input); err != nil {
        return nil, err
    }
    
    // 2. Business logic
    feature := &models.[Feature]{
        TenantID: tenantID,
        Name:     input.Name,
    }
    
    // 3. Call repository
    if err := s.repo.Create(ctx, tenantID, feature); err != nil {
        return nil, err
    }
    
    return feature, nil
}
```

#### Controller Generation Pattern

```go
// Pattern: internal/controllers/[feature]_controller.go
package controllers

import (
    "github.com/gofiber/fiber/v2"
    "github.com/google/uuid"
    "github.com/keshablive/quester/internal/services"
    "github.com/keshablive/quester/internal/framework/responses"
)

type [Feature]Controller struct {
    service *services.[Feature]Service
}

func New[Feature]Controller(service *services.[Feature]Service) *[Feature]Controller {
    return &[Feature]Controller{service: service}
}

func (c *[Feature]Controller) Create(ctx *fiber.Ctx) error {
    // 1. Extract TenantID from JWT claims (set by middleware)
    tenantID, err := uuid.Parse(ctx.Locals("tenant_id").(string))
    if err != nil {
        return responses.BadRequest(ctx, "Invalid tenant ID")
    }
    
    // 2. Parse request body
    var input CreateInput
    if err := ctx.BodyParser(&input); err != nil {
        return responses.BadRequest(ctx, "Invalid request body")
    }
    
    // 3. Call service
    feature, err := c.service.Create(ctx.Context(), tenantID, &input)
    if err != nil {
        return responses.InternalError(ctx, err.Error())
    }
    
    // 4. Return success response
    return responses.Created(ctx, feature)
}
```

### 6.2 Client Code Patterns (TypeScript/React Native)

#### Type Definition Pattern

```typescript
// Pattern: client/core/types/[feature].ts
export interface [Feature] {
  id: string;
  tenant_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Create[Feature]Input {
  name: string;
}

export interface Update[Feature]Input {
  name?: string;
}
```

#### API Service Pattern

```typescript
// Pattern: client/core/api/services/[feature].service.ts
import { apiClient } from '../client';
import type { [Feature], Create[Feature]Input } from '@/core/types/[feature]';

export const [feature]Service = {
  async create(input: Create[Feature]Input): Promise<[Feature]> {
    const response = await apiClient.post<[Feature]>('/api/v1/[features]', input);
    return response.data;
  },

  async getById(id: string): Promise<[Feature]> {
    const response = await apiClient.get<[Feature]>(`/api/v1/[features]/${id}`);
    return response.data;
  },

  async list(page: number = 1, limit: number = 20): Promise<[Feature][]> {
    const response = await apiClient.get<[Feature][]>('/api/v1/[features]', {
      params: { page, limit },
    });
    return response.data;
  },
};
```

#### Page Component Pattern

```typescript
// Pattern: client/app/[feature].tsx
import { View } from 'react-native';
import { useState, useEffect } from 'react';
import { [feature]Service } from '@/core/api/services/[feature].service';
import { Card, Text } from '@/components/ui';
import type { [Feature] } from '@/core/types/[feature]';

export default function [Feature]Page() {
  const [items, setItems] = useState<[Feature][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      setLoading(true);
      const data = await [feature]Service.list();
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Text>Loading...</Text>;
  if (error) return <Text>Error: {error}</Text>;

  return (
    <View className="flex-1 p-4">
      {items.map((item) => (
        <Card key={item.id} className="mb-4">
          <Text>{item.name}</Text>
        </Card>
      ))}
    </View>
  );
}
```

### 6.3 Coding Standards Summary

**For Complete Coding Standards:**
Refer to **[Quester-AI-Rules.md](./Quester-AI-Rules.md)** for comprehensive guidelines on:

- Go coding standards (naming, interfaces, error handling, validation)
- TypeScript/React Native standards (types, components, state management)
- Testing strategies and patterns
- Security best practices
- Performance optimization
- Common anti-patterns to avoid

**Key Standards Quick Reference:**

**Go (Server):**

- PascalCase for exported, camelCase for unexported
- Pass `context.Context` as first parameter
- Return errors, never panic
- Use GORM transactions for multi-table operations
- Add GoDoc comments for exported functions

**TypeScript (Client):**

- Explicit types everywhere, avoid `any`
- Use `async/await` for async operations
- Functional components with hooks only
- Tailwind classes via `className` prop
- Use `@/` alias for absolute imports

---

## 7. Current Implementation Status

### 7.1 Server Features (Fully Implemented)

#### Authentication & Authorization

- JWT authentication with access + refresh tokens
- Token blacklist via Redis (logout, logout-all)
- 2FA (TOTP) with QR code generation
- Trusted device management
- Role-based access control (Admin, Moderator, Instructor, Player, Partner)
- Multi-tenant isolation (all queries scoped by TenantID)

#### Core Features

- **Quests**: CRUD, progress tracking, gamification integration
- **LMS**: Courses, lessons, enrollments, assessments
- **Gamification**: XP, levels, tiers, badges, achievements, leaderboards
- **Certificates**: Auto-generation (PDF), verification, course completion tracking
- **Social**: Posts, comments, likes, follows, activity feed
- **Messaging**: Real-time messaging, WebSocket support
- **Properties**: Geo-spatial search (PostGIS), OCR document verification, AI validation
- **Classified Ads**: Listing management, search, popularity tracking
- **Video Streaming**: RTMP ingest, HLS playback, DVR, ABR (Adaptive Bitrate), recordings
- **Transactions**: Escrow payments (Stripe, Razorpay), dispute resolution, webhook handling
- **Analytics**: User analytics, course analytics, engagement metrics, dashboard metrics
- **Notifications**: Push notifications (FCM), in-app notifications, batching, notification settings
- **Moderation**: Content moderation, user reports, AI moderation service

#### Infrastructure & Observability

- Prometheus metrics (database, HTTP, custom metrics)
- Sentry error tracking
- Rate limiting (per-IP, per-endpoint)
- Security headers (HSTS, CSP)
- CORS configuration
- WebSocket server for real-time features
- Graceful shutdown
- Database connection pooling
- Redis caching
- S3 & Firebase storage integration

#### Admin Features

- KMS (Key Management Service) for encryption
- User management
- Content moderation dashboard
- Analytics dashboard
- System metrics

### 7.2 Client Features (Fully Implemented)

#### Core Pages

- Landing/Home page with authentication modal
- Dashboard with stats, quick actions, recent activity
- Quests listing and detail pages
- Social feed with post creation
- Messages with real-time updates
- Profile management
- Settings
- Properties listings
- Classified ads listings
- Video streams
- Transactions history
- Analytics dashboard
- Certificates gallery
- Admin dashboard

#### UI Components

- 35+ primitive UI components (Button, Card, Dialog, Input, Badge, Avatar, etc.)
- Responsive layouts (MainLayout, AppHeader, Navigation)
- Feature-specific page components (organized by domain)
- Auth modal with login/signup
- Theme toggle (light/dark mode)
- User menu and stats cards

#### State & API Integration

- AuthContext with JWT token management
- Protected route handling
- API client with error handling
- Service modules for all features (auth, quests, social, properties, transactions, etc.)
- TypeScript types for all API responses
- Custom hooks (useResponsive, useToggle, useDebounce, etc.)

#### Infrastructure

- Expo Router for file-based routing
- NativeWind for Tailwind CSS styling
- React Navigation integration
- AsyncStorage for local data
- Environment-based configuration

### 7.3 Database Schema (PostgreSQL)

#### Migration Files Implemented (17+)

The database schema is managed through SQL migrations and GORM AutoMigrate:

- PostGIS extension for geo-spatial features
- Users with roles, tiers, gamification fields
- Quests, quest steps, quest progress
- Courses, lessons, enrollments, assessments
- Badges, achievements, leaderboards
- Posts, comments, likes, follows, activities
- Messages, notifications
- Properties (with PostGIS geometry), classified ads
- Video streams, recordings
- Transactions, marketplace listings
- Certificates
- Analytics tables (user, course, engagement, dashboard)
- Reports, moderation
- Full-text search indexes

#### Database Models (40+ GORM Models)

Key models include: User, Quest, QuestStep, QuestProgress, Course, Lesson, Enrollment, Assessment, Badge, Achievement, Leaderboard, Post, Comment, Like, Follow, Activity, Message, Notification, Property, ClassifiedAd, VideoStream, Transaction, Certificate, and various analytics models.

### 7.4 Infrastructure & DevOps

#### Docker Configuration

- Docker Compose setup (PostgreSQL, Redis, nginx-rtmp)
- Multi-stage Docker builds for optimized images
- Volume management for persistent data
- Network isolation

#### Configuration Management

- Environment-based configuration (.env files)
- Separate configs for development, staging, production
- Feature flags support
- Secret management

#### Monitoring & Observability

- Grafana dashboards for monitoring
- Prometheus metrics collection
- Sentry error tracking
- Structured logging

### 7.5 Known Limitations & Configuration Requirements

#### Required Configuration

- Payment gateway credentials (Razorpay, Stripe) for payment features
- Database credentials (PostgreSQL connection string)
- Redis credentials for caching and session management
- JWT secrets for authentication

#### Optional Configuration

- S3 credentials (local storage fallback available)
- Firebase credentials (for FCM push notifications)
- OpenAI API key (for AI features like property document verification)
- Sentry DSN (for error tracking)
- Prometheus/Grafana (for advanced monitoring)

#### Known Issues & TODOs

- Some advanced analytics features may need further implementation
- Mobile app builds (iOS/Android) need testing and configuration
- Performance optimization for high-traffic scenarios
- Comprehensive test coverage needs improvement

---

## 8. AI Agent Decision Trees

### 8.1 When to Create New Files vs Modify Existing

**Create New File When:**

- Adding a completely new feature/domain model
- Creating a new API endpoint group (new controller)
- Adding a new page/screen in the client
- Creating a new reusable component
- Adding a new service with distinct responsibilities

**Modify Existing File When:**

- Adding methods to existing service/repository
- Adding fields to existing model
- Adding new route to existing controller
- Updating validation rules
- Fixing bugs in existing code
- Enhancing existing functionality

### 8.2 Troubleshooting Decision Tree

**Compilation Error:**

1. Use `get_errors` tool to see exact error
2. Check import statements and package names
3. Verify type definitions match usage
4. Check for missing dependencies in go.mod/package.json

**Runtime Error:**

1. Check logs for stack trace
2. Verify database connection and migrations
3. Check environment variables are set
4. Verify Redis connection if using cache
5. Check authentication middleware if 401 errors

**Database Error:**

1. Verify TenantID is included in query
2. Check model definitions match database schema
3. Verify foreign key relationships
4. Check for migration issues

**API Integration Error:**

1. Verify endpoint URL matches route definition
2. Check request/response types match between client and server
3. Verify authentication token is being sent
4. Check CORS configuration if cross-origin issues

### 8.3 Testing Strategy for AI Agents

**Before Committing Code:**

1. **Syntax Check**: Ensure no compilation errors (`get_errors` tool)
2. **Pattern Verification**: Compare with similar existing code
3. **Dependency Check**: Verify all imports exist
4. **Multi-tenancy Check**: Confirm TenantID filtering in all queries
5. **Type Safety**: Verify no `any` types or untyped parameters
6. **Error Handling**: Confirm all errors are handled
7. **Security Check**: No sensitive data in logs, proper validation

**Manual Testing Checklist:**

- Can the feature be accessed from the UI?
- Does it work with multiple tenants?
- Does error handling work correctly?
- Are success/error messages user-friendly?
- Does the feature work on mobile and web?

### 8.4 Common Pitfalls to Avoid

**Server (Go):**

- ❌ Forgetting to filter by TenantID in queries
- ❌ Not handling errors (ignoring returned errors)
- ❌ Using panic instead of returning errors
- ❌ Not passing context.Context through functions
- ❌ Hardcoding values instead of using config
- ❌ Not validating user inputs
- ❌ Logging sensitive data (passwords, tokens)
- ❌ Not using transactions for multi-table operations

**Client (TypeScript):**

- ❌ Using `any` type instead of explicit types
- ❌ Not handling async errors with try-catch
- ❌ Forgetting to add loading states
- ❌ Not displaying user-friendly error messages
- ❌ Using inline styles instead of Tailwind classes
- ❌ Not cleaning up useEffect subscriptions
- ❌ Forgetting to check authentication state
- ❌ Not handling empty states in lists

**Database:**

- ❌ Not including TenantID in indexes
- ❌ Missing foreign key relationships
- ❌ Not adding timestamps (CreatedAt, UpdatedAt)
- ❌ Not using UUID for primary keys
- ❌ Forgetting soft delete (DeletedAt)

### 8.5 AI Agent Self-Verification Checklist

**Before Marking Task as Complete:**

- [ ] All files compile without errors
- [ ] Code follows existing patterns in the codebase
- [ ] Multi-tenancy is enforced (TenantID filtering)
- [ ] All errors are handled appropriately
- [ ] Types are explicit (no `any` in TS, no untyped in Go)
- [ ] Security best practices are followed
- [ ] Code is properly formatted (go fmt, prettier)
- [ ] Comments are added for complex logic
- [ ] API client and server DTOs match
- [ ] UI has loading and error states
- [ ] Feature is accessible from navigation/menu
- [ ] Related documentation is updated

### 8.6 Code Review Guidelines for AI Agents

**When Reviewing Generated Code:**

1. **Correctness**: Does it solve the problem correctly?
2. **Consistency**: Does it match existing patterns?
3. **Completeness**: Is the implementation complete or are there TODOs?
4. **Security**: Are there security vulnerabilities?
5. **Performance**: Are there obvious performance issues?
6. **Maintainability**: Is the code readable and well-structured?
7. **Testing**: Can the code be easily tested?

### 8.7 Integration Checklist

**When Integrating New Feature:**

**Backend:**

- [ ] Model created with TenantID and all required fields
- [ ] Repository interface and implementation created
- [ ] Service created with business logic
- [ ] Controller created with route handlers
- [ ] Routes registered in routes.go with proper middleware
- [ ] Authentication and rate limiting applied
- [ ] Migration added (if needed) or AutoMigrate updated

**Frontend:**

- [ ] TypeScript types defined
- [ ] API service functions created
- [ ] Page component created
- [ ] Navigation route added (if new page)
- [ ] UI components integrated
- [ ] Error handling implemented
- [ ] Loading states added
- [ ] Authentication check added (if protected)

**Testing:**

- [ ] Server compiles without errors
- [ ] Client compiles without errors
- [ ] API endpoints accessible
- [ ] UI renders without errors
- [ ] Multi-tenant isolation verified

---

## 9. Documentation Maintenance

### 9.1 Document Hierarchy

This documentation ecosystem consists of three interconnected files:

1. **Quester.md** (This Document)
   - Purpose: Overview, architecture reference, quick patterns
   - Audience: AI agents and developers needing project overview
   - Update When: New features added, architecture changes, directory structure changes

2. **[Quester-AI-Rules.md](./Quester-AI-Rules.md)**
   - Purpose: Comprehensive coding standards and rules
   - Audience: AI agents implementing code
   - Update When: New coding patterns established, anti-patterns discovered, standards evolve

3. **[Quester-AI-Workflows.md](./Quester-AI-Workflows.md)**
   - Purpose: Step-by-step development workflows
   - Audience: AI agents executing development tasks
   - Update When: New workflows added, existing workflows optimized, tools/processes change

### 9.2 When to Update Documentation

**Update Quester.md:**

- New major features added to the platform
- Architecture patterns change
- New layers or modules introduced
- Directory structure reorganization
- Tech stack version upgrades
- New infrastructure components

**Update Quester-AI-Rules.md:**

- New coding standards established
- Security vulnerabilities discovered
- Performance patterns identified
- Testing strategies updated
- New anti-patterns identified

**Update Quester-AI-Workflows.md:**

- New development workflows identified
- Existing workflows optimized
- Tool changes (new CLI tools, IDE features)
- Deployment process changes

### 9.3 Documentation Best Practices

**For AI Agents Updating Documentation:**

1. **Maintain Consistency**: Keep formatting, style, and structure consistent across all three files
2. **Be Specific**: Provide concrete examples with actual code snippets
3. **Keep Current**: Remove outdated information, don't just append new content
4. **Cross-Reference**: Link between documents appropriately
5. **Verify Accuracy**: Ensure code examples compile and follow current patterns
6. **Update Dates**: Add modification dates to track currency

**For Developers:**

- Read Quester.md first for project overview
- Reference Quester-AI-Rules.md when implementing features
- Follow Quester-AI-Workflows.md for structured development
- Update documentation when making architectural changes
- Keep examples current with actual codebase

---

> **Note for AI Agents**: This documentation system is designed to provide comprehensive guidance while maintaining focus. Always start with this overview document, then drill down into Quester-AI-Rules.md or Quester-AI-Workflows.md as needed. Keep all three documents synchronized and current.

---

**Last Updated**: 2025-01-XX
**Version**: 2.0
**Maintainer**: Quester Development Team
