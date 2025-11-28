// AuditLog repository implementation
package repositories

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/models"
	"gorm.io/gorm"
)

// AuditLogRepository handles audit log data persistence
type AuditLogRepository struct {
	db *gorm.DB
}

// NewAuditLogRepository creates a new audit log repository
func NewAuditLogRepository(db *gorm.DB) *AuditLogRepository {
	ValidateDB(db, "AuditLogRepository")
	return &AuditLogRepository{db: db}
}

// Create inserts a new audit log entry
func (r *AuditLogRepository) Create(ctx context.Context, auditLog *models.AuditLog) error {
	if err := r.db.WithContext(ctx).Create(auditLog).Error; err != nil {
		return fmt.Errorf("failed to create audit log: %w", err)
	}
	return nil
}

// FindByUserID retrieves audit logs for a specific user
func (r *AuditLogRepository) FindByUserID(ctx context.Context, userID uuid.UUID, limit int) ([]*models.AuditLog, error) {
	var logs []*models.AuditLog

	query := r.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Order("created_at DESC")

	if limit > 0 {
		query = query.Limit(limit)
	}

	if err := query.Find(&logs).Error; err != nil {
		return nil, fmt.Errorf("failed to find audit logs by user: %w", err)
	}

	return logs, nil
}

// FindByAttemptedTenantID retrieves audit logs for a specific attempted tenant
func (r *AuditLogRepository) FindByAttemptedTenantID(ctx context.Context, tenantID uuid.UUID, limit int) ([]*models.AuditLog, error) {
	var logs []*models.AuditLog

	query := r.db.WithContext(ctx).
		Where("attempted_tenant_id = ?", tenantID).
		Order("created_at DESC")

	if limit > 0 {
		query = query.Limit(limit)
	}

	if err := query.Find(&logs).Error; err != nil {
		return nil, fmt.Errorf("failed to find audit logs by tenant: %w", err)
	}

	return logs, nil
}

// FindRecent retrieves the most recent audit logs across all tenants
func (r *AuditLogRepository) FindRecent(ctx context.Context, limit int) ([]*models.AuditLog, error) {
	var logs []*models.AuditLog

	query := r.db.WithContext(ctx).Order("created_at DESC")

	if limit > 0 {
		query = query.Limit(limit)
	}

	if err := query.Find(&logs).Error; err != nil {
		return nil, fmt.Errorf("failed to find recent audit logs: %w", err)
	}

	return logs, nil
}

// CountByUserSince counts violations for a user within a time window
func (r *AuditLogRepository) CountByUserSince(ctx context.Context, userID uuid.UUID, since time.Time) (int64, error) {
	var count int64

	if err := r.db.WithContext(ctx).
		Model(&models.AuditLog{}).
		Where("user_id = ? AND created_at > ?", userID, since).
		Count(&count).Error; err != nil {
		return 0, fmt.Errorf("failed to count violations: %w", err)
	}

	return count, nil
}
