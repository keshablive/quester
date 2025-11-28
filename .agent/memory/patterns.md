# Learned Patterns

This file documents successful patterns learned during Quester Platform development.

## Multi-Tenancy Patterns

### Pattern: TenantID in All Models

**Implementation**:
```go
type Entity struct {
    ID        uuid.UUID `gorm:"type:uuid;primaryKey"`
    TenantID  uuid.UUID `gorm:"type:uuid;not null;index"`
    // ... other fields
}
```

**Rationale**: Constitutional requirement for data isolation

**When to use**: Every GORM model without exception

**Examples**: User, Quest, Achievement, Team

---

### Pattern: TenantID Filtering in Repositories

**Implementation**:
```go
func (r *repository) FindByID(ctx context.Context, tenantID uuid.UUID, id uuid.UUID) (*Model, error) {
    var model Model
    err := r.db.WithContext(ctx).
        Where("id = ? AND tenant_id = ?", id, tenantID).
        First(&model).Error
    return &model, err
}
```

**Rationale**: Ensures queries never access cross-tenant data

**When to use**: Every repository query method

---

### Pattern: JWT Tenant Extraction

**Implementation**:
```go
func (c *Controller) Handler(ctx *fiber.Ctx) error {
    claims := ctx.Locals("claims").(map[string]interface{})
    tenantID, _ := uuid.Parse(claims["tenant_id"].(string))
    userID, _ := uuid.Parse(claims["user_id"].(string))
    
    // Use tenantID in service calls
}
```

**Rationale**: Every request carries tenant context

**When to use**: Every controller handler

---

## Repository Patterns

### Pattern: Repository Interface + Implementation

**Implementation**:
```go
// Interface
type EntityRepository interface {
    Create(ctx context.Context, tenantID uuid.UUID, entity *Entity) error
    FindByID(ctx context.Context, tenantID uuid.UUID, id uuid.UUID) (*Entity, error)
    FindByTenantID(ctx context.Context, tenantID uuid.UUID) ([]*Entity, error)
    Update(ctx context.Context, tenantID uuid.UUID, entity *Entity) error
    Delete(ctx context.Context, tenantID uuid.UUID, id uuid.UUID) error
}

// Implementation
type entityRepository struct {
    db *gorm.DB
}

func NewEntityRepository(db *gorm.DB) EntityRepository {
    return &entityRepository{db: db}
}
```

**Rationale**: Testability, dependency injection, clear contracts

**When to use**: All database access

---

## Service Patterns

### Pattern: Service with Repository Dependency

**Implementation**:
```go
type EntityService struct {
    repo EntityRepository
}

func NewEntityService(repo EntityRepository) *EntityService {
    return &EntityService{repo: repo}
}

func (s *EntityService) Create(ctx context.Context, tenantID uuid.UUID, input *CreateInput) (*Entity, error) {
    // 1. Validate input
    if input.Name == "" {
        return nil, fmt.Errorf("name is required")
    }
    
    // 2. Create entity
    entity := &Entity{Name: input.Name}
    
    // 3. Call repository
    if err := s.repo.Create(ctx, tenantID, entity); err != nil {
        return nil, fmt.Errorf("failed to create entity: %w", err)
    }
    
    return entity, nil
}
```

**Rationale**: Business logic isolation, error wrapping, validation

**When to use**: All business logic

---

## Controller Patterns

### Pattern: Standard Controller Handler

**Implementation**:
```go
func (c *Controller) Create(ctx *fiber.Ctx) error {
    // 1. Extract JWT claims
    claims := ctx.Locals("claims").(map[string]interface{})
    tenantID, _ := uuid.Parse(claims["tenant_id"].(string))
    
    // 2. Parse request body
    var input CreateInput
    if err := ctx.BodyParser(&input); err != nil {
        return ctx.Status(400).JSON(fiber.Map{"error": "Invalid request"})
    }
    
    // 3. Call service
    entity, err := c.service.Create(ctx.Context(), tenantID, &input)
    if err != nil {
        return ctx.Status(500).JSON(fiber.Map{"error": err.Error()})
    }
    
    // 4. Return response
    return ctx.Status(201).JSON(entity)
}
```

**Rationale**: Consistent error handling, standard responses

**When to use**: All HTTP handlers

---

## Client Patterns

### Pattern: TypeScript Type Definitions

**Implementation**:
```typescript
export interface Entity {
  id: string;
  tenantId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEntityInput {
  name: string;
}

export interface UpdateEntityInput {
  name?: string;
}
```

**Rationale**: Type safety, matches server models

**When to use**: All API interactions

---

### Pattern: API Service

**Implementation**:
```typescript
import { apiClient } from '../apiClient';

export const entityService = {
  async create(input: CreateEntityInput): Promise<Entity> {
    const response = await apiClient.post('/api/v1/entities', input);
    return response.data;
  },
  
  async getById(id: string): Promise<Entity> {
    const response = await apiClient.get(`/api/v1/entities/${id}`);
    return response.data;
  },
  
  async list(): Promise<Entity[]> {
    const response = await apiClient.get('/api/v1/entities');
    return response.data;
  },
};
```

**Rationale**: Centralized API access, error handling

**When to use**: All backend communication

---

## Error Handling Patterns

### Pattern: Error Wrapping (Go)

**Implementation**:
```go
if err := someOperation(); err != nil {
    return fmt.Errorf("operation failed: %w", err)
}
```

**Rationale**: Context preservation, error chaining

**When to use**: All error returns

---

### Pattern: Try-Catch for Async (TypeScript)

**Implementation**:
```typescript
try {
  const result = await asyncOperation();
  return result;
} catch (error) {
  console.error('Operation failed:', error);
  throw new Error('User-friendly message');
}
```

**Rationale**: Graceful error handling, user experience

**When to use**: All async operations

---

## State Management Patterns

### Pattern: React Context for Global State

**Implementation**:
```typescript
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  
  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
```

**Rationale**: Avoid prop drilling, global state management

**When to use**: Auth, theme, tenant context

---

## Anti-Patterns to Avoid

### ❌ Missing TenantID Filter

```go
// WRONG - No tenant filter
db.Where("id = ?", id).First(&entity)

// CORRECT
db.Where("id = ? AND tenant_id = ?", id, tenantID).First(&entity)
```

### ❌ Using `any` in TypeScript

```typescript
// WRONG
const data: any = await fetchData();

// CORRECT
interface Data { id: string; name: string; }
const data: Data = await fetchData();
```

### ❌ Ignoring Errors

```go
// WRONG
result, _ := operation()

// CORRECT
result, err := operation()
if err != nil {
    return fmt.Errorf("operation failed: %w", err)
}
```

## References

- Constitution: `.agent/rules/constitution.md`
- Quester Rules: `.agent/rules/quester-ai-rules.md`
- Workflows: `.agent/workflows/quester-ai-workflows.md`
