// Service interface contracts
package interfaces

import (
	"context"

	"github.com/google/uuid"
)

// Service defines the base interface for all business logic services.
// Services encapsulate domain logic and coordinate between repositories and external systems.
type Service interface {
	// HealthCheck returns nil if the service is healthy, or an error describing the issue.
	HealthCheck(ctx context.Context) error
}

// CRUDService defines the standard CRUD operations for entity services.
// T is the entity type, ID is the identifier type (typically uuid.UUID).
//
// All operations are tenant-scoped for multi-tenancy support.
// Use this interface for services that manage a single entity type.
//
// Example implementation:
//
//	type UserService struct {
//	    userRepo interfaces.UserRepository
//	}
//
//	func (s *UserService) Create(ctx context.Context, tenantID uuid.UUID, user *models.User) (*models.User, error) {
//	    return s.userRepo.CreateUser(ctx, tenantID, user)
//	}
type CRUDService[T any, ID any] interface {
	// Create creates a new entity within the specified tenant.
	// Returns the created entity with any server-generated fields populated.
	Create(ctx context.Context, tenantID uuid.UUID, entity *T) (*T, error)

	// Get retrieves an entity by ID within the specified tenant.
	// Returns ErrNotFound if the entity does not exist.
	Get(ctx context.Context, tenantID uuid.UUID, entityID ID) (*T, error)

	// List retrieves all entities matching the filters within the specified tenant.
	// Filters is a map of field names to values for filtering.
	List(ctx context.Context, tenantID uuid.UUID, filters map[string]interface{}) ([]T, error)

	// Update updates an existing entity within the specified tenant.
	// Returns the updated entity or ErrNotFound if it doesn't exist.
	Update(ctx context.Context, tenantID uuid.UUID, entityID ID, updates *T) (*T, error)

	// Delete removes an entity by ID within the specified tenant.
	// Returns ErrNotFound if the entity does not exist.
	Delete(ctx context.Context, tenantID uuid.UUID, entityID ID) error
}

// PaginatedService extends CRUDService with pagination support for list operations.
type PaginatedService[T any, ID any] interface {
	CRUDService[T, ID]

	// ListPaginated retrieves entities with pagination support.
	// Returns the entities, total count, and any error.
	ListPaginated(ctx context.Context, tenantID uuid.UUID, limit, offset int, filters map[string]interface{}) ([]T, int64, error)
}

// TransactionalService defines the interface for services that support transactional operations.
// Use this for services that need to coordinate multiple repository operations atomically.
type TransactionalService interface {
	// WithTransaction executes the provided function within a database transaction.
	// If the function returns an error, the transaction is rolled back.
	// If the function succeeds, the transaction is committed.
	WithTransaction(ctx context.Context, fn func(ctx context.Context) error) error
}

// EventEmitter defines the interface for services that emit domain events.
// Use this for services that need to notify other parts of the system about changes.
type EventEmitter interface {
	// EmitEvent publishes a domain event to registered listeners.
	// eventType is a string identifier for the event (e.g., "user.created").
	// payload contains the event data.
	EmitEvent(ctx context.Context, eventType string, payload interface{}) error
}

// Cacheable defines the interface for services that support caching.
// Use this for services that cache frequently accessed data.
type Cacheable interface {
	// InvalidateCache removes cached data for the specified keys.
	// If no keys are provided, all cache entries for this service are invalidated.
	InvalidateCache(ctx context.Context, keys ...string) error

	// WarmCache pre-populates the cache with frequently accessed data.
	// This is typically called during startup or after cache invalidation.
	WarmCache(ctx context.Context) error
}

// Auditable defines the interface for services that support audit logging.
// Use this for services that manage sensitive data requiring audit trails.
type Auditable interface {
	// GetAuditLog retrieves audit log entries for the specified entity.
	// Returns entries in reverse chronological order (newest first).
	GetAuditLog(ctx context.Context, tenantID uuid.UUID, entityID uuid.UUID, limit int) ([]AuditEntry, error)
}

// AuditEntry represents a single audit log entry.
type AuditEntry struct {
	ID        uuid.UUID              `json:"id"`
	Timestamp int64                  `json:"timestamp"`
	Action    string                 `json:"action"`
	UserID    uuid.UUID              `json:"user_id"`
	EntityID  uuid.UUID              `json:"entity_id"`
	Changes   map[string]interface{} `json:"changes,omitempty"`
	IP        string                 `json:"ip,omitempty"`
	UserAgent string                 `json:"user_agent,omitempty"`
}
