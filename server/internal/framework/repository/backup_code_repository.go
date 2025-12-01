// T076: BackupCodeRepository - Repository for backup code management
// Package: server/internal/repositories
// Purpose: Abstracts database operations for BackupCode model
//
// Created: Phase 7 refactoring to eliminate database.DB global state

package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/models"
	"gorm.io/gorm"
)

// BackupCodeRepository provides data access for backup codes
type BackupCodeRepository struct {
	db *gorm.DB
}

// NewBackupCodeRepository creates a new BackupCodeRepository
func NewBackupCodeRepository(db *gorm.DB) *BackupCodeRepository {
	ValidateDB(db, "BackupCodeRepository")
	return &BackupCodeRepository{db: db}
}

// Create inserts a new backup code
func (r *BackupCodeRepository) Create(ctx context.Context, backupCode *models.BackupCode) error {
	err := r.db.WithContext(ctx).Create(backupCode).Error
	if err != nil {
		return fmt.Errorf("failed to create backup code for user %s: %w", backupCode.UserID, err)
	}
	return nil
}

// FindUnusedByUserID retrieves all unused backup codes for a user
func (r *BackupCodeRepository) FindUnusedByUserID(ctx context.Context, userID uuid.UUID) ([]models.BackupCode, error) {
	var backupCodes []models.BackupCode
	err := r.db.WithContext(ctx).
		Where("user_id = ? AND used = ?", userID, false).
		Find(&backupCodes).Error

	if err != nil {
		return nil, fmt.Errorf("failed to find unused backup codes for user %s: %w", userID, err)
	}
	return backupCodes, nil
}

// Update saves changes to a backup code
func (r *BackupCodeRepository) Update(ctx context.Context, backupCode *models.BackupCode) error {
	err := r.db.WithContext(ctx).Save(backupCode).Error
	if err != nil {
		return fmt.Errorf("failed to update backup code %s: %w", backupCode.ID, err)
	}
	return nil
}

// DeleteByUserID removes all backup codes for a user
func (r *BackupCodeRepository) DeleteByUserID(ctx context.Context, userID uuid.UUID) error {
	err := r.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Delete(&models.BackupCode{}).Error

	if err != nil {
		return fmt.Errorf("failed to delete backup codes for user %s: %w", userID, err)
	}
	return nil
}
