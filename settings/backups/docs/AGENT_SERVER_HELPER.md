# Quester Agent Helper: Server (Go/Fiber)

> **Purpose:** This guide provides the strict patterns and snippets required when modifying the Quester backend.
> **Context:** `server/` directory. Go 1.24+, Fiber v2.52+, GORM.

## 1. Core Architecture Pattern
**Strictly follow:** `Controller` -> `Service` -> `Repository` -> `DB`

### 1.1 Controller (`internal/controllers`)
- **Role:** Parse request, validate input, call service, format response.
- **Dependency:** Injected with `Service`.
- **Rules:**
    - NEVER contain business logic.
    - ALWAYS use `middleware.GetTenantIDFromFiberContext(c)`.
    - ALWAYS use `responses.Success` or `responses.Error` helpers.

**Snippet: New Controller Method**
```go
// CreateResource creates a new resource
// POST /api/v1/resources
func (rc *ResourceController) CreateResource(c *fiber.Ctx) error {
    // 1. Tenant Context
    tenantID, ok := middleware.GetTenantIDFromFiberContext(c)
    if !ok {
        return responses.Unauthorized(c, "tenant context missing")
    }

    // 2. Parse Body
    var req CreateResourceRequest
    if err := c.BodyParser(&req); err != nil {
        return responses.BadRequest(c, "invalid request body")
    }

    // 3. Call Service
    result, err := rc.service.Create(c.Context(), tenantID, req)
    if err != nil {
        return responses.HandleServiceError(c, err)
    }

    // 4. Return Success
    return responses.Created(c, result)
}
```

### 1.2 Service (`internal/services`)
- **Role:** Business logic, transaction management, orchestration.
- **Dependency:** Injected with `Repository`.
- **Rules:**
    - Accept `context.Context` and `tenantID` as first args.
    - Return domain models, not DTOs.

**Snippet: New Service Method**
```go
func (s *ResourceService) Create(ctx context.Context, tenantID uuid.UUID, req CreateResourceRequest) (*models.Resource, error) {
    // 1. Validation / Business Logic
    if req.Value < 0 {
        return nil, errors.New("value must be positive")
    }

    // 2. Prepare Model
    resource := &models.Resource{
        TenantID: tenantID,
        Name:     req.Name,
    }

    // 3. Call Repository
    if err := s.repo.Create(ctx, resource); err != nil {
        return nil, err
    }

    return resource, nil
}
```

### 1.3 Repository (`internal/repositories`)
- **Role:** Database access (GORM).
- **Rules:**
    - ALWAYS respect `TenantID`.
    - Use `gorm.DB` with context.

**Snippet: New Repository Method**
```go
func (r *resourceRepository) Create(ctx context.Context, resource *models.Resource) error {
    return r.db.WithContext(ctx).Create(resource).Error
}
```

## 2. Critical Middleware
- **`middleware.FiberAuthMiddleware()`**: Validates JWT. Sets `user_id`, `tenant_id`, `role`.
- **`middleware.FiberRoleMiddleware(models.Role...)`**: Enforces RBAC.
- **`middleware.FiberTenantIsolationMiddleware()`**: Prevents cross-tenant access.

## 3. Database & Models
- **Location:** `internal/models`
- **BaseModel:** All models MUST embed `BaseModel`.
```go
type Resource struct {
    BaseModel
    Name string `json:"name"`
}
```
- **Migrations:** Create SQL files in `internal/migrations`. Format: `YYYYMMDDHHMMSS_description.up.sql`.

## 4. Error Handling
- Use `responses` package helpers.
- **Common Helpers:**
    - `responses.BadRequest(c, msg)`
    - `responses.Unauthorized(c, msg)`
    - `responses.NotFound(c, msg)`
    - `responses.InternalError(c, msg)`

## 5. Testing
- **Unit Tests:** Use `testify/mock` for Service/Repo mocking.
- **Command:** `go test ./internal/services/...`
