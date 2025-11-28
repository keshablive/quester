// T077: TrustedDeviceRepository - Repository for trusted device management
// Package: server/internal/repositories
// Purpose: Abstracts database operations for TrustedDevice model
//
// Created: Phase 7 refactoring to eliminate database.DB global state

package repositories

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/models"
	"gorm.io/gorm"
)

// TrustedDeviceRepository provides data access for trusted devices
type TrustedDeviceRepository struct {
	db *gorm.DB
}

// NewTrustedDeviceRepository creates a new TrustedDeviceRepository
func NewTrustedDeviceRepository(db *gorm.DB) *TrustedDeviceRepository {
	ValidateDB(db, "TrustedDeviceRepository")
	return &TrustedDeviceRepository{db: db}
}

// FindValidByUserID retrieves all valid (non-expired) trusted devices for a user
func (r *TrustedDeviceRepository) FindValidByUserID(ctx context.Context, userID uuid.UUID) ([]models.TrustedDevice, error) {
	var devices []models.TrustedDevice
	err := r.db.WithContext(ctx).
		Where("user_id = ? AND expires_at > ?", userID, time.Now()).
		Order("created_at DESC").
		Limit(10).
		Find(&devices).Error

	if err != nil {
		return nil, fmt.Errorf("failed to find valid trusted devices for user %s: %w", userID, err)
	}
	return devices, nil
}

// FindByTrustToken retrieves a trusted device by trust token
func (r *TrustedDeviceRepository) FindByTrustToken(ctx context.Context, userID uuid.UUID, trustToken string) (*models.TrustedDevice, error) {
	var device models.TrustedDevice
	err := r.db.WithContext(ctx).
		Where("user_id = ? AND trust_token = ?", userID, trustToken).
		First(&device).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, err
		}
		return nil, fmt.Errorf("failed to find trusted device by token for user %s: %w", userID, err)
	}
	return &device, nil
}

// FindByID retrieves a trusted device by ID and user ID
func (r *TrustedDeviceRepository) FindByID(ctx context.Context, deviceID, userID uuid.UUID) (*models.TrustedDevice, error) {
	var device models.TrustedDevice
	err := r.db.WithContext(ctx).
		Where("id = ? AND user_id = ?", deviceID, userID).
		First(&device).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, err
		}
		return nil, fmt.Errorf("failed to find trusted device %s for user %s: %w", deviceID, userID, err)
	}
	return &device, nil
}

// Create inserts a new trusted device
func (r *TrustedDeviceRepository) Create(ctx context.Context, device *models.TrustedDevice) error {
	err := r.db.WithContext(ctx).Create(device).Error
	if err != nil {
		return fmt.Errorf("failed to create trusted device for user %s: %w", device.UserID, err)
	}
	return nil
}

// Update saves changes to a trusted device
func (r *TrustedDeviceRepository) Update(ctx context.Context, device *models.TrustedDevice) error {
	err := r.db.WithContext(ctx).Save(device).Error
	if err != nil {
		return fmt.Errorf("failed to update trusted device %s: %w", device.ID, err)
	}
	return nil
}

// Delete removes a trusted device
func (r *TrustedDeviceRepository) Delete(ctx context.Context, device *models.TrustedDevice) error {
	err := r.db.WithContext(ctx).Delete(device).Error
	if err != nil {
		return fmt.Errorf("failed to delete trusted device %s: %w", device.ID, err)
	}
	return nil
}

// DeleteByUserID removes all trusted devices for a user
func (r *TrustedDeviceRepository) DeleteByUserID(ctx context.Context, userID uuid.UUID) error {
	err := r.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Delete(&models.TrustedDevice{}).Error

	if err != nil {
		return fmt.Errorf("failed to delete trusted devices for user %s: %w", userID, err)
	}
	return nil
}
