// Audit logging service for security events
package services

import (
	"context"
	"fmt"
	"log"

	"github.com/google/uuid"
	"github.com/yourusername/quester/internal/framework/database"
	"github.com/yourusername/quester/internal/models"
)

// AuditLogService handles security audit logging
type AuditLogService struct {
	// Uses global database.DB
}

// NewAuditLogService creates a new audit log service instance
func NewAuditLogService() *AuditLogService {
	return &AuditLogService{}
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

		// Ensure DB is initialized before attempting insert (graceful no-op in unit tests)
		if database.DB == nil {
			log.Printf("WARN: Audit log insert skipped (database not initialized)")
			return
		}

		if err := database.DB.WithContext(asyncCtx).Create(auditLog).Error; err != nil {
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
func (s *AuditLogService) GetViolationsByUser(ctx context.Context, userID uuid.UUID, limit int) ([]*models.AuditLog, error) {
	var logs []*models.AuditLog

	query := database.DB.WithContext(ctx).
		Where("user_id = ?", userID).
		Order("created_at DESC")

	if limit > 0 {
		query = query.Limit(limit)
	}

	if err := query.Find(&logs).Error; err != nil {
		return nil, fmt.Errorf("failed to retrieve violations by user: %w", err)
	}

	return logs, nil
}

// GetViolationsByTenant retrieves audit logs for a specific tenant
// Useful for tenant admin dashboards and security monitoring
func (s *AuditLogService) GetViolationsByTenant(ctx context.Context, tenantID uuid.UUID, limit int) ([]*models.AuditLog, error) {
	var logs []*models.AuditLog

	query := database.DB.WithContext(ctx).
		Where("attempted_tenant_id = ?", tenantID).
		Order("created_at DESC")

	if limit > 0 {
		query = query.Limit(limit)
	}

	if err := query.Find(&logs).Error; err != nil {
		return nil, fmt.Errorf("failed to retrieve violations by tenant: %w", err)
	}

	return logs, nil
}

// GetRecentViolations retrieves the most recent audit logs
// Useful for real-time security monitoring
func (s *AuditLogService) GetRecentViolations(ctx context.Context, limit int) ([]*models.AuditLog, error) {
	var logs []*models.AuditLog

	query := database.DB.WithContext(ctx).
		Order("created_at DESC")

	if limit > 0 {
		query = query.Limit(limit)
	}

	if err := query.Find(&logs).Error; err != nil {
		return nil, fmt.Errorf("failed to retrieve recent violations: %w", err)
	}

	return logs, nil
}

// CountViolationsByUser counts violations for a user in a time window
// Returns the count for alerting on suspicious activity (> 10/hour = potential attack)
func (s *AuditLogService) CountViolationsByUser(ctx context.Context, userID uuid.UUID, sinceHours int) (int64, error) {
	var count int64

	// Calculate the time threshold
	// Note: This uses "created_at > NOW() - INTERVAL '1 hour'" style queries
	// Adjust syntax for your database (PostgreSQL shown here)
	query := fmt.Sprintf("created_at > NOW() - INTERVAL '%d hours'", sinceHours)

	if err := database.DB.WithContext(ctx).
		Model(&models.AuditLog{}).
		Where("user_id = ?", userID).
		Where(query).
		Count(&count).Error; err != nil {
		return 0, fmt.Errorf("failed to count violations: %w", err)
	}

	return count, nil
}
