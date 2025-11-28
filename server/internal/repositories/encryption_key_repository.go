// T097: EncryptionKeyRepository - Repository for encryption key management
// Package: server/internal/repositories
// Purpose: Abstracts database operations for EncryptionKey model
//
// Created: Phase 7 refactoring to eliminate database.DB global state

package repositories

import (
	"context"
	"fmt"

	"github.com/keshablive/quester/internal/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// EncryptionKeyRepository provides data access for encryption keys
type EncryptionKeyRepository struct {
	db *gorm.DB
}

// NewEncryptionKeyRepository creates a new EncryptionKeyRepository
func NewEncryptionKeyRepository(db *gorm.DB) *EncryptionKeyRepository {
	ValidateDB(db, "EncryptionKeyRepository")
	return &EncryptionKeyRepository{db: db}
}

// CountByVersion counts encryption keys with the specified version
// Used to validate key version exists (prevents replay attacks)
func (r *EncryptionKeyRepository) CountByVersion(ctx context.Context, version int) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&models.EncryptionKey{}).
		Where("version = ?", version).
		Count(&count).Error

	if err != nil {
		return 0, fmt.Errorf("failed to count keys by version %d: %w", version, err)
	}
	return count, nil
}

// FindActive retrieves the current active encryption key
// Used to get or generate the active DEK for encryption operations
func (r *EncryptionKeyRepository) FindActive(ctx context.Context) (*models.EncryptionKey, error) {
	var encKey models.EncryptionKey
	err := r.db.WithContext(ctx).
		Where("status = ?", models.KeyStatusActive).
		First(&encKey).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, err // Caller handles this case specifically
		}
		return nil, fmt.Errorf("failed to find active encryption key: %w", err)
	}
	return &encKey, nil
}

// GetMaxVersion returns the highest version number of all encryption keys
// Used to determine the next version number when creating a new key
func (r *EncryptionKeyRepository) GetMaxVersion(ctx context.Context) (int, error) {
	var maxVersion int
	err := r.db.WithContext(ctx).
		Model(&models.EncryptionKey{}).
		Select("COALESCE(MAX(version), 0)").
		Scan(&maxVersion).Error

	if err != nil {
		return 0, fmt.Errorf("failed to get max encryption key version: %w", err)
	}
	return maxVersion, nil
}

// Create inserts a new encryption key record
// Used when generating a new DEK
func (r *EncryptionKeyRepository) Create(ctx context.Context, encKey *models.EncryptionKey) error {
	err := r.db.WithContext(ctx).Create(encKey).Error
	if err != nil {
		return fmt.Errorf("failed to create encryption key: %w", err)
	}
	return nil
}

// FindActiveLocking retrieves the active encryption key with a row lock
// Used during key rotation to prevent race conditions
// This is specifically for PostgreSQL's "FOR UPDATE" locking
func (r *EncryptionKeyRepository) FindActiveLocking(ctx context.Context) (*models.EncryptionKey, error) {
	var currentKey models.EncryptionKey
	err := r.db.WithContext(ctx).
		Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("status = ?", models.KeyStatusActive).
		First(&currentKey).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, err // Caller handles this case specifically
		}
		return nil, fmt.Errorf("failed to find active encryption key with lock: %w", err)
	}
	return &currentKey, nil
}

// Update saves changes to an encryption key
// Used when marking keys as rotated or updating status
func (r *EncryptionKeyRepository) Update(ctx context.Context, encKey *models.EncryptionKey) error {
	err := r.db.WithContext(ctx).Save(encKey).Error
	if err != nil {
		return fmt.Errorf("failed to update encryption key %s: %w", encKey.KeyID, err)
	}
	return nil
}
