# Framework Layer Violations Analysis

**Date**: Phase 3 - US1 Implementation
**Objective**: Document violations in `internal/framework/` that import application layer code

## Violation Summary

| File | Import | Type | Resolution Strategy |
|------|--------|------|---------------------|
| `internal/framework/interfaces/repository.go` | `github.com/keshablive/quester/internal/models` | Direct import | Define DTOs in framework or use generics |

## Detailed Analysis

### 1. repository.go - models Import

**File**: `server/internal/framework/interfaces/repository.go`
**Line**: 9
**Import**: `"github.com/keshablive/quester/internal/models"`

**Models Used**:
- `models.User` - UserRepository interface
- `models.Quest` - QuestRepository interface  
- `models.Property` - PropertyRepository interface
- `models.Transaction` - TransactionRepository interface
- `models.Badge`, `models.UserBadge` - BadgeRepository interface
- `models.Leaderboard` - LeaderboardRepository interface

**Resolution Options**:

#### Option A: Generic Repository Interfaces (Recommended)
Convert repositories to use Go generics where the model type is a parameter.
This allows the framework to remain independent while implementations specify concrete types.

```go
// Generic repository pattern
type Repository[T any] interface {
    Create(ctx context.Context, entity *T) error
    FindByID(ctx context.Context, id uuid.UUID) (*T, error)
    // ...
}
```

#### Option B: Interface-based Entities
Define entity interfaces in framework that models must implement.
Models package imports framework interfaces, framework stays independent.

```go
// In framework/interfaces/entities.go
type Entity interface {
    GetID() uuid.UUID
    GetTenantID() uuid.UUID
}

type UserEntity interface {
    Entity
    GetEmail() string
    GetRole() string
}
```

#### Option C: DTO Types in Framework
Define DTOs in framework layer, implement mappers in application layer.
Framework uses DTOs, app layer converts between models and DTOs.

## Decision

**Selected**: Option A - Generic Repository Interfaces with Option B fallback

**Rationale**:
1. Generics allow type safety without framework depending on models
2. Entity interfaces provide additional abstraction for complex operations
3. Maintains clean separation of concerns
4. Allows gradual migration without breaking existing code

## Implementation Tasks

- [x] Document violation
- [ ] Create generic base repository interface
- [ ] Define entity interfaces for complex types
- [ ] Update repository interfaces to use generics/interfaces
- [ ] Verify framework builds independently

## Notes

The current architecture violation is contained to a single file. The resolution
should not affect the overall refactoring goals since repository interfaces are
already in the `internal/framework/interfaces/` directory - we just need to 
remove the model dependency.

For this spec (025), we will accept this violation as a known issue and address
it in a future spec focused on repository pattern refinement. The framework
layer is otherwise clean and independent.
