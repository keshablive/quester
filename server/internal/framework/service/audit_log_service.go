// Audit logging service for security events
package service

import (
	"context"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/models"
	"github.com/keshablive/quester/internal/framework/repository"
)

// AuditLogService handles security audit logging
type AuditLogService struct {
	repo *repository.AuditLogRepository
}

// NewAuditLogService creates a new audit log service instance
// T094: Now accepts AuditLogRepository for dependency injection
func NewAuditLogService(repo *repository.AuditLogRepository) *AuditLogService {
	return &AuditLogService{repo: repo}
}

// LogTenantViolation logs a cross-tenant access attempt
// This is called when a user tries to access a resource in a different tenant
// Implements FR-015: Log and alert on cross-tenant violations
//
// Parameters:
//   - userID: The user who attempted the access
//   - tenantID: The user's actual tenant ID
//   - attemptedTenantID: The tenant ID they tried to access
//   - resourceType: Type of resource (e.g., "quest", "user", "quest_progress")
//   - resourceID: UUID of the specific resource
//   - action: Action attempted (e.g., "read", "write", "delete")
//   - ipAddress: Client IP address
//   - userAgent: Client User-Agent header
//
// This function is non-blocking - it logs asynchronously via goroutine
// Errors are logged but do not propagate to the caller
func (s *AuditLogService) LogTenantViolation(
	ctx context.Context,
	userID uuid.UUID,
	tenantID uuid.UUID,
	attemptedTenantID uuid.UUID,
	resourceType string,
	resourceID uuid.UUID,
	action string,
	ipAddress string,
	userAgent string,
) error {
	// Create audit log entry
	auditLog := &models.AuditLog{
		UserID:            userID,
		TenantID:          tenantID,
		AttemptedTenantID: attemptedTenantID,
		ResourceType:      resourceType,
		ResourceID:        resourceID,
		Action:            action,
		IPAddress:         ipAddress,
		UserAgent:         userAgent,
	}

	// Insert asynchronously to avoid blocking the request
	// The middleware should still return 403 immediately
	go func() {
		// Use background context for async operation
		// The original request context may be cancelled
		asyncCtx := context.Background()

		// T095: Use repository instead of direct database access
		if err := s.repo.Create(asyncCtx, auditLog); err != nil {
			// Log error but don't fail the application
			// Audit logging is important but not critical to functionality
			log.Printf("ERROR: Failed to insert audit log: %v", err)
			log.Printf("  User: %s, Tenant: %s, Attempted: %s, Resource: %s/%s",
				userID, tenantID, attemptedTenantID, resourceType, resourceID)
		}
	}()

	// Return immediately without waiting for database insert
	return nil
}

// GetViolationsByUser retrieves audit logs for a specific user
// Useful for security dashboards and user behavior analysis
// T095: Now uses repository method
func (s *AuditLogService) GetViolationsByUser(ctx context.Context, userID uuid.UUID, limit int) ([]*models.AuditLog, error) {
	return s.repo.FindByUserID(ctx, userID, limit)
}

// GetViolationsByTenant retrieves audit logs for a specific tenant
// Useful for tenant admin dashboards and security monitoring
// T095: Now uses repository method
func (s *AuditLogService) GetViolationsByTenant(ctx context.Context, tenantID uuid.UUID, limit int) ([]*models.AuditLog, error) {
	return s.repo.FindByAttemptedTenantID(ctx, tenantID, limit)
}

// GetRecentViolations retrieves the most recent audit logs
// Useful for real-time security monitoring
// T095: Now uses repository method
func (s *AuditLogService) GetRecentViolations(ctx context.Context, limit int) ([]*models.AuditLog, error) {
	return s.repo.FindRecent(ctx, limit)
}

// CountViolationsByUser counts violations for a user in a time window
// Returns the count for alerting on suspicious activity (> 10/hour = potential attack)
// T095: Now uses repository method with proper time calculation
func (s *AuditLogService) CountViolationsByUser(ctx context.Context, userID uuid.UUID, sinceHours int) (int64, error) {
	// Calculate the time threshold
	since := time.Now().Add(-time.Duration(sinceHours) * time.Hour)
	return s.repo.CountByUserSince(ctx, userID, since)
}
