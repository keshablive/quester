# Plan: Generate Fresh Quester Platform Codebase

**Objective**: Generate complete, production-ready codebase from scratch for Quester Platform following specifications in `D:\quester\settings\backups\Quester.md`. Build both backend (Go) and frontend (React Native/Expo) with all core MVP features.

**Reference Document**: `D:\quester\settings\backups\Quester.md`
**Target Directories**: `D:\quester\server` (backend), `D:\quester\client` (frontend)

---

## Prerequisites Checklist

Verify these are installed and running before starting:

- ✅ **Go** 1.24+ (`go version`)
- ✅ **Node.js** 20+ with npm (`node --version`)
- ✅ **PostgreSQL** 15+ (localhost:5432)
- ✅ **Redis** 7+ (localhost:6379)
- ✅ **Docker & Docker Compose**
- ✅ **Git** for version control

---

## Phase 1: Backend Foundation (D:\quester\server)

### Step 1.1: Initialize Project Structure

Create complete directory tree:

```bash
cd D:\quester
mkdir -p server/cmd/server
mkdir -p server/internal/{app,routes,controllers,services,repositories,models}
mkdir -p server/internal/framework/{core,config,database,cache,middleware,responses,auth}
mkdir -p server/migrations
mkdir -p server/tests/{unit,integration,e2e}
mkdir -p server/scripts
```

Initialize Go module:

```bash
cd D:\quester\server
go mod init github.com/yourusername/quester
```

### Step 1.2: Install Backend Dependencies

Execute in `D:\quester\server`:

```bash
# Core Framework
go get github.com/gofiber/fiber/v2@v2.52.5
go get gorm.io/gorm@v1.25.12
go get gorm.io/driver/postgres@v1.5.9
go get github.com/redis/go-redis/v9@v9.7.0

# Security & Authentication
go get github.com/golang-jwt/jwt/v5@v5.3.0
go get golang.org/x/crypto@latest

# Utilities
go get github.com/google/uuid@v1.6.0
go get github.com/joho/godotenv@v1.5.1

# Monitoring
go get github.com/prometheus/client_golang@v1.23.2

# Testing
go get github.com/stretchr/testify@v1.10.0
```

### Step 1.3: Implement Framework Core (Bottom-Up)

**Priority Order**: Build foundation first, then layer dependencies on top.

#### 1.3.1: BaseModel (`internal/framework/core/base_model.go`)

Multi-tenant base with soft delete:

```go
package core

import (
    "time"
    "github.com/google/uuid"
    "gorm.io/gorm"
)

type BaseModel struct {
    ID        uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
    TenantID  uuid.UUID      `gorm:"type:uuid;not null;index" json:"tenant_id"`
    CreatedAt time.Time      `gorm:"not null;default:now()" json:"created_at"`
    UpdatedAt time.Time      `gorm:"not null;default:now()" json:"updated_at"`
    DeletedAt gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
}

func (b *BaseModel) BeforeCreate(tx *gorm.DB) error {
    if b.ID == uuid.Nil {
        b.ID = uuid.New()
    }
    return nil
}
```

**Key Features**:

- UUID primary keys (not sequential integers for security)
- TenantID for multi-tenant isolation (indexed)
- Soft delete support (deleted_at)
- Automatic timestamp management

#### 1.3.2: Configuration (`internal/framework/config/config.go`)

Environment-based configuration loader with validation:

**Responsibilities**:

- Load .env file
- Parse configuration values
- Validate required fields
- Provide defaults for optional fields
- Support multiple environments (dev, staging, prod)

**Required Environment Variables**:

```
SERVER_PORT, SERVER_ENV
DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
REDIS_HOST, REDIS_PORT
JWT_SECRET, JWT_ACCESS_EXPIRY_HOURS, JWT_REFRESH_EXPIRY_HOURS
```

#### 1.3.3: Database Connection (`internal/framework/database/database.go`)

GORM PostgreSQL setup with connection pooling:

**Configuration**:

- Max connections: 25
- Min connections: 5
- Max idle time: 10 minutes
- Connection lifetime: 1 hour

**Features**:

- Auto-migration support
- UUID extension enable
- Health check capability
- Connection retry logic

#### 1.3.4: Redis Cache (`internal/framework/cache/cache.go`)

Redis client wrapper with:

- Get/Set/Delete/Exists operations
- TTL support
- Rate limiting (token bucket algorithm)
- Context support for cancellation

**Rate Limiting Logic**:

- Global: 100 req/min per IP
- Auth endpoints: 5 attempts per 15 min
- API endpoints: 60 req/min per user

#### 1.3.5: JWT Utilities (`internal/framework/auth/jwt.go`)

Token generation and validation:

**Token Types**:

1. **Access Token**: 1h expiry, HS256 signing
2. **Refresh Token**: 30d expiry, SHA256 hashed storage

**Claims Structure**:

```go
type Claims struct {
    UserID   uuid.UUID
    TenantID uuid.UUID
    Role     string
    jwt.RegisteredClaims
}
```

#### 1.3.6: API Responses (`internal/framework/responses/response.go`)

Standardized response helpers:

- Success(data)
- Created(data)
- BadRequest(message)
- Unauthorized(message)
- Forbidden(message)
- NotFound(message)
- InternalServerError(message, err)

**Response Format**:

```json
{
  "success": true/false,
  "message": "optional message",
  "data": {...},
  "error": "error message if failed"
}
```

#### 1.3.7: Middleware (`internal/framework/middleware/`)

**auth.go** - JWT validation:

- Extract Bearer token from Authorization header
- Validate token signature and expiry
- Extract claims (UserID, TenantID, Role)
- Inject into Fiber context

**ratelimiter.go** - Rate limiting:

- Redis-backed token bucket
- Per-IP and per-user limits
- Return 429 with Retry-After header

**tenant.go** - Multi-tenant context:

- Extract TenantID from JWT claims
- Inject into request context
- Ensure all queries are tenant-scoped

**metrics.go** - Prometheus instrumentation:

- Request duration histogram
- Request counter by method/path
- Error rate counter
- Business metrics (signups, completions)

### Step 1.4: Implement Data Models

Create models in `internal/models/` directory:

#### 1.4.1: User Model (`user.go`)

```go
type User struct {
    core.BaseModel
    Email             string   `gorm:"uniqueIndex:idx_user_email_tenant"`
    Username          string   `gorm:"uniqueIndex:idx_user_username_tenant"`
    PasswordHash      string   `json:"-"`
    Name              string
    Role              UserRole `gorm:"default:'Student'"`
    Level             int      `gorm:"default:1"`
    XP                int      `gorm:"default:0"`
    Points            int      `gorm:"default:0"`
    TotalXPEarned     int      `gorm:"default:0"`
    TotalPointsEarned int      `gorm:"default:0"`
}
```

**Roles**: Admin, Moderator, Instructor, Student, Partner

**Gamification Fields**:

- **Level**: Current level (starts at 1, increases every 100 XP)
- **XP**: Experience points within current level (0-99)
- **Points**: Marketplace currency (earned on level-up)
- **TotalXPEarned**: Lifetime XP accumulation
- **TotalPointsEarned**: Lifetime points accumulation

#### 1.4.2: Quest Model (`quest.go`)

```go
type Quest struct {
    core.BaseModel
    Title            string
    Description      string
    Category         string
    Difficulty       Difficulty  // beginner, intermediate, advanced, expert
    Status           QuestStatus // draft, active, completed, archived
    XPReward         int
    PointsReward     int
    RequiredLevel    int `gorm:"default:1"`
    MaxAttempts      int `gorm:"default:0"` // 0 = unlimited
    TimeLimit        int `gorm:"default:0"` // minutes, 0 = none
    EstimatedHours   float64
    IsPublic         bool    `gorm:"default:true"`
    IsFeatured       bool    `gorm:"default:false"`
    TotalCompletions int     `gorm:"default:0"`
    AverageRating    float64 `gorm:"default:0"`
    RatingCount      int     `gorm:"default:0"`
    CreatedBy        uuid.UUID
    Tags             datatypes.JSON

    // Relationships
    Steps []QuestStep `gorm:"foreignKey:QuestID"`
}
```

#### 1.4.3: QuestStep Model (`quest_step.go`)

**7 Step Types**:

1. **text** ✅ Auto-verify - Read content
2. **video** ✅ Auto-verify - Watch video
3. **quiz** ✅ Auto-verify - Answer questions
4. **upload** ❌ Manual review - Upload file
5. **code** ❌ Manual review - Submit code
6. **external** ✅ Auto-verify - External task (honor system)
7. **review** ❌ Manual review - Peer/instructor review

```go
type QuestStep struct {
    core.BaseModel
    QuestID      uuid.UUID
    StepNumber   int
    Title        string
    Description  string
    StepType     StepType // text, video, quiz, upload, code, external, review
    RequiredData datatypes.JSON
    IsRequired   bool `gorm:"default:true"`
    XPReward     int
    TimeLimit    int
    HintText     string
    HintCost     int
    ResourceURLs datatypes.JSON
}

func (s QuestStep) IsAutoVerifiable() bool {
    return s.StepType == StepTypeText ||
           s.StepType == StepTypeVideo ||
           s.StepType == StepTypeQuiz ||
           s.StepType == StepTypeExternal
}
```

#### 1.4.4: QuestProgress Model (`quest_progress.go`)

```go
type QuestProgress struct {
    core.BaseModel
    QuestID          uuid.UUID
    UserID           uuid.UUID
    Status           ProgressStatus // not_started, in_progress, pending_review, completed, abandoned
    CurrentStepNumber int
    CompletedSteps   datatypes.JSON // [1, 2, 3, 5]
    TotalSteps       int
    StartedAt        *time.Time
    CompletedAt      *time.Time
    XPEarned         int
    PointsEarned     int
    Rating           int // 1-5, 0 if not rated
    HintsUsed        int
    SubmissionData   datatypes.JSON
}
```

#### 1.4.5: RefreshToken Model (`refresh_token.go`)

```go
type RefreshToken struct {
    core.BaseModel
    UserID    uuid.UUID
    TokenHash string    `gorm:"uniqueIndex"` // SHA256 hash
    ExpiresAt time.Time
}
```

### Step 1.5: Implement Repository Layer

Repositories provide data access abstraction. All queries **MUST** be tenant-scoped.

#### 1.5.1: User Repository (`internal/repositories/user_repository.go`)

**Methods**:

- `Create(ctx, user)` - Create new user
- `FindByID(ctx, tenantID, userID)` - Get by ID
- `FindByEmail(ctx, tenantID, email)` - Get by email (login)
- `FindByUsername(ctx, tenantID, username)` - Get by username (check uniqueness)
- `Update(ctx, user)` - Update user data
- `Delete(ctx, tenantID, userID)` - Soft delete user

**Tenant Scoping Example**:

```go
err := r.db.WithContext(ctx).
    Where("tenant_id = ? AND id = ?", tenantID, userID).
    First(&user).Error
```

#### 1.5.2: Quest Repository (`internal/repositories/quest_repository.go`)

**Methods**:

- `Create(ctx, quest)` - Create quest with steps
- `FindByID(ctx, tenantID, questID)` - Get with preloaded steps and creator
- `List(ctx, tenantID, filters, limit, offset)` - Paginated list with filters
- `Update(ctx, quest)` - Update quest metadata
- `Delete(ctx, tenantID, questID)` - Soft delete

**Filters**:

- `category` - Filter by category
- `difficulty` - Filter by difficulty level
- `status` - Filter by quest status
- `created_by` - Filter by creator

**Pagination**: Default 20 items, max 100 per page

#### 1.5.3: QuestProgress Repository

Track user progress through quests.

#### 1.5.4: RefreshToken Repository

Manage refresh token lifecycle (create, find, delete, cleanup expired).

### Step 1.6: Implement Service Layer

Services contain business logic. They orchestrate repositories and enforce business rules.

#### 1.6.1: Auth Service (`internal/services/auth_service.go`)

**Signup Flow**:

1. Validate input (email format, password strength)
2. Check email/username uniqueness
3. Hash password (bcrypt cost 12)
4. Create user with defaults (Level=1, XP=0, Points=0, Role=Student)
5. Generate access + refresh tokens
6. Store refresh token hash in database
7. Return tokens + user data

**Login Flow**:

1. Find user by email
2. Compare password hash
3. Generate new access + refresh tokens
4. Store new refresh token
5. Return tokens + user data

**Token Refresh Flow**:

1. Validate refresh token (not expired, exists in DB)
2. Generate new access + refresh tokens (rotation)
3. Delete old refresh token
4. Store new refresh token
5. Return new tokens

**Logout Flow**:

1. Blacklist access token (Redis cache)
2. Delete refresh token from database

**Security Requirements**:

- Password: min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special
- bcrypt cost factor: 12 (~250ms hash time)
- JWT signature algorithm: HS256 (or RS256 for production)
- Rate limit: 5 login attempts per 15 minutes per IP

#### 1.6.2: User Service (`internal/services/user_service.go`)

**GetProfile**: Return user data (no password hash)

**UpdateProfile**: Update name, avatar URL (username/email changes require verification)

**XP/Level Calculation Logic**:

```
Level = 1 + floor(TotalXPEarned / 100)
XP = TotalXPEarned % 100
```

When user levels up:

- Award points: `Points += Level * 10` (example: Level 5 = 50 points)
- Trigger level-up event/notification

**GetStatistics**:

```json
{
  "total_quests_attempted": 10,
  "total_quests_completed": 7,
  "completion_rate": 70,
  "total_xp_earned": 1250,
  "current_streak": 5
}
```

#### 1.6.3: Quest Service (`internal/services/quest_service.go`)

**CreateQuest**:

1. Validate quest data (title, description, steps)
2. Validate creator permissions (Instructor or Admin)
3. Set initial status to 'draft'
4. Create quest with steps in transaction
5. Return created quest

**Validation Rules**:

- Title: 5-200 characters
- Description: 10-5000 characters
- Steps: 1-50 steps
- XP Reward: 0-10000
- Points Reward: 0-5000

**UpdateQuest**:

- Only creator or admin can update
- Cannot change quest if users have started it (or require migration)

**DeleteQuest**:

- Soft delete only
- Cascade to steps (soft delete)
- Keep progress records for history

**ListQuests**:

- Support filters: category, difficulty, status, creator
- Support search: title, description
- Support pagination: limit, offset
- Public quests only (unless authenticated user is creator)

**GetQuestDetails**:

- Return quest with all steps
- Include creator information
- Include completion statistics

#### 1.6.4: QuestProgress Service (`internal/services/quest_progress_service.go`)

**StartQuest**:

1. Check user meets required level
2. Check max attempts not exceeded
3. Create progress record (status: in_progress)
4. Set StartedAt timestamp
5. Return progress record

**CompleteStep**:

1. Validate step belongs to quest
2. Check step not already completed
3. If auto-verifiable: mark complete immediately
4. If manual review: set status to pending_review
5. Award step XP to user
6. Update user's XP and check for level-up
7. Move to next step if all prior steps complete

**CompleteQuest**:

1. Validate all required steps completed
2. Award quest XP and Points
3. Update user totals
4. Set CompletedAt timestamp
5. Increment quest completion counter
6. Check for achievements/badges

**AbandonQuest**:

1. Set status to abandoned
2. No rewards awarded
3. Allow restart (if attempts remaining)

**RateQuest** (1-5 stars):

1. Calculate new average: `(currentAvg * count + newRating) / (count + 1)`
2. Update quest's AverageRating and RatingCount

**RevealHint**:

1. Deduct hint cost from user XP
2. Increment hints_used counter
3. Return hint text

### Step 1.7: Implement Controllers

Controllers handle HTTP requests, call services, return responses.

#### 1.7.1: Auth Controller (`internal/controllers/auth_controller.go`)

**Endpoints**:

- `POST /api/v1/auth/signup` → Signup()
- `POST /api/v1/auth/login` → Login()
- `POST /api/v1/auth/refresh` → RefreshToken()
- `POST /api/v1/auth/logout` → Logout()

**Input Validation**: Use struct tags for validation

**Error Handling**: Return appropriate HTTP status codes

**Rate Limiting**: Apply to login endpoint (5 attempts/15min)

#### 1.7.2: User Controller (`internal/controllers/user_controller.go`)

**Endpoints**:

- `GET /api/v1/users/me` → GetCurrentUser()
- `PUT /api/v1/users/me` → UpdateCurrentUser()
- `GET /api/v1/users/:id` → GetPublicProfile()

**Authorization**: Require JWT for /me endpoints

**Public Profile**: No sensitive data (email, password hash, tokens)

#### 1.7.3: Quest Controller (`internal/controllers/quest_controller.go`)

**Endpoints**:

- `POST /api/v1/quests` → CreateQuest()
- `GET /api/v1/quests` → ListQuests()
- `GET /api/v1/quests/my` → ListMyQuests()
- `GET /api/v1/quests/:id` → GetQuest()
- `PUT /api/v1/quests/:id` → UpdateQuest()
- `DELETE /api/v1/quests/:id` → DeleteQuest()

**Authorization**:

- Create: Instructor or Admin
- Update/Delete: Creator or Admin
- List/Get: Public (with visibility filtering)

#### 1.7.4: QuestProgress Controller (`internal/controllers/quest_progress_controller.go`)

**Endpoints**:

- `POST /api/v1/progress/:questId/start` → StartQuest()
- `POST /api/v1/progress/:questId/steps/:stepId/complete` → CompleteStep()
- `POST /api/v1/progress/:questId/complete` → CompleteQuest()
- `POST /api/v1/progress/:questId/abandon` → AbandonQuest()
- `POST /api/v1/progress/:questId/rate` → RateQuest()
- `GET /api/v1/progress/user/:userId` → GetUserProgress()
- `GET /api/v1/progress/:questId` → GetQuestProgress()

### Step 1.8: Wire Application Together

#### 1.8.1: Routes (`internal/routes/routes.go`)

Group routes by feature:

```go
func SetupRoutes(app *fiber.App, controllers *Controllers, cfg *config.Config) {
    api := app.Group("/api/v1")

    // Public routes
    auth := api.Group("/auth")
    auth.Post("/signup", rateLimiter, controllers.Auth.Signup)
    auth.Post("/login", rateLimiter, controllers.Auth.Login)
    auth.Post("/refresh", controllers.Auth.RefreshToken)

    // Protected routes
    users := api.Group("/users", authMiddleware)
    users.Get("/me", controllers.User.GetCurrentUser)
    users.Put("/me", controllers.User.UpdateCurrentUser)

    // ... more routes
}
```

#### 1.8.2: Application (`internal/app/app.go`)

Dependency injection container:

```go
type App struct {
    Config       *config.Config
    DB           *gorm.DB
    Cache        *cache.Cache
    Repositories *Repositories
    Services     *Services
    Controllers  *Controllers
    Fiber        *fiber.App
}

func NewApp() (*App, error) {
    // 1. Load config
    // 2. Connect database
    // 3. Connect redis
    // 4. Initialize repositories
    // 5. Initialize services
    // 6. Initialize controllers
    // 7. Setup Fiber app
    // 8. Register routes
    // 9. Setup middleware

    return app, nil
}
```

#### 1.8.3: Main Entry Point (`cmd/server/main.go`)

```go
func main() {
    // Load .env
    godotenv.Load()

    // Initialize app
    app, err := app.NewApp()
    if err != nil {
        log.Fatal(err)
    }

    // Auto-migrate models
    database.AutoMigrate(app.DB, &models.User{}, &models.Quest{}, ...)

    // Start server
    log.Printf("Server starting on port %s", app.Config.Server.Port)
    if err := app.Fiber.Listen(":" + app.Config.Server.Port); err != nil {
        log.Fatal(err)
    }
}
```

### Step 1.9: Configuration Files

#### `.env.example`:

```env
# Server
SERVER_PORT=8080
SERVER_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=quester_user
DB_PASSWORD=quester_password
DB_NAME=quester_db
DB_MAX_CONNS=25
DB_MIN_CONNS=5

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT
JWT_SECRET=change-this-to-strong-random-secret-in-production
JWT_ACCESS_EXPIRY_HOURS=1
JWT_REFRESH_EXPIRY_HOURS=720
```

#### `Makefile`:

```makefile
.PHONY: run test build docker-up docker-down

run:
	go run cmd/server/main.go

test:
	go test -v ./...

test-coverage:
	go test -v -cover ./... -coverprofile=coverage.out

build:
	go build -o bin/server cmd/server/main.go

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

docker-reset:
	docker-compose down -v

lint:
	golangci-lint run
```

#### `docker-compose.yml`:

```yaml
version: "3.8"

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: quester_db
      POSTGRES_USER: quester_user
      POSTGRES_PASSWORD: quester_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U quester_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
```

---

## Phase 2: Frontend Foundation (D:\quester\client)

### Step 2.1: Initialize Expo Project

```bash
cd D:\quester
npx create-expo-app@latest client --template blank-typescript
cd client
```

### Step 2.2: Install Frontend Dependencies

```bash
# Core
npm install expo@~54.0.0 react@19.1.0 react-native@0.81.5
npm install expo-router@~6.0.10

# Styling
npm install nativewind@^4.2.1 tailwindcss@^3.4.0

# State & Data
npm install @tanstack/react-query@^5.90.5
npm install expo-secure-store@~15.0.7
npm install @react-native-async-storage/async-storage@~2.2.0

# UI Primitives
npm install @rn-primitives/portal @rn-primitives/slot
npm install lucide-react-native react-native-svg

# Development
npm install -D @types/react @types/react-native
```

### Step 2.3: Initialize React Native Reusables

```bash
npx @react-native-reusables/cli@latest init
```

This creates:

- `components.json` configuration
- `lib/utils.ts` with cn() function
- `components/ui/` directory ready for components

### Step 2.4: Install Core UI Components

```bash
echo "n" | npx @react-native-reusables/cli@latest add button
echo "n" | npx @react-native-reusables/cli@latest add card
echo "n" | npx @react-native-reusables/cli@latest add input
echo "n" | npx @react-native-reusables/cli@latest add dialog
echo "n" | npx @react-native-reusables/cli@latest add avatar
echo "n" | npx @react-native-reusables/cli@latest add badge
echo "n" | npx @react-native-reusables/cli@latest add tabs
echo "n" | npx @react-native-reusables/cli@latest add progress
echo "n" | npx @react-native-reusables/cli@latest add select
echo "n" | npx @react-native-reusables/cli@latest add skeleton
```

Install remaining 20+ components as needed for your UI.

### Step 2.5: Configure Project Files

#### `app.json`:

```json
{
  "expo": {
    "name": "Quester",
    "slug": "quester",
    "version": "1.0.0",
    "scheme": "quester",
    "platforms": ["ios", "android", "web"],
    "plugins": ["expo-router"],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

#### `tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
    },
  },
  plugins: [],
};
```

#### `global.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 0 0% 3.9%;
    --primary: 0 0% 9%;
    --primary-foreground: 0 0% 98%;
    --secondary: 0 0% 96.1%;
    --secondary-foreground: 0 0% 9%;
    --muted: 0 0% 96.1%;
    --muted-foreground: 0 0% 45.1%;
    --accent: 0 0% 96.1%;
    --accent-foreground: 0 0% 9%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 0 0% 89.8%;
    --input: 0 0% 89.8%;
    --ring: 0 0% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 0 0% 3.9%;
  }

  .dark {
    --background: 0 0% 3.9%;
    --foreground: 0 0% 98%;
    --primary: 0 0% 98%;
    --primary-foreground: 0 0% 9%;
    --secondary: 0 0% 14.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 0 0% 14.9%;
    --muted-foreground: 0 0% 63.9%;
    --accent: 0 0% 14.9%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 0 0% 14.9%;
    --input: 0 0% 14.9%;
    --ring: 0 0% 83.1%;
    --card: 0 0% 3.9%;
    --card-foreground: 0 0% 98%;
  }
}
```

#### `tsconfig.json`:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

#### `babel.config.js`:

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }]],
    plugins: ["nativewind/babel", "react-native-reanimated/plugin"],
  };
};
```

### Step 2.6: Create API Client Layer

#### `lib/api/client.ts`:

```typescript
import * as SecureStore from "expo-secure-store";

const API_BASE_URL = __DEV__
  ? "http://localhost:8080/api/v1"
  : "https://api.quester.app/api/v1";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class ApiClient {
  private async getAccessToken(): Promise<string | null> {
    return await SecureStore.getItemAsync("access_token");
  }

  private async getRefreshToken(): Promise<string | null> {
    return await SecureStore.getItemAsync("refresh_token");
  }

  private async setTokens(accessToken: string, refreshToken: string) {
    await SecureStore.setItemAsync("access_token", accessToken);
    await SecureStore.setItemAsync("refresh_token", refreshToken);
  }

  private async refreshAccessToken(): Promise<boolean> {
    try {
      const refreshToken = await this.getRefreshToken();
      if (!refreshToken) return false;

      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) return false;

      const data: ApiResponse<{ access_token: string; refresh_token: string }> =
        await response.json();

      if (data.success && data.data) {
        await this.setTokens(data.data.access_token, data.data.refresh_token);
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = await this.getAccessToken();

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    // Handle 401 - try to refresh token and retry
    if (response.status === 401) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        // Retry original request with new token
        const newToken = await this.getAccessToken();
        const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
          ...options,
          headers: {
            "Content-Type": "application/json",
            ...(newToken && { Authorization: `Bearer ${newToken}` }),
            ...options.headers,
          },
        });
        return retryResponse.json();
      }
    }

    return response.json();
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "GET" });
  }

  async post<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }
}

export const apiClient = new ApiClient();
```

#### `lib/api/auth.ts`:

```typescript
import { apiClient } from "./client";

export interface SignupInput {
  email: string;
  username: string;
  password: string;
  name: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    username: string;
    name: string;
    role: string;
    level: number;
    xp: number;
    points: number;
  };
}

export const authApi = {
  signup: async (data: SignupInput) => {
    return apiClient.post<AuthResponse>("/auth/signup", data);
  },

  login: async (data: LoginInput) => {
    return apiClient.post<AuthResponse>("/auth/login", data);
  },

  logout: async () => {
    return apiClient.post("/auth/logout", {});
  },
};
```

#### `lib/api/quest.ts`:

```typescript
import { apiClient } from "./client";

export interface Quest {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: "beginner" | "intermediate" | "advanced" | "expert";
  xp_reward: number;
  points_reward: number;
  required_level: number;
  is_public: boolean;
  is_featured: boolean;
  average_rating: number;
  total_completions: number;
}

export interface QuestListParams {
  page?: number;
  limit?: number;
  category?: string;
  difficulty?: string;
}

export const questApi = {
  list: async (params: QuestListParams = {}) => {
    const query = new URLSearchParams(params as any).toString();
    return apiClient.get<Quest[]>(`/quests?${query}`);
  },

  get: async (id: string) => {
    return apiClient.get<Quest>(`/quests/${id}`);
  },

  create: async (data: Partial<Quest>) => {
    return apiClient.post<Quest>("/quests", data);
  },
};
```

### Step 2.7: Create Directory Structure

```
app/
├── _layout.tsx           # Root layout
├── index.tsx             # Landing/home
├── (auth)/
│   ├── sign-in.tsx
│   └── sign-up.tsx
├── (tabs)/
│   ├── _layout.tsx
│   ├── home.tsx
│   ├── quests.tsx
│   └── profile.tsx
└── quest/
    └── [id].tsx

components/
├── auth/
│   ├── sign-in-form.tsx
│   └── sign-up-form.tsx
├── quest/
│   ├── quest-card.tsx
│   └── quest-detail.tsx
└── ui/
    └── (30+ reusable components)

lib/
├── api/
│   ├── client.ts
│   ├── auth.ts
│   ├── quest.ts
│   └── user.ts
├── theme.ts
└── utils.ts
```

### Step 2.8: Implement Authentication Screens

#### `components/auth/sign-in-form.tsx`:

```typescript
import { useState } from "react";
import { View } from "react-native";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { authApi } from "@/lib/api/auth";
import * as SecureStore from "expo-secure-store";
import { useRouter } from "expo-router";

export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignIn = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await authApi.login({ email, password });

      if (response.success && response.data) {
        await SecureStore.setItemAsync(
          "access_token",
          response.data.access_token
        );
        await SecureStore.setItemAsync(
          "refresh_token",
          response.data.refresh_token
        );
        router.replace("/(tabs)/home");
      } else {
        setError(response.error || "Login failed");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="p-4 gap-4">
      <Input
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <Input
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      {error && <Text className="text-destructive">{error}</Text>}
      <Button onPress={handleSignIn} disabled={loading}>
        <Text>{loading ? "Signing in..." : "Sign In"}</Text>
      </Button>
    </View>
  );
}
```

### Step 2.9: Implement Quest Screens

#### `components/quest/quest-card.tsx`:

```typescript
import { View, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Text } from "@/components/ui/text";
import type { Quest } from "@/lib/api/quest";

interface QuestCardProps {
  quest: Quest;
}

export function QuestCard({ quest }: QuestCardProps) {
  const router = useRouter();

  return (
    <TouchableOpacity onPress={() => router.push(`/quest/${quest.id}`)}>
      <Card className="m-2">
        <CardHeader>
          <CardTitle>{quest.title}</CardTitle>
          <CardDescription numberOfLines={2}>
            {quest.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <View className="flex-row items-center gap-2">
            <Badge variant="secondary">{quest.difficulty}</Badge>
            <Text className="text-sm text-muted-foreground">
              {quest.xp_reward} XP
            </Text>
            <Text className="text-sm text-muted-foreground">
              {quest.points_reward} Points
            </Text>
          </View>
        </CardContent>
      </Card>
    </TouchableOpacity>
  );
}
```

#### `app/(tabs)/quests.tsx`:

```typescript
import { View, FlatList } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { questApi } from "@/lib/api/quest";
import { QuestCard } from "@/components/quest/quest-card";
import { Text } from "@/components/ui/text";

export default function QuestsScreen() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["quests"],
    queryFn: () => questApi.list({ page: 1, limit: 20 }),
  });

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text>Loading quests...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-destructive">Failed to load quests</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={data?.data || []}
      renderItem={({ item }) => <QuestCard quest={item} />}
      keyExtractor={(item) => item.id}
      contentContainerClassName="p-4"
      ListEmptyComponent={
        <Text className="text-center text-muted-foreground">
          No quests available
        </Text>
      }
    />
  );
}
```

### Step 2.10: Root Layout

#### `app/_layout.tsx`:

```typescript
import { useEffect } from "react";
import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PortalHost } from "@rn-primitives/portal";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import "../global.css";

const queryClient = new QueryClient();

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    // Add custom fonts here if needed
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Stack>
        <Stack.Screen name="index" options={{ title: "Quester" }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <PortalHost />
    </QueryClientProvider>
  );
}
```

---

## Phase 3: Testing Infrastructure

### Backend Tests

#### Unit Test Example (`tests/unit/services/auth_service_test.go`):

```go
package services_test

import (
    "context"
    "testing"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/mock"
)

func TestSignup(t *testing.T) {
    // Arrange
    mockRepo := new(MockUserRepository)
    service := NewAuthService(mockRepo)

    input := SignupInput{
        Email: "test@example.com",
        Username: "testuser",
        Password: "Test123!",
        Name: "Test User",
    }

    mockRepo.On("FindByEmail", mock.Anything, mock.Anything, input.Email).
        Return(nil, gorm.ErrRecordNotFound)
    mockRepo.On("Create", mock.Anything, mock.Anything).
        Return(nil)

    // Act
    user, tokens, err := service.Signup(context.Background(), uuid.New(), input)

    // Assert
    assert.NoError(t, err)
    assert.NotNil(t, user)
    assert.NotEmpty(t, tokens.AccessToken)
    assert.NotEmpty(t, tokens.RefreshToken)
    assert.Equal(t, 1, user.Level)
    assert.Equal(t, 0, user.XP)
    mockRepo.AssertExpectations(t)
}
```

### Frontend Tests

#### Component Test Example (`__tests__/components/quest-card.test.tsx`):

```typescript
import { render } from "@testing-library/react-native";
import { QuestCard } from "@/components/quest/quest-card";

describe("QuestCard", () => {
  const mockQuest = {
    id: "123",
    title: "Test Quest",
    description: "Test Description",
    category: "programming",
    difficulty: "beginner" as const,
    xp_reward: 100,
    points_reward: 50,
    required_level: 1,
    is_public: true,
    is_featured: false,
    average_rating: 4.5,
    total_completions: 10,
  };

  it("renders quest title and description", () => {
    const { getByText } = render(<QuestCard quest={mockQuest} />);

    expect(getByText("Test Quest")).toBeTruthy();
    expect(getByText("Test Description")).toBeTruthy();
  });

  it("displays XP and points rewards", () => {
    const { getByText } = render(<QuestCard quest={mockQuest} />);

    expect(getByText("100 XP")).toBeTruthy();
    expect(getByText("50 Points")).toBeTruthy();
  });
});
```

---

## Phase 4: Verification & Launch

### Backend Verification Checklist

#### Step 1: Start Infrastructure

```bash
cd D:\quester\server
make docker-up
# Wait for health checks to pass
docker ps
```

#### Step 2: Run Server

```bash
make run
# Should see:
# ✅ Database connected successfully
# ✅ Database migrations completed
# ✅ Redis connected
# Server starting on port 8080
```

#### Step 3: Test Authentication Flow

**Signup**:

```bash
curl -X POST http://localhost:8080/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "Test123!",
    "name": "Test User"
  }'
```

Expected response:

```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGc...",
    "refresh_token": "eyJhbGc...",
    "user": {
      "id": "...",
      "email": "test@example.com",
      "username": "testuser",
      "name": "Test User",
      "role": "Student",
      "level": 1,
      "xp": 0,
      "points": 0
    }
  }
}
```

**Login**:

```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!"
  }'
```

**Get Profile** (use access_token from login):

```bash
curl -X GET http://localhost:8080/api/v1/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Step 4: Test Quest Flow

**Create Quest**:

```bash
curl -X POST http://localhost:8080/api/v1/quests \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Learn Go Basics",
    "description": "Introduction to Go programming",
    "category": "programming",
    "difficulty": "beginner",
    "xp_reward": 100,
    "points_reward": 50,
    "steps": [
      {
        "step_number": 1,
        "title": "Read Introduction",
        "description": "Read the Go tour introduction",
        "step_type": "text",
        "xp_reward": 20
      }
    ]
  }'
```

**List Quests**:

```bash
curl -X GET "http://localhost:8080/api/v1/quests?limit=10&page=1"
```

#### Step 5: Run Tests

```bash
make test
# Should see all tests passing
```

### Frontend Verification Checklist

#### Step 1: Start Expo Dev Server

```bash
cd D:\quester\client
npm start
```

#### Step 2: Choose Platform

- Press `w` for web (browser)
- Press `a` for Android emulator
- Press `i` for iOS simulator (macOS only)
- Scan QR with Expo Go app (mobile)

#### Step 3: Test Authentication

1. Navigate to sign-up screen
2. Fill form and submit
3. Verify successful registration
4. Test login with created account
5. Verify redirect to home screen

#### Step 4: Test Quest Features

1. Navigate to Quests tab
2. Verify quest list loads
3. Tap quest card
4. Verify quest detail screen
5. Test start quest button

#### Step 5: Test Dark Mode

1. Toggle system dark mode
2. Verify app theme switches
3. Check all screens for proper theming

### Integration Verification

**Complete User Journey**:

1. ✅ Register new account → verify email uniqueness
2. ✅ Login → verify token storage
3. ✅ Browse quests → verify data loading
4. ✅ View quest detail → verify navigation
5. ✅ Start quest → verify progress creation
6. ✅ Complete steps → verify XP awards
7. ✅ Complete quest → verify level-up if applicable
8. ✅ View updated profile → verify XP/Level/Points

**Performance Verification**:

- API response time < 200ms (P95)
- No memory leaks
- Smooth scrolling (60 FPS)
- Offline queue works

**Security Verification**:

- Multi-tenant isolation working
- JWT expiry respected
- Rate limiting active
- Input validation working
- Password hashing secure

---

## Implementation Timeline

### Week 1-2: Backend Core

- Days 1-3: Framework foundation (config, database, cache, auth)
- Days 4-7: Data models and repositories
- Days 8-10: Services (auth, user, quest)
- Days 11-14: Controllers, routes, testing

### Week 3-4: Frontend Core

- Days 1-3: Project setup, dependencies, configuration
- Days 4-7: API client, authentication screens
- Days 8-10: Quest screens, navigation
- Days 11-14: Polish, testing, integration

### Week 5: Integration & Testing

- Days 1-2: End-to-end authentication
- Days 3-4: Quest creation and completion flow
- Day 5: Performance optimization
- Days 6-7: Security hardening

### Week 6: Polish & Deploy

- Days 1-2: Error handling refinement
- Days 3-4: Documentation
- Days 5-6: Deployment setup
- Day 7: Final testing and launch

---

## Success Criteria

### Backend

- ✅ All endpoints functional
- ✅ Multi-tenant isolation verified
- ✅ Authentication flow complete
- ✅ Quest CRUD operations working
- ✅ Rate limiting active
- ✅ Tests passing (>80% coverage)
- ✅ Performance targets met (<200ms P95)

### Frontend

- ✅ Authentication screens working
- ✅ Quest listing and detail functional
- ✅ Navigation smooth
- ✅ API integration complete
- ✅ Offline support working
- ✅ Dark mode functional
- ✅ Tests passing

### Integration

- ✅ Complete user journey works
- ✅ XP and level-up mechanics functional
- ✅ Token refresh automatic
- ✅ Error handling graceful
- ✅ Performance acceptable
- ✅ Security measures active

---

## Reference Materials

**Primary Source**: `D:\quester\settings\backups\Quester.md`

**Architecture Patterns**:

- Multi-Tenant Clean Architecture (Controller → Service → Repository)
- Repository Pattern for data access
- Dependency Injection for testability
- RESTful API design

**Technologies**:

- Backend: Go 1.24+, GoFiber v2.52+, GORM v1.25.5+, PostgreSQL 15+, Redis 7+
- Frontend: React Native 0.79.5, Expo 53, NativeWind 4.1.23
- Security: JWT HS256, bcrypt cost 12, rate limiting
- Testing: Testify (Go), Jest (TypeScript), React Native Testing Library

**Key Features**:

- Authentication with JWT token rotation
- Multi-tenant isolation with TenantID
- Quest system with 7 step types
- Gamification (XP, Levels, Points)
- Performance (<200ms P95, 1000+ RPS)
- Security (A+ headers, rate limiting, input validation)

---

## Notes & Best Practices

1. **Always tenant-scope queries** - Never forget `WHERE tenant_id = ?`
2. **Validate input** - Never trust user input
3. **Hash passwords** - Always use bcrypt cost 12
4. **Use UUIDs** - More secure than sequential integers
5. **Implement rate limiting** - Prevent abuse
6. **Cache aggressively** - 15min TTL for frequently accessed data
7. **Test thoroughly** - Write tests alongside implementation
8. **Handle errors gracefully** - Return meaningful error messages
9. **Optimize database queries** - Use indexes, avoid N+1 problems
10. **Keep security in mind** - OWASP guidelines, regular audits

---

## Support & Troubleshooting

**Common Issues**:

1. **Database connection failed**

   - Verify PostgreSQL running: `docker ps`
   - Check credentials in `.env`
   - Ensure port 5432 not in use

2. **Redis connection failed**

   - Verify Redis running: `docker ps`
   - Check Redis logs: `docker logs quester-redis`

3. **JWT token invalid**

   - Check JWT_SECRET in `.env`
   - Verify token not expired
   - Check token format (Bearer token)

4. **Frontend not loading**

   - Clear Expo cache: `npx expo start -c`
   - Reinstall dependencies: `rm -rf node_modules && npm install`
   - Check API_BASE_URL in client.ts

5. **Rate limit exceeded**
   - Wait for window to expire (check Retry-After header)
   - Adjust rate limits in configuration if testing

**Getting Help**:

- Check Quester.md for detailed specifications
- Review error logs (server and client)
- Verify prerequisites installed correctly
- Test with curl/Postman before debugging app

---

**End of Plan**

This comprehensive plan provides step-by-step instructions for generating a complete, production-ready Quester platform from scratch. Follow the phases sequentially, verify at each step, and refer to Quester.md for detailed specifications.
