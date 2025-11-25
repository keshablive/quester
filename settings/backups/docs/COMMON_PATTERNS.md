# Common Patterns & Recipes

> **Quick reference** for frequently needed code patterns in the Quester Platform.

## Backend (Go/Fiber)

### Pattern 1: Adding a New CRUD Endpoint

**Steps:**
1. Create model in `internal/models/resource.go`
2. Create repository interface + implementation in `internal/repositories/resource_repository.go`
3. Create service in `internal/services/resource_service.go`
4. Create controller in `internal/controllers/resource_controller.go`
5. Register routes in controller's `RegisterRoutes()`

**Example: Creating a "Lesson" endpoint**

```go
// 1. Model (internal/models/lesson.go)
type Lesson struct {
    BaseModel
    Title       string `json:"title"`
    CourseID    uuid.UUID `json:"course_id"`
    ContentURL  string `json:"content_url"`
}

// 2. Repository Interface (internal/repositories/lesson_repository.go)
type LessonRepository interface {
    Create(ctx context.Context, lesson *models.Lesson) error
    FindByID(ctx context.Context, tenantID, lessonID uuid.UUID) (*models.Lesson, error)
}

// 3. Service (internal/services/lesson_service.go)
func (s *LessonService) CreateLesson(ctx context.Context, tenantID uuid.UUID, lesson *models.Lesson) error {
    lesson.TenantID = tenantID
    return s.repo.Create(ctx, lesson)
}

// 4. Controller (internal/controllers/lesson_controller.go)
func (lc *LessonController) CreateLesson(c *fiber.Ctx) error {
    tenantID, _ := middleware.GetTenantIDFromFiberContext(c)
    var req CreateLessonRequest
    if err := c.BodyParser(&req); err != nil {
        return responses.BadRequest(c, "invalid request")
    }
    // ... rest of implementation
}

// 5. Register Route
lessons.Post("/", middleware.FiberRoleMiddleware(models.RoleInstructor), lc.CreateLesson)
```

### Pattern 2: Adding Background Job/Scheduler

**Location:** `internal/app/app.go` (in `startBackgroundSchedulers()`)

```go
ticker := time.NewTicker(24 * time.Hour)
go func() {
    for range ticker.C {
        if err := yourService.YourScheduledTask(context.Background()); err != nil {
            logger.Error("Task failed", zap.Error(err))
        }
    }
}()
```

### Pattern 3: Adding JWT Claim

**Steps:**
1. Add field to `CustomClaims` in `internal/framework/auth/jwt.go`
2. Set value in `GenerateTokens()` in `internal/services/auth_service.go`
3. Access via `claims.YourField` in middleware or controllers

## Frontend (React Native)

### Pattern 1: Adding a New Screen

**Steps:**
1. Create file in `app/(tabs)/your-screen.tsx`
2. Add tab icon in `app/(tabs)/_layout.tsx`
3. Create corresponding API functions in `lib/api/your-feature.ts`
4. Create hook in `lib/hooks/useYourFeature.ts`

**Example: Adding a "Certificates" Screen**

```tsx
// 1. Screen (app/(tabs)/certificates.tsx)
import { ScreenWrapper } from '@/components/screen-wrapper';
import { useScreenPerformanceMetrics } from '@/lib/hooks/use-performance-metrics';

export default function CertificatesScreen() {
  useScreenPerformanceMetrics('CertificatesScreen');
  
  return (
    <ScreenWrapper screenName="CertificatesScreen">
      <View className="flex-1 bg-background p-4">
        {/* Content */}
      </View>
    </ScreenWrapper>
  );
}

// 2. Register in _layout.tsx
<Tabs.Screen
  name="certificates"
  options={{
    title: 'Certificates',
    tabBarIcon: ({ color }) => <Award size={24} color={color} />,
  }}
/>
```

### Pattern 2: Making API Calls with Error Handling

```typescript
// lib/api/your-feature.ts
export const yourFeatureAPI = {
  getItems: async (): Promise<Item[]> => {
    return await apiClient.get('/items');
  }
};

// lib/hooks/useYourFeature.ts
export function useYourFeature() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await yourFeatureAPI.getItems();
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  return { items, loading, error, loadItems };
}
```

### Pattern 3: Optimistic UI Updates

```typescript
const handleLike = async (id: string) => {
  // Save previous state
  const prev = items.find(i => i.id === id);
  
  // Optimistic update
  setItems(items.map(i => i.id === id ? { ...i, liked: true } : i));
  
  try {
    await api.like(id);
  } catch (err) {
    // Rollback on error
    setItems(items.map(i => i.id === id ? prev! : i));
  }
};
```

## Database Migrations

### Pattern: Adding a New Table

```sql
-- migrations/YYYYMMDDHHMMSS_add_lessons.up.sql
CREATE TABLE lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    title VARCHAR(255) NOT NULL,
    course_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

CREATE INDEX idx_lessons_tenant_id ON lessons(tenant_id);
CREATE INDEX idx_lessons_course_id ON lessons(course_id);
```

```sql
-- migrations/YYYYMMDDHHMMSS_add_lessons.down.sql
DROP TABLE IF EXISTS lessons;
```

## Code Organization Patterns

### Pattern: Splitting Large Files into Modular Components

**When to split:**
- File exceeds 500 lines
- Multiple concerns/domains in one file
- Difficult to test individual components
- Hard to navigate and maintain

**Splitting Strategy:**

#### 1. Service/Class Split (video-stream-manager example)
Split by **technical concern**:
- `types.ts` - Type definitions and enums
- `base-class.ts` - Core logic/orchestrator
- `feature-a.ts` - Feature A implementation
- `feature-b.ts` - Feature B implementation
- `index.ts` - Central exports

**Implementation:**
```typescript
// Before: video-stream-manager.ts (744 lines)
export class VideoStreamManager { /* all logic */ }

// After: Split into modules
// types.ts - Type definitions
export interface QualityLevel { /* ... */ }
export enum StreamState { /* ... */ }

// stream-metrics.ts - Metrics collection
export class StreamMetricsCollector { /* ... */ }

// abr-coordinator.ts - ABR logic
export class ABRCoordinator { /* ... */ }

// stream-manager.ts - Main orchestrator (now 538 lines)
export class VideoStreamManager {
  private metrics: StreamMetricsCollector;
  private abr: ABRCoordinator;
  // Uses extracted components
}

// index.ts - Central exports
export { VideoStreamManager } from './stream-manager';
export { StreamMetricsCollector } from './stream-metrics';
export { ABRCoordinator } from './abr-coordinator';
export { StreamState, StreamEvent } from './types';
export type { QualityLevel, StreamMetrics } from './types';

// Backward compatibility wrapper
// video-stream-manager.ts (42 lines)
export * from './video';
```

#### 2. Hooks Split (useReports example)
Split by **domain/feature**:
- `keys.ts` - Query key factory
- `use-feature-a.ts` - Feature A hooks
- `use-feature-b.ts` - Feature B hooks
- `index.ts` - Unified exports

**Implementation:**
```typescript
// Before: useReports.ts (621 lines)
export function useReports() { /* ... */ }
export function useReportSchedules() { /* ... */ }
export function useDashboards() { /* ... */ }

// After: Split by domain
// keys.ts - Query keys for all domains
export const reportsKeys = {
  reports: () => ['reports', 'list'],
  schedules: () => ['reports', 'schedules'],
  dashboards: () => ['reports', 'dashboards'],
};

// use-reports.ts - Report hooks only
export function useReports() { /* ... */ }
export function useReport(id: string) { /* ... */ }
export function useCreateReport() { /* ... */ }

// use-schedules.ts - Schedule hooks only
export function useReportSchedules() { /* ... */ }
export function useReportSchedule(id: string) { /* ... */ }

// use-dashboards.ts - Dashboard hooks only
export function useDashboards() { /* ... */ }
export function useDashboard(id: string) { /* ... */ }

// index.ts - Unified exports
export { reportsKeys } from './keys';
export * from './use-reports';
export * from './use-schedules';
export * from './use-dashboards';

// Backward compatibility wrapper
// useReports.ts (19 lines)
export * from './reports';
```

#### 3. API Client Split (reports example)
Split by **domain with shared base**:
- `types.ts` - All type definitions
- `base-client.ts` - Shared HTTP client
- `feature-a-client.ts` - Feature A API
- `feature-b-client.ts` - Feature B API
- `index.ts` - Unified client

**Implementation:**
```typescript
// Before: reports.ts (556 lines)
class ReportsAPIClient {
  async createReport() { /* ... */ }
  async createSchedule() { /* ... */ }
  async createDashboard() { /* ... */ }
}

// After: Split by domain
// types.ts - All types
export interface Report { /* ... */ }
export interface ReportSchedule { /* ... */ }
export interface Dashboard { /* ... */ }

// base-client.ts - Shared HTTP logic
export class BaseAPIClient {
  protected async request<T>(endpoint: string) { /* ... */ }
}

// reports-client.ts - Reports API
export class ReportsClient extends BaseAPIClient {
  async createReport() { /* ... */ }
  async getReport(id: string) { /* ... */ }
}

// schedules-client.ts - Schedules API
export class SchedulesClient extends BaseAPIClient {
  async createReportSchedule() { /* ... */ }
}

// dashboards-client.ts - Dashboards API
export class DashboardsClient extends BaseAPIClient {
  async createDashboard() { /* ... */ }
}

// index.ts - Unified client
export * from './types';

class ReportsAPIClient {
  private reports = new ReportsClient();
  private schedules = new SchedulesClient();
  private dashboards = new DashboardsClient();
  
  // Delegate to specialized clients
  createReport(...args: Parameters<ReportsClient['createReport']>) {
    return this.reports.createReport(...args);
  }
}

export const reportsAPI = new ReportsAPIClient();

// Backward compatibility wrapper
// reports.ts (23 lines)
export * from './reports';
export { reportsAPI, default } from './reports';
```

**Key Principles:**
1. **Backward Compatibility:** Old imports continue working via re-exports
2. **Single Responsibility:** Each file handles one concern/domain
3. **Clear Boundaries:** Explicit separation of types, logic, and API
4. **Testability:** Each module independently testable
5. **Progressive Enhancement:** Can import specific modules or unified exports

**File Size Guidelines:**
- Types/interfaces: < 200 lines
- Utility modules: < 150 lines
- Feature modules: < 250 lines
- Main orchestrators: < 600 lines (after extraction)
- Index files: < 150 lines

