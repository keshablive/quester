# Quester Platform - Full-Stack Architecture Specification

**Document Type:** Technical Architecture Specification  
**Platform:** Multi-Domain Gamified Learning Ecosystem  
**Architecture Style:** Multi-Tenant Microservices with Monolithic Core  
**Date:** October 27, 2025  
**Architect:** Winston (BMad Method Framework)  
**Status:** Expansion Architecture for 75% Complete Platform  

---

## 🎯 Executive Architecture Summary

### Current State Analysis
The Quester platform represents a **75% complete** sophisticated multi-tenant gamified learning system built on modern, scalable foundations. The existing architecture demonstrates strong engineering principles with Go/GoFiber backend, PostgreSQL/Redis data layer, and React Native cross-platform frontend.

### Expansion Scope
This architecture specification addresses the **remaining 25%** implementation covering advanced features including LMS, video streaming, real-time communication, marketplace integration, and mobile optimization to create a comprehensive multi-domain learning ecosystem.

### Architecture Principles
- **Multi-Tenant by Design**: Complete data isolation with tenant-scoped operations
- **API-First**: RESTful APIs with planned GraphQL integration for complex queries
- **Performance-Oriented**: Redis caching, connection pooling, and optimized database patterns
- **Security-Hardened**: JWT authentication, input validation, audit logging, and SOC 2 compliance
- **Mobile-First**: React Native with offline-first capabilities and native optimizations

---

## 🏗️ System Architecture Overview

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│  React Native Mobile App (iOS/Android)                         │
│  ├─ Expo 53 Framework                                          │
│  ├─ React Native Reusables (31 UI components)                  │
│  ├─ NativeWind (Tailwind CSS)                                  │
│  ├─ Offline-First Architecture                                 │
│  └─ Native Integrations (Camera, Biometrics, Push)             │
├─────────────────────────────────────────────────────────────────┤
│  Progressive Web App (Desktop/Web)                              │
│  ├─ Shared React Components                                    │
│  ├─ PWA Service Workers                                        │
│  └─ Responsive Breakpoints                                     │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ HTTPS/WSS
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API GATEWAY                             │
├─────────────────────────────────────────────────────────────────┤
│  Load Balancer (HAProxy/nginx)                                 │
│  ├─ SSL Termination                                            │
│  ├─ Rate Limiting                                              │
│  ├─ Request Routing                                            │
│  └─ Health Checks                                              │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                          │
├─────────────────────────────────────────────────────────────────┤
│  Core Platform Service (Go/GoFiber)                            │
│  ├─ Authentication & Authorization                              │
│  ├─ User Management & Profiles                                 │
│  ├─ Quest & Gamification Engine                                │
│  ├─ Multi-Tenant Data Access                                   │
│  └─ RESTful API Endpoints                                      │
├─────────────────────────────────────────────────────────────────┤
│  Learning Management Service (Go)                               │
│  ├─ Course & Lesson Management                                 │
│  ├─ Assessment & Grading Engine                                │
│  ├─ Progress Tracking                                          │
│  └─ Certificate Generation                                     │
├─────────────────────────────────────────────────────────────────┤
│  Media Streaming Service (Go/Node.js)                          │
│  ├─ Video Upload & Transcoding                                 │
│  ├─ Adaptive Bitrate Streaming                                 │
│  ├─ Live Streaming (WebRTC)                                   │
│  └─ CDN Integration                                            │
├─────────────────────────────────────────────────────────────────┤
│  Real-Time Communication Service (Go/WebSocket)                 │
│  ├─ WebSocket Connection Management                            │
│  ├─ Messaging & Chat                                          │
│  ├─ Push Notifications                                        │
│  └─ Presence & Activity Tracking                              │
├─────────────────────────────────────────────────────────────────┤
│  Marketplace Service (Go)                                      │
│  ├─ Product & Property Listings                               │
│  ├─ Wallet & Transaction Management                           │
│  ├─ Payment Processing Integration                             │
│  └─ Order & Fulfillment Tracking                             │
├─────────────────────────────────────────────────────────────────┤
│  Analytics & Admin Service (Go)                                │
│  ├─ Business Intelligence Dashboard                            │
│  ├─ User Behavior Analytics                                   │
│  ├─ Content Moderation & AI                                   │
│  └─ System Administration Tools                               │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                               │
├─────────────────────────────────────────────────────────────────┤
│  Primary Database (PostgreSQL 15+)                             │
│  ├─ Multi-Tenant Schema Design                                 │
│  ├─ ACID Compliance & Transactions                            │
│  ├─ Full-Text Search (pg_trgm)                                │
│  └─ Connection Pooling (PgBouncer)                            │
├─────────────────────────────────────────────────────────────────┤
│  Cache Layer (Redis 7+)                                        │
│  ├─ Session Storage                                            │
│  ├─ Application Caching (15min TTL)                           │
│  ├─ Rate Limiting Counters                                    │
│  └─ Real-Time Message Queue                                   │
├─────────────────────────────────────────────────────────────────┤
│  File Storage (Multi-Provider)                                 │
│  ├─ Local Storage (Development)                                │
│  ├─ AWS S3 (Production Media)                                 │
│  ├─ CloudFlare R2 (CDN Integration)                           │
│  └─ Object Lifecycle Management                               │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    INFRASTRUCTURE LAYER                         │
├─────────────────────────────────────────────────────────────────┤
│  Container Orchestration (Docker + Kubernetes)                  │
│  ├─ Service Mesh (Istio/Linkerd)                              │
│  ├─ Auto-Scaling (HPA/VPA)                                    │
│  ├─ Rolling Deployments                                       │
│  └─ Health Monitoring                                         │
├─────────────────────────────────────────────────────────────────┤
│  Observability Stack                                           │
│  ├─ Metrics (Prometheus + Grafana)                            │
│  ├─ Logging (ELK Stack)                                       │
│  ├─ Tracing (Jaeger/OpenTelemetry)                           │
│  └─ APM (DataDog/New Relic)                                   │
├─────────────────────────────────────────────────────────────────┤
│  Security & Compliance                                         │
│  ├─ Secrets Management (HashiCorp Vault)                      │
│  ├─ Certificate Management (Let's Encrypt)                    │
│  ├─ Vulnerability Scanning                                    │
│  └─ Compliance Monitoring (SOC 2)                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Backend Architecture Specification

### Core Platform Service (Existing - 95% Complete)

#### Technology Stack
- **Language**: Go 1.24+ with structured logging and error handling
- **Framework**: GoFiber v2.52+ with custom middleware pipeline
- **ORM**: GORM v1.25.5+ with PostgreSQL driver and custom hooks
- **Authentication**: golang-jwt/jwt v5.3.0 with RS256 algorithm
- **Caching**: go-redis v9.4+ with connection pooling and failover
- **Monitoring**: Prometheus client v1.23+ with custom metrics

#### Service Architecture Pattern

```go
// Clean Architecture Implementation
type ServiceLayer struct {
    Controllers    map[string]Controller
    Services       map[string]BusinessService
    Repositories   map[string]Repository
    Middleware     []MiddlewareFunc
}

// Multi-Tenant Request Context
type RequestContext struct {
    TenantID    uuid.UUID
    UserID      uuid.UUID
    Permissions []Permission
    TraceID     string
}

// Repository Pattern with Tenant Isolation
type Repository interface {
    Create(ctx RequestContext, entity interface{}) error
    FindByID(ctx RequestContext, id uuid.UUID) (interface{}, error)
    FindWithFilters(ctx RequestContext, filters map[string]interface{}) ([]interface{}, error)
    Update(ctx RequestContext, id uuid.UUID, updates map[string]interface{}) error
    Delete(ctx RequestContext, id uuid.UUID) error
}
```

#### Middleware Pipeline (Implemented)

```go
// Middleware execution order (critical for security)
app.Use(middleware.CORS())
app.Use(middleware.Logger())
app.Use(middleware.Recover())
app.Use(middleware.SecurityHeaders())
app.Use(middleware.InputValidation())
app.Use(middleware.RateLimit(redis.Client))
app.Use(middleware.Authentication(jwtSecret))
app.Use(middleware.TenantIsolation())
app.Use(middleware.AuditLogging())
app.Use(middleware.Metrics(prometheus.Registry))
```

#### Current API Endpoints (Implemented)

| Service | Endpoint | Method | Authentication | Status |
|---------|----------|---------|----------------|--------|
| **Authentication** | `/api/v1/auth/signup` | POST | ❌ | ✅ |
| **Authentication** | `/api/v1/auth/login` | POST | ❌ | ✅ |
| **Authentication** | `/api/v1/auth/refresh` | POST | ❌ | ✅ |
| **Authentication** | `/api/v1/auth/logout` | POST | ✅ | ✅ |
| **User Management** | `/api/v1/users/me` | GET/PUT | ✅ | ✅ |
| **User Management** | `/api/v1/users/me/stats` | GET | ✅ | ✅ |
| **User Management** | `/api/v1/users/me/avatar` | POST | ✅ | ✅ |
| **Quest Management** | `/api/v1/quests` | GET/POST | ✅ | ✅ |
| **Quest Management** | `/api/v1/quests/{id}` | GET/PUT/DELETE | ✅ | ✅ |
| **Quest Progress** | `/api/v1/quests/progress/*` | Various | ✅ | ✅ |

### Learning Management Service (New - 0% Complete)

#### Service Design
```go
type LMSService struct {
    CourseRepository     Repository
    LessonRepository     Repository
    AssessmentRepository Repository
    EnrollmentRepository Repository
    GradingEngine       GradingEngine
    CertificateService  CertificateService
}

// Course Management APIs (To Be Implemented)
type CourseAPI struct {
    CreateCourse(ctx RequestContext, course CourseRequest) (*CourseResponse, error)
    GetCourse(ctx RequestContext, courseID uuid.UUID) (*CourseResponse, error)
    UpdateCourse(ctx RequestContext, courseID uuid.UUID, updates CourseUpdateRequest) error
    DeleteCourse(ctx RequestContext, courseID uuid.UUID) error
    ListCourses(ctx RequestContext, filters CourseFilters) (*PaginatedCourses, error)
}
```

#### Assessment Engine Architecture
```go
type AssessmentEngine struct {
    QuestionBank    QuestionRepository
    GradingRules    []GradingRule
    AntiCheatEngine AntiCheatService
    ProctorService  ProctorService
}

// Assessment Types
type AssessmentType string
const (
    MultipleChoice AssessmentType = "multiple_choice"
    TrueFalse     AssessmentType = "true_false"
    Essay         AssessmentType = "essay"
    CodeReview    AssessmentType = "code_review"
    PeerReview    AssessmentType = "peer_review"
    ProjectSubmission AssessmentType = "project_submission"
)

// Grading Strategy
type GradingStrategy interface {
    Grade(submission AssessmentSubmission) (*Grade, error)
    CanAutoGrade() bool
}
```

### Media Streaming Service (New - 0% Complete)

#### Video Streaming Architecture
```go
type MediaStreamingService struct {
    UploadService      VideoUploadService
    TranscodingService TranscodingService
    StreamingService   StreamingService
    CDNService        CDNService
    LiveStreamService  LiveStreamService
}

// Video Processing Pipeline
type VideoProcessingPipeline struct {
    Steps []ProcessingStep
}

type ProcessingStep interface {
    Process(video *Video) (*Video, error)
    GetOutputFormats() []VideoFormat
}

// Implemented Processing Steps
var DefaultPipeline = VideoProcessingPipeline{
    Steps: []ProcessingStep{
        &VideoValidationStep{},      // Validate format, duration, content
        &TranscodingStep{},          // Generate multiple bitrates
        &ThumbnailGenerationStep{}, // Create video thumbnails
        &MetadataExtractionStep{},   // Extract video metadata
        &CDNUploadStep{},           // Upload to CDN
        &DatabaseUpdateStep{},       // Update video record
    },
}
```

#### Live Streaming Infrastructure
```go
type LiveStreamingService struct {
    RTMPIngestionServers []RTMPServer
    WebRTCSignalServer   WebRTCSignalServer
    StreamMultiplexer    StreamMultiplexer
    DVRService          DVRService
    ChatService         ChatService
}

// WebRTC Configuration
type WebRTCConfig struct {
    ICEServers []ICEServer
    CodecPreferences []Codec
    BitrateSettings BitrateConfig
    RecordingEnabled bool
}
```

### Real-Time Communication Service (New - 0% Complete)

#### WebSocket Connection Management
```go
type RealtimeCommunicationService struct {
    ConnectionManager  *ConnectionManager
    MessageRouter      MessageRouter
    PresenceService    PresenceService
    NotificationService NotificationService
    ChatService        ChatService
}

type ConnectionManager struct {
    Connections sync.Map // map[userID]*WebSocketConnection
    Rooms       sync.Map // map[roomID]*Room
    Hub         *Hub     // Central message hub
}

// Message Types
type MessageType string
const (
    ChatMessage        MessageType = "chat_message"
    PresenceUpdate    MessageType = "presence_update"
    QuestProgress     MessageType = "quest_progress"
    Notification      MessageType = "notification"
    SystemAnnouncement MessageType = "system_announcement"
)
```

#### Push Notification Architecture
```go
type PushNotificationService struct {
    Providers map[string]NotificationProvider
    Templates map[string]NotificationTemplate
    Scheduler NotificationScheduler
    Analytics NotificationAnalytics
}

type NotificationProvider interface {
    Send(notification *Notification) error
    GetDeliveryStatus(notificationID string) (*DeliveryStatus, error)
    SupportsBulkSending() bool
}

// Supported Providers
var SupportedProviders = []NotificationProvider{
    &FCMProvider{},      // Firebase Cloud Messaging
    &APNSProvider{},     // Apple Push Notification Service
    &EmailProvider{},    // SMTP/SendGrid
    &SMSProvider{},      // Twilio/AWS SNS
    &WebPushProvider{},  // Web Push Protocol
}
```

### Marketplace Service (New - 0% Complete)

#### E-commerce Architecture
```go
type MarketplaceService struct {
    ProductService    ProductService
    WalletService     WalletService
    PaymentService    PaymentService
    OrderService      OrderService
    EscrowService     EscrowService
}

// Wallet System with Escrow
type WalletService struct {
    WalletRepository    Repository
    TransactionRepository Repository
    EscrowRepository    Repository
    PaymentGateways     map[string]PaymentGateway
}

type PaymentGateway interface {
    CreatePayment(amount Money, metadata map[string]string) (*Payment, error)
    CapturePayment(paymentID string) error
    RefundPayment(paymentID string, amount Money) error
    GetPaymentStatus(paymentID string) (*PaymentStatus, error)
}
```

#### Property Management Integration
```go
type PropertyService struct {
    PropertyRepository PropertyRepository
    LocationService    LocationService
    SearchService     SearchService
    VerificationService VerificationService
}

// Property Search Architecture
type PropertySearchService struct {
    PostgreSQLSearch *PostgreSQLSearchEngine  // Basic search
    RedisSearch      *RedisSearchEngine       // Fast autocomplete
    ElasticSearch    *ElasticSearchEngine     // Advanced filtering (optional)
}
```

---

## 📱 Frontend Architecture Specification

### React Native Mobile Application (Existing - 90% Complete)

#### Technology Stack
- **Framework**: React Native 0.79.5 with Expo 53 managed workflow
- **UI Library**: React Native Reusables (31 components, shadcn/ui port)
- **Styling**: NativeWind 4.1.23 (Tailwind CSS for React Native)
- **Navigation**: Expo Router v6 with file-based routing
- **State Management**: React Context + useReducer (with React Query planned)
- **Type Safety**: TypeScript 5.x with strict configuration
- **Testing**: Jest + React Native Testing Library

#### Application Architecture

```typescript
// App Structure (Implemented)
app/
├── (auth)/                    // Authentication screens
│   ├── sign-in.tsx           // ✅ Implemented
│   ├── sign-up.tsx           // ✅ Implemented
│   └── forgot-password.tsx   // ✅ Implemented
├── (tabs)/                   // Main application tabs
│   ├── _layout.tsx          // ✅ Tab navigation
│   ├── index.tsx            // ✅ Home/Dashboard
│   ├── quests/              // ✅ Quest management
│   │   ├── index.tsx        // ✅ Quest listing
│   │   └── [id].tsx         // ✅ Quest details
│   └── profile/             // ✅ User profile
│       ├── index.tsx        // ✅ Profile view
│       └── edit.tsx         // ✅ Profile editing
├── +html.tsx                // ✅ Web support
└── _layout.tsx              // ✅ Root layout
```

#### State Management Architecture (To Be Enhanced)

```typescript
// Global State Management (React Query + Context)
type AppState = {
  user: User | null;
  tenant: TenantConfig;
  preferences: UserPreferences;
  offline: OfflineState;
  cache: CacheState;
};

// API Client with Offline Support
class APIClient {
  private baseURL: string;
  private storage: SecureStorage;
  private offlineQueue: OfflineQueue;
  private tokenManager: TokenManager;
  
  async request<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    // Implementation includes:
    // - Automatic token refresh
    // - Tenant ID injection
    // - Offline queue management
    // - Response caching
    // - Error handling
  }
}

// Offline-First Architecture
class OfflineFirstService {
  private localDB: SQLiteDatabase;
  private syncManager: SyncManager;
  private conflictResolver: ConflictResolver;
  
  // Methods for offline data management
  async syncWithServer(): Promise<SyncResult>;
  async resolveConflicts(conflicts: DataConflict[]): Promise<void>;
  async queueForUpload(data: any): Promise<void>;
}
```

#### Component Architecture (React Native Reusables)

```typescript
// Implemented UI Components (31 components)
import { Button, Card, Input, Label } from '@/components/ui';
import { Avatar, Badge, Progress } from '@/components/ui';
import { Dialog, Sheet, Toast } from '@/components/ui';

// Custom Components (To Be Enhanced)
type QuestCard = {
  quest: Quest;
  progress?: QuestProgress;
  onStart: () => void;
  onContinue: () => void;
};

type GamificationProgress = {
  level: number;
  xp: number;
  points: number;
  nextLevelXP: number;
  achievements: Achievement[];
};
```

### Progressive Web Application (New - 0% Complete)

#### PWA Architecture
```typescript
// Service Worker Implementation
class PWAServiceWorker {
  private cacheStrategy: CacheStrategy;
  private pushManager: PushManager;
  private backgroundSync: BackgroundSyncManager;
  
  // Offline-first caching strategy
  async handleRequest(request: Request): Promise<Response> {
    // Network-first for API calls
    // Cache-first for static assets
    // Stale-while-revalidate for dynamic content
  }
}

// Web-specific optimizations
const webOptimizations = {
  codesplitting: true,           // Route-based code splitting
  lazyLoading: true,            // Component lazy loading
  prefetching: true,            // Link prefetching
  compression: 'gzip',          // Asset compression
  bundleAnalysis: true,         // Webpack bundle analyzer
};
```

---

## 🗄️ Database Architecture Specification

### Multi-Tenant Database Design (Existing - 95% Complete)

#### Schema Architecture
```sql
-- Base Model Pattern (Implemented in all tables)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Multi-tenant base structure
CREATE TABLE base_model (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP NULL
);

-- Tenant isolation indexes (Critical for performance)
CREATE INDEX CONCURRENTLY idx_tenant_isolation 
ON {table_name} (tenant_id, deleted_at) 
WHERE deleted_at IS NULL;
```

#### Core Tables (Implemented)

```sql
-- Users table (✅ Implemented)
CREATE TABLE users (
    LIKE base_model INCLUDING ALL,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'Student',
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    points INTEGER DEFAULT 0,
    total_xp_earned INTEGER DEFAULT 0,
    total_points_earned INTEGER DEFAULT 0,
    avatar_url TEXT,
    email_verified BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP
);

-- Quests table (✅ Implemented)
CREATE TABLE quests (
    LIKE base_model INCLUDING ALL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    difficulty VARCHAR(20) DEFAULT 'beginner',
    xp_reward INTEGER DEFAULT 0,
    points_reward INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft',
    max_attempts INTEGER DEFAULT 0,
    time_limit INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    required_level INTEGER DEFAULT 1,
    estimated_hours DECIMAL(4,2),
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    created_by_id UUID REFERENCES users(id),
    total_completions INTEGER DEFAULT 0,
    total_attempts INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    tags JSONB
);
```

#### Expansion Tables (To Be Implemented)

```sql
-- Learning Management System Tables
CREATE TABLE courses (
    LIKE base_model INCLUDING ALL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    difficulty VARCHAR(20) DEFAULT 'beginner',
    price DECIMAL(10,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    duration_hours DECIMAL(6,2),
    instructor_id UUID REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'draft',
    enrollment_count INTEGER DEFAULT 0,
    rating_average DECIMAL(3,2) DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    thumbnail_url TEXT,
    preview_video_url TEXT,
    syllabus JSONB,
    requirements JSONB,
    learning_outcomes JSONB
);

CREATE TABLE lessons (
    LIKE base_model INCLUDING ALL,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    lesson_order INTEGER NOT NULL,
    content_type VARCHAR(50), -- video, text, quiz, assignment
    content_url TEXT,
    content_data JSONB,
    duration_minutes INTEGER DEFAULT 0,
    is_preview BOOLEAN DEFAULT FALSE,
    is_required BOOLEAN DEFAULT TRUE
);

-- Video Streaming Tables
CREATE TABLE videos (
    LIKE base_model INCLUDING ALL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    video_type VARCHAR(20), -- live, reel, short, course
    original_url TEXT NOT NULL,
    processed_urls JSONB, -- Different quality versions
    thumbnail_url TEXT,
    duration_seconds INTEGER,
    file_size_bytes BIGINT,
    upload_status VARCHAR(20) DEFAULT 'processing',
    creator_id UUID REFERENCES users(id),
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT TRUE,
    retention_expires TIMESTAMP, -- Based on video type
    metadata JSONB
);

-- Marketplace Tables  
CREATE TABLE products (
    LIKE base_model INCLUDING ALL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    product_type VARCHAR(50), -- course, service, property, digital_good
    price DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    seller_id UUID REFERENCES users(id),
    category VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active',
    inventory_count INTEGER,
    digital_asset_url TEXT,
    shipping_required BOOLEAN DEFAULT FALSE,
    images JSONB,
    specifications JSONB,
    tags JSONB
);

CREATE TABLE wallets (
    LIKE base_model INCLUDING ALL,
    user_id UUID REFERENCES users(id) UNIQUE,
    balance DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    locked_balance DECIMAL(15,2) DEFAULT 0, -- For escrow
    total_earned DECIMAL(15,2) DEFAULT 0,
    total_spent DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active'
);

-- Property Management Tables
CREATE TABLE properties (
    LIKE base_model INCLUDING ALL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    property_type VARCHAR(50), -- residential, commercial, land
    listing_type VARCHAR(20), -- rent, sale
    price DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    address TEXT NOT NULL,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    area_sqft INTEGER,
    bedrooms INTEGER,
    bathrooms INTEGER,
    amenities JSONB,
    images JSONB,
    virtual_tour_url TEXT,
    status VARCHAR(20) DEFAULT 'available',
    owner_id UUID REFERENCES users(id),
    agent_id UUID REFERENCES users(id),
    verification_status VARCHAR(20) DEFAULT 'pending'
);
```

#### Database Performance Optimizations

```sql
-- Indexing Strategy
-- 1. Tenant isolation (Most critical)
CREATE INDEX CONCURRENTLY ON users (tenant_id, deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY ON quests (tenant_id, status, is_public) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY ON courses (tenant_id, status, category) WHERE deleted_at IS NULL;

-- 2. Query optimization
CREATE INDEX CONCURRENTLY ON quests (category, difficulty, required_level);
CREATE INDEX CONCURRENTLY ON videos (video_type, upload_status, creator_id);
CREATE INDEX CONCURRENTLY ON properties (property_type, listing_type, latitude, longitude);

-- 3. Full-text search
CREATE INDEX CONCURRENTLY gin_quests_search ON quests USING gin(to_tsvector('english', title || ' ' || description));
CREATE INDEX CONCURRENTLY gin_courses_search ON courses USING gin(to_tsvector('english', title || ' ' || description));

-- 4. JSONB indexes for flexible queries
CREATE INDEX CONCURRENTLY gin_quests_tags ON quests USING gin(tags);
CREATE INDEX CONCURRENTLY gin_videos_metadata ON videos USING gin(metadata);
```

### Redis Caching Strategy (Existing - 90% Complete)

#### Cache Patterns
```go
// Implemented Cache Keys and TTL Strategy
type CacheKeys struct {
    UserProfile      string // "user:profile:{userID}" - TTL: 15min
    UserStats        string // "user:stats:{userID}" - TTL: 5min
    QuestDetails     string // "quest:{questID}" - TTL: 30min
    QuestLeaderboard string // "quest:leaderboard:{questID}" - TTL: 5min
    RateLimiting     string // "rate_limit:{userID}:{endpoint}" - TTL: 1min
    SessionData      string // "session:{sessionID}" - TTL: 1hour
}

// Cache Invalidation Strategy
type CacheInvalidation struct {
    UserUpdate    []string // Invalidate user profile, stats
    QuestUpdate   []string // Invalidate quest details, leaderboards
    ProgressUpdate []string // Invalidate user stats, quest leaderboards
}
```

#### Expansion Cache Patterns (To Be Implemented)
```go
// Course and Learning Cache
type LearningCacheKeys struct {
    CourseDetails    string // "course:{courseID}" - TTL: 1hour
    LessonContent    string // "lesson:{lessonID}" - TTL: 2hours
    UserEnrollments  string // "user:enrollments:{userID}" - TTL: 30min
    CourseProgress   string // "user:course_progress:{userID}:{courseID}" - TTL: 15min
}

// Media Streaming Cache
type MediaCacheKeys struct {
    VideoMetadata    string // "video:{videoID}" - TTL: 1hour
    StreamingURLs    string // "video:streams:{videoID}" - TTL: 6hours
    UserPlaylists    string // "user:playlists:{userID}" - TTL: 30min
    LiveStreamInfo   string // "livestream:{streamID}" - TTL: 5min
}
```

---

## 🔐 Security Architecture Specification

### Authentication & Authorization (Existing - 95% Complete)

#### JWT Token Strategy
```go
// JWT Configuration (Implemented)
type JWTConfig struct {
    Algorithm        string        // RS256 for production
    AccessTokenTTL   time.Duration // 1 hour (configurable)
    RefreshTokenTTL  time.Duration // 30 days (configurable)
    Issuer          string        // "quester-platform"
    Audience        string        // "quester-users"
    PrivateKeyPath  string        // RSA private key
    PublicKeyPath   string        // RSA public key
}

// Token Claims Structure
type TokenClaims struct {
    UserID    uuid.UUID `json:"user_id"`
    TenantID  uuid.UUID `json:"tenant_id"`
    Role      string    `json:"role"`
    Permissions []string `json:"permissions"`
    SessionID string    `json:"session_id"`
    jwt.RegisteredClaims
}
```

#### Multi-Factor Authentication (To Be Implemented)
```go
type MFAService struct {
    SMSProvider    SMSProvider    // Twilio/AWS SNS
    TOTPService    TOTPService    // Time-based OTP
    EmailProvider  EmailProvider  // SMTP/SendGrid
}

type MFAMethod string
const (
    MFA_SMS   MFAMethod = "sms"
    MFA_TOTP  MFAMethod = "totp"
    MFA_EMAIL MFAMethod = "email"
)

// MFA Challenge Flow
type MFAChallenge struct {
    ChallengeID string    `json:"challenge_id"`
    Method      MFAMethod `json:"method"`
    ExpiresAt   time.Time `json:"expires_at"`
    Verified    bool      `json:"verified"`
}
```

### API Security (Existing - 90% Complete)

#### Input Validation Middleware (Implemented)
```go
type SecurityMiddleware struct {
    SQLInjectionPrevention bool
    XSSPrevention         bool
    PathTraversalPrevention bool
    CSRFProtection        bool
    ContentTypeValidation bool
}

// Implemented Security Headers
var SecurityHeaders = map[string]string{
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options":       "DENY",
    "X-XSS-Protection":      "1; mode=block",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Content-Security-Policy": "default-src 'self'",
    "Referrer-Policy":       "strict-origin-when-cross-origin",
}
```

#### Rate Limiting Strategy (Implemented)
```go
type RateLimitConfig struct {
    WindowSize    time.Duration // 1 minute
    RequestLimit  int          // 100 requests
    BurstLimit    int          // 10 requests
    KeyGenerator  func(*fiber.Ctx) string
}

// Rate Limiting Rules
var RateLimitRules = map[string]RateLimitConfig{
    "global":      {WindowSize: 1*time.Minute, RequestLimit: 100},
    "auth":        {WindowSize: 15*time.Minute, RequestLimit: 5},
    "upload":      {WindowSize: 1*time.Hour, RequestLimit: 50},
    "api_heavy":   {WindowSize: 1*time.Minute, RequestLimit: 20},
}
```

### Data Privacy & Compliance (To Be Enhanced)

#### GDPR/Privacy Compliance
```go
type PrivacyService struct {
    DataProcessor     DataProcessor
    ConsentManager    ConsentManager
    DataRetention     DataRetentionService
    AnonymizationService AnonymizationService
}

// Data Processing Lawful Bases
type LawfulBasis string
const (
    Consent           LawfulBasis = "consent"
    Contract          LawfulBasis = "contract"
    LegalObligation   LawfulBasis = "legal_obligation"
    VitalInterests    LawfulBasis = "vital_interests"
    PublicTask        LawfulBasis = "public_task"
    LegitimateInterests LawfulBasis = "legitimate_interests"
)
```

#### SOC 2 Compliance Framework
```go
type SOC2Controls struct {
    SecurityControls     []SecurityControl
    AvailabilityControls []AvailabilityControl
    ProcessingControls   []ProcessingControl
    ConfidentialityControls []ConfidentialityControl
    PrivacyControls      []PrivacyControl
}

// Audit Logging (Enhanced)
type AuditLog struct {
    EventID     uuid.UUID `json:"event_id"`
    TenantID    uuid.UUID `json:"tenant_id"`
    UserID      uuid.UUID `json:"user_id"`
    Action      string    `json:"action"`
    Resource    string    `json:"resource"`
    Timestamp   time.Time `json:"timestamp"`
    IPAddress   string    `json:"ip_address"`
    UserAgent   string    `json:"user_agent"`
    Result      string    `json:"result"` // success, failure, error
    Details     map[string]interface{} `json:"details"`
}
```

---

## 🚀 Performance Architecture Specification

### Caching Strategy (Existing - 90% Complete)

#### Multi-Layer Caching
```go
// L1 Cache: Application Memory (In-Process)
type InMemoryCache struct {
    cache *bigcache.BigCache
    TTL   time.Duration // 5 minutes
}

// L2 Cache: Redis (Shared)
type RedisCache struct {
    client    *redis.Client
    keyPrefix string
    TTL       time.Duration // 15 minutes
}

// L3 Cache: Database Query Cache
type DatabaseCache struct {
    preparedStatements map[string]*sql.Stmt
    queryCache        *lru.Cache
}
```

#### Performance Monitoring (Implemented)
```go
// Prometheus Metrics (Implemented)
type Metrics struct {
    HTTPRequestDuration   *prometheus.HistogramVec
    HTTPRequestsTotal     *prometheus.CounterVec
    DatabaseConnections   prometheus.Gauge
    CacheHitRatio        *prometheus.GaugeVec
    ActiveUsers          prometheus.Gauge
}

// Key Performance Indicators
var KPIs = map[string]float64{
    "api_response_time_p95": 200, // milliseconds
    "cache_hit_ratio":       0.85, // 85%
    "database_conn_usage":   0.70, // 70%
    "error_rate":           0.01, // 1%
}
```

### Database Optimization (Existing - 85% Complete)

#### Connection Pooling (Implemented)
```go
type DatabaseConfig struct {
    MaxOpenConns    int           // 25 connections
    MaxIdleConns    int           // 5 connections  
    ConnMaxLifetime time.Duration // 1 hour
    ConnMaxIdleTime time.Duration // 15 minutes
}

// Query Optimization Patterns
type QueryOptimization struct {
    PreloadAssociations bool   // Prevent N+1 queries
    SelectSpecificFields bool  // Avoid SELECT *
    UsePagination       bool   // Limit result sets
    IndexHints          bool   // PostgreSQL query hints
}
```

### Scalability Architecture (To Be Implemented)

#### Auto-Scaling Configuration
```go
type AutoScalingConfig struct {
    MinInstances     int     // Minimum 2 instances
    MaxInstances     int     // Maximum 50 instances
    TargetCPU       float64 // 70% CPU utilization
    TargetMemory    float64 // 80% memory utilization
    ScaleUpPolicy   ScalingPolicy
    ScaleDownPolicy ScalingPolicy
}

// Horizontal Scaling Strategy
type HorizontalScaling struct {
    LoadBalancer    LoadBalancer   // HAProxy/nginx
    ServiceMesh     ServiceMesh    // Istio/Linkerd
    DatabaseSharding DatabaseSharding // By tenant_id
}
```

#### CDN and Asset Optimization
```go
type CDNStrategy struct {
    PrimaryProvider   string // CloudFlare
    SecondaryProvider string // AWS CloudFront
    AssetTypes       map[string]CDNConfig
    CacheRules       []CacheRule
}

var AssetOptimization = map[string]CDNConfig{
    "images":    {TTL: 7*24*time.Hour, Compression: "webp"},
    "videos":    {TTL: 30*24*time.Hour, Compression: "h264"},
    "documents": {TTL: 24*time.Hour, Compression: "gzip"},
    "api":       {TTL: 0, Compression: "gzip"},
}
```

---

## 🔌 Integration Architecture Specification

### External Service Integration

#### Payment Gateway Integration
```go
type PaymentGatewayService struct {
    Providers map[string]PaymentProvider
    Router    PaymentRouter
}

// Pluggable Payment Providers
type PaymentProvider interface {
    CreatePayment(request PaymentRequest) (*Payment, error)
    CapturePayment(paymentID string) error
    RefundPayment(paymentID string, amount decimal.Decimal) error
    GetPaymentStatus(paymentID string) (*PaymentStatus, error)
    HandleWebhook(payload []byte) (*WebhookEvent, error)
}

// Implemented Providers
var PaymentProviders = map[string]PaymentProvider{
    "razorpay": &RazorpayProvider{},
    "upi":      &UPIProvider{},
    "stripe":   &StripeProvider{},   // Future
    "paypal":   &PayPalProvider{},   // Future
}
```

#### Social Media Integration
```go
type SocialMediaService struct {
    Platforms map[string]SocialPlatform
}

type SocialPlatform interface {
    ShareContent(content ShareableContent) (*ShareResult, error)
    GetOAuthURL(state string) string
    ExchangeCodeForToken(code string) (*OAuthToken, error)
    GetUserProfile(token OAuthToken) (*SocialProfile, error)
}

// Platform Implementations
var SocialPlatforms = map[string]SocialPlatform{
    "facebook": &FacebookProvider{},
    "twitter":  &TwitterProvider{},
    "linkedin": &LinkedInProvider{},
    "whatsapp": &WhatsAppProvider{},
}
```

#### Calendar Integration
```go
type CalendarService struct {
    Providers map[string]CalendarProvider
}

type CalendarProvider interface {
    CreateEvent(event CalendarEvent) (*Event, error)
    UpdateEvent(eventID string, updates EventUpdates) error
    DeleteEvent(eventID string) error
    SyncEvents(timeRange TimeRange) ([]Event, error)
}

// Calendar Providers
var CalendarProviders = map[string]CalendarProvider{
    "google":   &GoogleCalendarProvider{},
    "outlook":  &OutlookProvider{},
    "apple":    &AppleCalendarProvider{},
}
```

### Real Estate & Property Integration
```go
type PropertyIntegrationService struct {
    MLSProviders    map[string]MLSProvider
    VerificationService PropertyVerificationService
    LocationService LocationService
}

type MLSProvider interface {
    SearchProperties(criteria SearchCriteria) ([]Property, error)
    GetPropertyDetails(mlsID string) (*PropertyDetails, error)
    SyncListings() error
}
```

---

## 📊 Analytics & Observability Architecture

### Application Performance Monitoring (To Be Enhanced)

#### Observability Stack
```go
type ObservabilityStack struct {
    Metrics MetricsService    // Prometheus + Grafana
    Logging LoggingService    // ELK Stack
    Tracing TracingService    // Jaeger/OpenTelemetry
    APM     APMService        // DataDog/New Relic
}

// Distributed Tracing
type TracingService struct {
    Tracer        opentracing.Tracer
    SpanProcessor sdktrace.SpanProcessor
    Exporter      sdktrace.SpanExporter
}

// Custom Metrics
type BusinessMetrics struct {
    UserEngagement    *prometheus.GaugeVec
    QuestCompletions  *prometheus.CounterVec
    CourseEnrollments *prometheus.CounterVec
    RevenueMetrics    *prometheus.GaugeVec
    ContentViews      *prometheus.CounterVec
}
```

#### Analytics Service (To Be Implemented)
```go
type AnalyticsService struct {
    EventCollector    EventCollector
    DataProcessor     DataProcessor
    ReportGenerator   ReportGenerator
    RealTimeDashboard DashboardService
}

type AnalyticsEvent struct {
    EventID       uuid.UUID              `json:"event_id"`
    TenantID      uuid.UUID              `json:"tenant_id"`
    UserID        uuid.UUID              `json:"user_id"`
    EventType     string                 `json:"event_type"`
    Timestamp     time.Time              `json:"timestamp"`
    Properties    map[string]interface{} `json:"properties"`
    SessionID     string                 `json:"session_id"`
    DeviceInfo    DeviceInfo             `json:"device_info"`
}

// Pre-aggregated Analytics
type AnalyticsAggregation struct {
    DailyStats   map[string]DailyStats
    WeeklyStats  map[string]WeeklyStats
    MonthlyStats map[string]MonthlyStats
}
```

---

## 🏗️ Infrastructure & DevOps Architecture

### Container Orchestration (To Be Implemented)

#### Kubernetes Architecture
```yaml
# Deployment Strategy
apiVersion: apps/v1
kind: Deployment
metadata:
  name: quester-core-service
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    spec:
      containers:
      - name: quester-core
        image: quester/core:latest
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-secret
              key: url
```

#### Service Mesh Configuration
```yaml
# Istio Configuration
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: quester-routing
spec:
  http:
  - match:
    - uri:
        prefix: "/api/v1"
    route:
    - destination:
        host: quester-core-service
        port:
          number: 8080
      weight: 90
    - destination:
        host: quester-core-service-canary
        port:
          number: 8080
      weight: 10
```

### CI/CD Pipeline (To Be Enhanced)

#### Build and Deployment Pipeline
```yaml
# GitHub Actions Workflow
name: Build and Deploy
on:
  push:
    branches: [main, develop]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Run Backend Tests
      run: |
        cd server
        go test -v ./... -race -coverprofile=coverage.out
        go tool cover -html=coverage.out -o coverage.html
    - name: Run Frontend Tests
      run: |
        cd client
        npm test -- --coverage --watchAll=false
  
  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
    - name: Build Docker Images
      run: |
        docker build -t quester/core:${{ github.sha }} ./server
        docker build -t quester/client:${{ github.sha }} ./client
    
  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
    - name: Deploy to Production
      run: |
        kubectl set image deployment/quester-core-service \
          quester-core=quester/core:${{ github.sha }}
```

### Security & Secrets Management

#### HashiCorp Vault Integration
```go
type SecretsManager struct {
    VaultClient *vault.Client
    SecretPaths map[string]string
}

// Secret Management
var SecretPaths = map[string]string{
    "database_url":      "secret/data/database/url",
    "jwt_private_key":   "secret/data/jwt/private_key",
    "redis_password":    "secret/data/redis/password",
    "payment_api_keys":  "secret/data/payments/api_keys",
}
```

---

## 📋 Architecture Decision Records (ADRs)

### ADR-001: Multi-Tenant Architecture Pattern
**Status**: ✅ Implemented  
**Decision**: Row-level multi-tenancy with tenant_id in all tables  
**Rationale**: Simpler implementation, better performance than schema-per-tenant  
**Consequences**: Requires careful query scoping, stronger access controls  

### ADR-002: Authentication Strategy
**Status**: ✅ Implemented  
**Decision**: JWT with RS256, refresh token rotation  
**Rationale**: Stateless, scalable, secure with proper key management  
**Consequences**: Requires key rotation, token revocation complexity  

### ADR-003: Database Technology
**Status**: ✅ Implemented  
**Decision**: PostgreSQL as primary database  
**Rationale**: ACID compliance, JSON support, full-text search, proven scalability  
**Consequences**: Single point of failure (mitigated with replication)  

### ADR-004: Caching Strategy
**Status**: ✅ Implemented  
**Decision**: Redis for caching and session storage  
**Rationale**: High performance, data structure variety, persistence options  
**Consequences**: Additional infrastructure complexity, cache invalidation logic  

### ADR-005: Frontend Framework
**Status**: ✅ Implemented  
**Decision**: React Native with Expo for mobile-first approach  
**Rationale**: Code sharing, rapid development, native performance  
**Consequences**: Platform limitations, dependency on Expo ecosystem  

### ADR-006: API Architecture (Pending Implementation)
**Status**: 🚧 Planned  
**Decision**: RESTful APIs with GraphQL for complex queries  
**Rationale**: REST for CRUD operations, GraphQL for data aggregation  
**Consequences**: Dual API maintenance, learning curve for GraphQL  

### ADR-007: Video Streaming Architecture (Pending Implementation)
**Status**: 🚧 Planned  
**Decision**: Multi-CDN with adaptive bitrate streaming  
**Rationale**: Global performance, redundancy, quality optimization  
**Consequences**: Higher complexity, increased costs  

### ADR-008: Real-time Communication (Pending Implementation)
**Status**: 🚧 Planned  
**Decision**: WebSocket for messaging, WebRTC for video calls  
**Rationale**: Low latency, direct peer connections for video  
**Consequences**: Connection management complexity, firewall issues  

---

## 🎯 Implementation Roadmap & Technical Milestones

### Phase 1: Platform Foundation Enhancement (Months 1-3)

#### Epic 1: Security & Multi-Tenant Hardening
**Technical Implementation:**
```go
// Enhanced Security Middleware
func SecurityHardeningMiddleware() fiber.Handler {
    return func(c *fiber.Ctx) error {
        // WAF-like protection
        if err := validateRequestSecurity(c); err != nil {
            return fiber.NewError(400, "Security validation failed")
        }
        
        // Advanced rate limiting
        if err := advancedRateLimit(c); err != nil {
            return fiber.NewError(429, "Rate limit exceeded")
        }
        
        return c.Next()
    }
}

// SOC 2 Compliance Framework
type SOC2Framework struct {
    AuditLogger    *AuditLogger
    AccessControls *AccessControlService
    DataEncryption *EncryptionService
    IncidentResponse *IncidentResponseService
}
```

#### Epic 2: Learning Management System Core
**Database Schema:**
```sql
-- Course and lesson tables implementation
-- Assessment engine with multiple question types
-- Progress tracking with detailed analytics
-- Certificate generation system
```

### Phase 2: Media & Communication (Months 4-6)

#### Epic 3: Video Streaming Infrastructure
**Architecture Components:**
```go
type VideoStreamingService struct {
    Ingest       *RTMPIngestService
    Transcoder   *FFmpegTranscoder
    CDN          *MultiCDNService
    Analytics    *VideoAnalyticsService
}

// Video Processing Pipeline
func (v *VideoStreamingService) ProcessVideo(video *Video) error {
    // 1. Validate and sanitize upload
    // 2. Generate multiple bitrate versions
    // 3. Extract thumbnails and metadata
    // 4. Upload to CDN with global distribution
    // 5. Update database with streaming URLs
    // 6. Generate analytics events
}
```

#### Epic 4: Real-time Communication Engine
**WebSocket Architecture:**
```go
type RealtimeEngine struct {
    Hub            *ConnectionHub
    MessageRouter  *MessageRouter
    PresenceService *PresenceService
    PushService    *PushNotificationService
}

// Connection management with clustering support
type ConnectionHub struct {
    Connections  sync.Map // map[userID]*Connection
    Rooms        sync.Map // map[roomID]*Room
    EventBus     *EventBus
}
```

### Phase 3: Marketplace & Domain Features (Months 7-9)

#### Epic 5: Property Management Integration
**Technical Implementation:**
```go
// Property search with multiple backends
type PropertySearchEngine struct {
    PostgreSQL *PostgreSQLSearchEngine  // Basic search
    Redis      *RedisAutoComplete       // Fast autocomplete
    Elastic    *ElasticSearchEngine     // Advanced filtering
}

// MLS Integration framework
type MLSIntegrationService struct {
    Providers map[string]MLSProvider
    Scheduler *SyncScheduler
}
```

#### Epic 6: Marketplace & Wallet System
**Financial Architecture:**
```go
type MarketplaceFinancials struct {
    WalletService    *WalletService
    EscrowService    *EscrowService
    PaymentGateways  map[string]PaymentGateway
    AccountingService *AccountingService
}

// Blockchain-ready wallet design
type Wallet struct {
    BaseModel
    UserID          uuid.UUID
    Balance         decimal.Decimal
    LockedBalance   decimal.Decimal // For escrow
    Currency        string
    BlockchainAddress string // Future blockchain integration
}
```

### Phase 4: Analytics & Mobile Optimization (Months 10-12)

#### Epic 7: Advanced Analytics Platform
**Data Architecture:**
```go
type AnalyticsPlatform struct {
    EventCollector    *EventCollector
    StreamProcessor   *KafkaProcessor
    DataWarehouse     *ClickHouseService
    MLPipeline       *MLAnalyticsService
    DashboardService *DashboardService
}

// Real-time analytics with machine learning
type MLAnalyticsService struct {
    UserBehaviorModel    *BehaviorPredictionModel
    ContentRecommendation *RecommendationEngine
    ChurnPrediction      *ChurnPredictionModel
    RevenueForecasting   *RevenueModel
}
```

#### Epic 8: Mobile Performance & Offline Optimization
**Offline-First Architecture:**
```typescript
// Advanced offline synchronization
class OfflineSyncService {
    private localDB: SQLiteDatabase;
    private syncQueue: SyncQueue;
    private conflictResolver: ConflictResolver;
    
    async syncWithServer(): Promise<SyncResult> {
        // Bidirectional sync with conflict resolution
        // Incremental sync based on timestamps
        // Batch operations for efficiency
    }
}

// Performance optimization
class PerformanceOptimizer {
    private bundleAnalyzer: BundleAnalyzer;
    private codeSpliiter: CodeSplitter;
    private imageOptimizer: ImageOptimizer;
    
    async optimizeApp(): Promise<OptimizationResult> {
        // Tree shaking and code splitting
        // Image compression and lazy loading
        // Critical path optimization
    }
}
```

---

## ✅ Architecture Validation Checklist

### Technical Architecture Validation

#### ✅ **Scalability Architecture**
- [x] Multi-tenant data isolation implemented
- [x] Database connection pooling configured
- [x] Redis caching strategy implemented
- [x] API pagination implemented
- [ ] Horizontal scaling strategy defined
- [ ] Database sharding plan created
- [ ] CDN integration implemented
- [ ] Load balancing configured

#### ✅ **Security Architecture**
- [x] JWT authentication with refresh tokens
- [x] Input validation and sanitization
- [x] SQL injection prevention
- [x] XSS protection
- [x] Rate limiting implemented
- [x] Audit logging framework
- [ ] MFA implementation
- [ ] OAuth2 social login integration
- [ ] SOC 2 compliance framework

#### ✅ **Performance Architecture**
- [x] Database indexing strategy
- [x] Query optimization patterns
- [x] Prometheus metrics integration
- [x] Caching at multiple layers
- [ ] Real-time performance monitoring
- [ ] APM integration (DataDog/New Relic)
- [ ] CDN optimization
- [ ] Database replication setup

#### ✅ **Integration Architecture**
- [x] RESTful API design
- [x] Standardized error handling
- [x] API versioning strategy
- [ ] GraphQL integration
- [ ] Webhook framework
- [ ] External service integrations
- [ ] Message queue implementation
- [ ] Event-driven architecture

#### ✅ **Mobile Architecture**
- [x] React Native with Expo setup
- [x] Cross-platform UI components
- [x] Offline-first considerations
- [x] Native device integrations planned
- [ ] PWA implementation
- [ ] App store optimization
- [ ] Push notification system
- [ ] Offline synchronization

### Business Architecture Validation

#### ✅ **Multi-Tenant Architecture**
- [x] Tenant isolation at data level
- [x] Tenant-scoped API operations
- [x] Multi-tenant user management
- [ ] Tenant-specific configurations
- [ ] Tenant billing and analytics
- [ ] Tenant branding customization

#### ✅ **Monetization Architecture**
- [ ] Subscription management system
- [ ] Payment gateway integration
- [ ] Marketplace commission tracking
- [ ] Revenue analytics and reporting
- [ ] Pricing model flexibility
- [ ] Invoice and billing automation

---

## 🎯 **Architecture Summary & Recommendations**

### **Current State Assessment: 75% Complete Platform Foundation**
The existing Quester platform demonstrates **exceptional architectural maturity** for a 75% complete system. The multi-tenant Go/GoFiber backend with PostgreSQL/Redis data layer provides a **production-ready foundation** that can scale to support the planned expansion features.

### **Key Architectural Strengths**
1. **Multi-Tenant by Design**: Complete tenant isolation with optimized database patterns
2. **Security-First Approach**: Comprehensive middleware pipeline with JWT, validation, and audit logging
3. **Performance-Optimized**: Redis caching, connection pooling, and Prometheus monitoring
4. **Mobile-First Frontend**: React Native with offline considerations and cross-platform UI

### **Expansion Architecture Strategy**
The remaining 25% implementation follows a **microservices evolution pattern** where new features (LMS, video streaming, real-time communication) are implemented as **modular services** that integrate with the core platform while maintaining architectural consistency.

### **Technical Risk Mitigation**
- **Database Scaling**: Multi-read replicas and connection pooling prevent bottlenecks
- **Real-time Features**: WebSocket clustering and message queuing handle high concurrency
- **Video Streaming**: Multi-CDN strategy ensures global performance and redundancy
- **Payment Processing**: Pluggable gateway architecture reduces vendor lock-in

### **Implementation Priority Recommendations**
1. **Phase 1 Priority**: Complete security hardening and LMS core (Epics 1-2)
2. **Phase 2 Priority**: Video streaming and real-time features (Epics 3-4) 
3. **Phase 3 Priority**: Marketplace and domain-specific features (Epics 5-6)
4. **Phase 4 Priority**: Advanced analytics and mobile optimization (Epics 7-8)

### **Success Criteria**
- **Performance**: <200ms API response times, 99.9% uptime
- **Scalability**: Support 100K+ concurrent users with auto-scaling
- **Security**: SOC 2 Type II certification achieved
- **User Experience**: 4.5+ star mobile app rating with offline capabilities

---

**This comprehensive full-stack architecture specification provides the technical foundation for transforming the existing Quester platform into a market-leading multi-domain gamified learning ecosystem while maintaining quality, performance, and scalability throughout the expansion process.**

---

---

## 🛠️ Implementation Guidelines & Best Practices

### Development Team Onboarding

#### Code Organization Standards

**Backend (Go)**: Follows [golang-standards/project-layout](https://github.com/golang-standards/project-layout)

```
server/
├── cmd/server/              # Application entry point
├── config/                  # Configuration files (YAML)
├── migrations/              # SQL migration files (up/down)
├── scripts/                 # Utility scripts
│   ├── generate-types.sh    # Type generation
│   ├── run-migrations.sh    # Migration runner
│   ├── test-*.sh            # API testing scripts
│   └── seed/                # Database seeding
├── internal/                # Private application code
│   ├── app/                 # DI container, initialization
│   ├── routes/              # Route registration
│   ├── controllers/         # HTTP request handlers
│   ├── services/            # Business logic layer
│   ├── repositories/        # Data access layer
│   ├── models/              # Database models (GORM)
│   └── framework/           # Core framework components
│       ├── core/            # Multi-tenant base model
│       ├── config/          # Config loading
│       ├── database/        # GORM setup, migrations
│       ├── cache/           # Redis client
│       ├── middleware/      # HTTP middleware
│       ├── interfaces/      # DI contracts
│       └── auth/            # JWT utilities
└── tests/                   # Test suites
    ├── unit/                # Unit tests (57.1% coverage)
    ├── integration/         # API integration tests
    ├── e2e/                 # End-to-end tests
    └── performance/         # Performance benchmarks
```

**Frontend (React Native)**: Feature-based component organization

```
client/
├── app/                     # Expo Router (file-based routing)
├── components/              # Feature-based components
│   ├── auth/                # Authentication (9 components)
│   ├── gamification/        # Gamification (6 components)
│   ├── LMS/                 # Learning Management (5 components)
│   ├── marketplace/         # Marketplace (6 components)
│   ├── social/              # Social features (7 components)
│   ├── video/               # Video streaming (10 components)
│   └── ui/                  # shadcn/ui base components (31)
├── lib/                     # Utilities and theme
└── assets/                  # Static assets
```

**Key Paths**:
- Migrations: `server/migrations/*.sql` (47 total, latest: 047_uuid_conversion_badges)
- Config: `server/config/*.yaml` (dev, prod overrides)
- Scripts: `server/scripts/` (utilities, testing, seeding)
- Tests: `server/tests/` (unit, integration, e2e, performance)

**Import Standards**:
- Frontend: Always use `@/` alias for imports (e.g., `import { Button } from '@/components/ui/button'`)
- Backend: Use internal package paths (e.g., `import "quester/internal/services"`)


#### Development Workflow
1. **Feature Branch Strategy**: `feature/epic-X-story-Y-description`
2. **Code Review**: Minimum 2 reviewers for architecture changes
3. **Testing Requirements**: >90% coverage for new services
4. **Documentation**: ADR for all architectural decisions
5. **Security Review**: Required for authentication/payment features

#### Quality Gates
```yaml
# .github/workflows/quality-gates.yml
quality_checks:
  - unit_tests: >90% coverage
  - integration_tests: All API endpoints
  - security_scan: SAST + DAST
  - performance_test: <200ms p95 response time
  - accessibility_test: WCAG 2.1 AA compliance
```

### Service Implementation Patterns

#### Standard Service Template
```go
// Service interface pattern
type ServiceInterface interface {
    Create(ctx context.Context, req CreateRequest) (*Response, error)
    Get(ctx context.Context, id uuid.UUID) (*Response, error)
    Update(ctx context.Context, id uuid.UUID, req UpdateRequest) error
    Delete(ctx context.Context, id uuid.UUID) error
    List(ctx context.Context, filters ListFilters) (*PaginatedResponse, error)
}

// Error handling standard
type ServiceError struct {
    Code    string `json:"code"`
    Message string `json:"message"`
    Details map[string]interface{} `json:"details,omitempty"`
}

// Context pattern for request tracing
type RequestContext struct {
    TraceID     string
    TenantID    uuid.UUID
    UserID      uuid.UUID
    Permissions []string
    RequestTime time.Time
}
```

#### Database Migration Standards
```sql
-- Migration naming: YYYYMMDD_HHMMSS_description.sql
-- Example: 20251027_143000_add_courses_table.sql

-- Always include rollback in same file
-- UP
CREATE TABLE courses (
    LIKE base_model INCLUDING ALL,
    title VARCHAR(500) NOT NULL,
    -- ... other fields
);

-- DOWN  
-- DROP TABLE courses;
```

### Monitoring & Alerting Configuration

#### Key Metrics Dashboard
```yaml
# Grafana dashboard configuration
dashboards:
  - name: "Service Health"
    metrics:
      - api_request_duration_p95
      - error_rate_percentage
      - active_database_connections
      - cache_hit_ratio
      - active_websocket_connections
  
  - name: "Business Metrics"
    metrics:
      - user_registrations_per_hour
      - quest_completions_per_hour
      - course_enrollments_per_hour
      - revenue_per_hour
```

#### Alert Rules
```yaml
# Prometheus alerting rules
alerts:
  - name: "High Error Rate"
    condition: "error_rate > 5%"
    duration: "5m"
    severity: "critical"
  
  - name: "Slow API Response"
    condition: "api_p95_latency > 500ms"
    duration: "10m"
    severity: "warning"
    
  - name: "Database Connection Pool Full"
    condition: "db_connections_used / db_connections_max > 0.9"
    duration: "2m"
    severity: "critical"
```

### Security Implementation Checklist

#### Security Hardening Tasks
- [ ] **Input Validation**: Implement comprehensive request validation
- [ ] **Output Encoding**: Prevent XSS with proper encoding
- [ ] **SQL Injection**: Use parameterized queries exclusively
- [ ] **CSRF Protection**: Implement CSRF tokens for state-changing operations
- [ ] **Rate Limiting**: Service-level and user-level rate limiting
- [ ] **Authentication**: MFA implementation with backup codes
- [ ] **Authorization**: Fine-grained RBAC with audit trails
- [ ] **Encryption**: AES-256 for data at rest, TLS 1.3 for transit
- [ ] **Secrets Management**: HashiCorp Vault integration
- [ ] **Vulnerability Scanning**: Automated SAST/DAST in CI/CD

#### Compliance Requirements
```go
// GDPR compliance implementation
type GDPRService struct {
    ConsentManager    *ConsentManager
    DataProcessor     *DataProcessor
    RetentionService  *DataRetentionService
    AnonymizationService *AnonymizationService
}

// SOC 2 audit trail
type AuditEvent struct {
    EventID       uuid.UUID `json:"event_id"`
    TenantID      uuid.UUID `json:"tenant_id"`
    UserID        uuid.UUID `json:"user_id"`
    Action        string    `json:"action"`
    Resource      string    `json:"resource"`
    IPAddress     string    `json:"ip_address"`
    UserAgent     string    `json:"user_agent"`
    Timestamp     time.Time `json:"timestamp"`
    Result        string    `json:"result"`
    RiskScore     int       `json:"risk_score"`
}
```

### Performance Optimization Guidelines

#### Database Performance
```sql
-- Index optimization strategy
CREATE INDEX CONCURRENTLY idx_performance_critical 
ON table_name (tenant_id, status, created_at) 
WHERE deleted_at IS NULL;

-- Query performance patterns
-- ✅ Good: Tenant-scoped with proper indexing
SELECT * FROM quests 
WHERE tenant_id = $1 AND status = 'active' 
AND deleted_at IS NULL 
ORDER BY created_at DESC 
LIMIT 20;

-- ❌ Bad: Missing tenant scope, no proper index
SELECT * FROM quests 
WHERE title LIKE '%search%' 
ORDER BY created_at DESC;
```

#### Caching Strategies
```go
// Cache key patterns
type CacheKeyGenerator struct {
    Prefix string
}

func (c *CacheKeyGenerator) UserProfile(userID uuid.UUID) string {
    return fmt.Sprintf("%s:user:profile:%s", c.Prefix, userID)
}

func (c *CacheKeyGenerator) QuestDetails(questID uuid.UUID) string {
    return fmt.Sprintf("%s:quest:%s", c.Prefix, questID)
}

// Cache invalidation patterns
type CacheInvalidator struct {
    client redis.Cmdable
}

func (c *CacheInvalidator) InvalidateUserData(userID uuid.UUID) error {
    patterns := []string{
        fmt.Sprintf("*:user:profile:%s", userID),
        fmt.Sprintf("*:user:stats:%s", userID),
        fmt.Sprintf("*:user:enrollments:%s", userID),
    }
    
    for _, pattern := range patterns {
        if err := c.invalidatePattern(pattern); err != nil {
            return err
        }
    }
    return nil
}
```

### Testing Strategy Implementation

#### Test Pyramid Structure
```go
// Unit Tests (70% of test suite)
func TestUserService_CreateUser(t *testing.T) {
    // Test business logic in isolation
    // Mock all external dependencies
    // Fast execution (<1ms per test)
}

// Integration Tests (20% of test suite)  
func TestUserAPI_CreateUser(t *testing.T) {
    // Test service integration with database
    // Use test database with transactions
    // Medium execution (<100ms per test)
}

// End-to-End Tests (10% of test suite)
func TestUserFlow_SignupToFirstQuest(t *testing.T) {
    // Test complete user journey
    // Use staging environment
    // Slower execution (<5s per test)
}
```

#### Performance Testing
```yaml
# k6 performance test configuration
scenarios:
  - name: "normal_load"
    executor: "constant-vus"
    vus: 100
    duration: "10m"
    
  - name: "spike_load"
    executor: "ramping-vus"
    stages:
      - { duration: "1m", target: 100 }
      - { duration: "5m", target: 1000 }
      - { duration: "1m", target: 100 }

thresholds:
  - http_req_duration: ["p(95)<200"]
  - http_req_failed: ["rate<0.01"]
```

---

## 📚 Architecture Reference Documentation

### Additional Resources

#### External Documentation Links
- **Go Best Practices**: [Effective Go](https://golang.org/doc/effective_go.html)
- **PostgreSQL Performance**: [PostgreSQL Tuning Guide](https://wiki.postgresql.org/wiki/Tuning_Your_PostgreSQL_Server)
- **Redis Optimization**: [Redis Memory Optimization](https://redis.io/topics/memory-optimization)
- **React Native Performance**: [React Native Performance Guide](https://reactnative.dev/docs/performance)
- **Kubernetes Best Practices**: [K8s Production Best Practices](https://kubernetes.io/docs/setup/best-practices/)

#### Internal Documentation Requirements
- **API Documentation**: OpenAPI 3.0 specifications for all endpoints
- **Database Schema**: Entity relationship diagrams and migration history
- **Deployment Guides**: Step-by-step deployment procedures
- **Troubleshooting Runbooks**: Common issues and resolution steps
- **Monitoring Playbooks**: Alert response procedures

### Knowledge Transfer Plan

#### Architecture Handoff Sessions
1. **Week 1**: System overview and existing architecture deep dive
2. **Week 2**: New services architecture and integration patterns
3. **Week 3**: Database design and performance optimization
4. **Week 4**: Security architecture and compliance requirements
5. **Week 5**: DevOps, monitoring, and deployment strategies

#### Documentation Deliverables
- [ ] Architecture decision records (ADRs)
- [ ] Service interface specifications  
- [ ] Database schema documentation
- [ ] Security implementation guide
- [ ] Performance optimization handbook
- [ ] Monitoring and alerting playbook
- [ ] Deployment automation scripts
- [ ] Team onboarding checklist

---

*Architecture Document Version: 1.0*  
*Completion Status: Ready for Implementation*  
*Next Phase: Begin Epic 1 - Platform Foundation & Security Hardening*  
*Implementation Guidelines: Complete*  
*Ready for Development Team Handoff*