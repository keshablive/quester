// T075: TwoFactorRepository - Repository for 2FA record management
// Package: server/internal/repositories
// Purpose: Abstracts database operations for User2FA model
//
// Created: Phase 7 refactoring to eliminate database.DB global state

package repositories

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/models"
	"gorm.io/gorm"
)

// TwoFactorRepository provides data access for 2FA records
type TwoFactorRepository struct {
	db *gorm.DB
}

// NewTwoFactorRepository creates a new TwoFactorRepository
func NewTwoFactorRepository(db *gorm.DB) *TwoFactorRepository {
	ValidateDB(db, "TwoFactorRepository")
	return &TwoFactorRepository{db: db}
}

// FindEnabledByUserID retrieves enabled 2FA record for a user
func (r *TwoFactorRepository) FindEnabledByUserID(ctx context.Context, userID uuid.UUID) (*models.User2FA, error) {
	var user2FA models.User2FA
	err := r.db.WithContext(ctx).
		Where("user_id = ? AND enabled = ?", userID, true).
		First(&user2FA).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, err
		}
		return nil, fmt.Errorf("failed to find enabled 2FA for user %s: %w", userID, err)
	}
	return &user2FA, nil
}

// FindByUserID retrieves 2FA record for a user (enabled or disabled)
func (r *TwoFactorRepository) FindByUserID(ctx context.Context, userID uuid.UUID) (*models.User2FA, error) {
	var user2FA models.User2FA
	err := r.db.WithContext(ctx).
		Where("user_id = ?", userID).
		First(&user2FA).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, err
		}
		return nil, fmt.Errorf("failed to find 2FA for user %s: %w", userID, err)
	}
	return &user2FA, nil
}

// Create inserts a new 2FA record
func (r *TwoFactorRepository) Create(ctx context.Context, user2FA *models.User2FA) error {
	err := r.db.WithContext(ctx).Create(user2FA).Error
	if err != nil {
		return fmt.Errorf("failed to create 2FA record for user %s: %w", user2FA.UserID, err)
	}
	return nil
}

// Update saves changes to a 2FA record
func (r *TwoFactorRepository) Update(ctx context.Context, user2FA *models.User2FA) error {
	err := r.db.WithContext(ctx).Save(user2FA).Error
	if err != nil {
		return fmt.Errorf("failed to update 2FA record %s: %w", user2FA.ID, err)
	}
	return nil
}

// Delete removes a 2FA record
func (r *TwoFactorRepository) Delete(ctx context.Context, user2FA *models.User2FA) error {
	err := r.db.WithContext(ctx).Delete(user2FA).Error
	if err != nil {
		return fmt.Errorf("failed to delete 2FA record %s: %w", user2FA.ID, err)
	}
	return nil
}

// GetUserTenantID retrieves just the tenant_id for a user (lightweight query)
func (r *TwoFactorRepository) GetUserTenantID(ctx context.Context, userID uuid.UUID) (uuid.UUID, error) {
	var user models.User
	err := r.db.WithContext(ctx).
		Select("tenant_id").
		Where("id = ?", userID).
		First(&user).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return uuid.Nil, fmt.Errorf("user %s not found", userID)
		}
		return uuid.Nil, fmt.Errorf("failed to get tenant ID for user %s: %w", userID, err)
	}
	return user.TenantID, nil
}
