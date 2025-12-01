// T078: AuthAuditLogRepository - Repository for auth audit log management
// Package: server/internal/repositories
// Purpose: Abstracts database operations for auth activity logging (2FA, login, etc.)
//
// Created: Phase 7 refactoring to eliminate database.DB global state
// Note: This is separate from AuditLogRepository which handles tenant violations

package repository

import (
	"context"
	"fmt"

	"github.com/keshablive/quester/internal/models"
	"gorm.io/gorm"
)

// AuthAuditLogRepository provides data access for auth audit logs
type AuthAuditLogRepository struct {
	db *gorm.DB
}

// NewAuthAuditLogRepository creates a new AuthAuditLogRepository
func NewAuthAuditLogRepository(db *gorm.DB) *AuthAuditLogRepository {
	ValidateDB(db, "AuthAuditLogRepository")
	return &AuthAuditLogRepository{db: db}
}

// Create inserts a new auth audit log entry
func (r *AuthAuditLogRepository) Create(ctx context.Context, log *models.AuthAuditLog) error {
	err := r.db.WithContext(ctx).Create(log).Error
	if err != nil {
		return fmt.Errorf("failed to create auth audit log for user %s: %w", log.UserID, err)
	}
	return nil
}
